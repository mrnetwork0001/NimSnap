import { NextResponse } from 'next/server'
import { generateImage, GenerationError } from '@/lib/ai'
import { persistResult } from '@/lib/storage'
import {
  claimPaymentTx,
  getOrder,
  mintResultKey,
  isExpired,
  updateOrder,
  type Order,
  type PaymentRail,
} from '@/lib/orders'
import { getPreset } from '@/lib/presets'
import { verifyNimPayment, verifyUsdtPayment } from '@/lib/settlement'
import { clientKey, rateLimit } from '@/lib/ratelimit'
import { BUDGET_RESERVE_MS, DEMO_MODE, FUNCTION_BUDGET_MS, MAX_UPLOAD_BYTES } from '@/lib/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/**
 * Must not exceed what the platform actually permits. Vercel Hobby caps at 60s
 * and silently kills anything longer - which, after a payment, means no JSON
 * response and a user who paid for nothing. Raise alongside FUNCTION_BUDGET_MS
 * only if your plan allows it.
 */
export const maxDuration = 60

/**
 * How long to keep re-checking the chain before giving up. A Nimiq block is
 * roughly a second, but a public indexer needs a moment to catch up, so a single
 * lookup right after the user taps confirm would usually miss a genuine payment.
 */
const SETTLEMENT_WINDOW_MS = 25_000
const SETTLEMENT_INTERVAL_MS = 1_500

async function awaitSettlement(
  order: Order,
  rail: PaymentRail,
  txHash: string | undefined,
  budgetMs: number,
): Promise<{ settled: boolean; txHash?: string; reason?: string }> {
  // Never spend the whole request budget waiting for the chain - the model still
  // has to run afterwards, and being killed mid-generation wastes the payment.
  const deadline = Date.now() + Math.min(SETTLEMENT_WINDOW_MS, budgetMs)
  let last = { settled: false, reason: 'Payment not seen yet' } as {
    settled: boolean
    txHash?: string
    reason?: string
  }

  while (Date.now() < deadline) {
    last =
      rail === 'usdt'
        ? await verifyUsdtPayment(order, txHash ?? '')
        : await verifyNimPayment(order)
    if (last.settled) return last
    // A malformed hash or a reverted transaction will never become valid.
    if (last.reason && /Malformed|reverted|No matching|No .* treasury/i.test(last.reason)) return last
    await new Promise((r) => setTimeout(r, SETTLEMENT_INTERVAL_MS))
  }
  return last
}

function isDataUri(value: unknown): value is string {
  return typeof value === 'string' && /^data:image\/(jpeg|jpg|png|webp);base64,/.test(value)
}

/**
 * Verify payment, then transform the photo.
 *
 * Ordering matters: we confirm the money moved *before* spending anything on the
 * model, and we mark the order consumed only after a result exists - so a failed
 * generation leaves the user's paid order still redeemable rather than burning it.
 */
export async function POST(req: Request) {
  // One deadline for the whole request, so every stage finishes on our terms
  // rather than the platform's.
  const requestDeadline = Date.now() + FUNCTION_BUDGET_MS - BUDGET_RESERVE_MS

  if (!rateLimit(`gen:${clientKey(req)}`, 12, 60_000)) {
    return NextResponse.json({ error: 'Too many generations. Slow down a moment.' }, { status: 429 })
  }

  let body: {
    orderId?: string
    rail?: PaymentRail
    txHash?: string
    image?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request body.' }, { status: 400 })
  }

  const { orderId, rail, txHash, image } = body

  if (!orderId || typeof orderId !== 'string') {
    return NextResponse.json({ error: 'Missing order id.' }, { status: 400 })
  }
  if (!isDataUri(image)) {
    return NextResponse.json({ error: 'Missing or unsupported image upload.' }, { status: 400 })
  }
  // base64 inflates by ~4/3; compare against the decoded size.
  if ((image.length * 3) / 4 > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'That image is too large.' }, { status: 413 })
  }
  if (rail !== 'nim' && rail !== 'hub' && rail !== 'usdt' && rail !== 'demo') {
    return NextResponse.json({ error: 'Unknown payment rail.' }, { status: 400 })
  }
  if (rail === 'demo' && !DEMO_MODE) {
    return NextResponse.json({ error: 'Demo payments are disabled on this deployment.' }, { status: 403 })
  }

  const order = await getOrder(orderId)
  if (!order) return NextResponse.json({ error: 'Unknown order.' }, { status: 404 })
  if (order.consumedAt) {
    return NextResponse.json({ error: 'This order has already been used.' }, { status: 409 })
  }
  if (isExpired(order)) {
    return NextResponse.json({ error: 'This order expired. Start a new shot.' }, { status: 410 })
  }

  // The caller is claiming a payment. Record that before verification runs, so a
  // slow indexer cannot let the order expire underneath a genuine payer while
  // they retry.
  if (rail !== 'demo' && !order.paymentReportedAt) {
    await updateOrder(order.id, { paymentReportedAt: Date.now() })
  }

  const preset = getPreset(order.presetId)
  if (!preset) return NextResponse.json({ error: 'Unknown style preset.' }, { status: 400 })

  // ---- 1. Confirm the payment actually landed. ----------------------------
  let settledTxHash: string | undefined
  if (rail === 'demo') {
    settledTxHash = undefined
  } else if (order.status === 'paid' && order.rail === rail) {
    // Already verified on a previous attempt that failed during generation.
    settledTxHash = order.txHash
  } else {
    // Leave at least 15s for the model, however slow settlement is.
    const settlementBudget = Math.max(3_000, requestDeadline - Date.now() - 15_000)
    const settlement = await awaitSettlement(order, rail, txHash, settlementBudget)
    if (!settlement.settled) {
      console.error(`[nimsnap] settlement failed for ${order.id}: ${settlement.reason}`)
      // settlement.reason is written for an operator ("Nimiq indexer responded
      // 503"), so it is logged rather than shown.
      return NextResponse.json(
        {
          error:
            'We could not confirm your payment yet. If it has left your wallet, reopen NimSnap shortly and it will finish.',
          stage: 'payment',
        },
        { status: 402 },
      )
    }
    settledTxHash = settlement.txHash

    // A USDT receipt proves somebody paid the treasury, not which order it was
    // for, so the transaction is bound to this order here - once. Without this,
    // one transfer could be replayed against unlimited fresh orders. Claiming is
    // idempotent for the same order, so a retry after a failed generation is
    // still free.
    if (rail === 'usdt' && settledTxHash) {
      const claimed = await claimPaymentTx(settledTxHash, order.id)
      if (!claimed) {
        return NextResponse.json(
          {
            error: 'That payment has already been used for another shot.',
            stage: 'payment',
          },
          { status: 409 },
        )
      }
    }
  }

  await updateOrder(order.id, {
    status: 'generating',
    rail,
    txHash: settledTxHash,
  })

  // ---- 2. Spend the paid credit on the model. -----------------------------
  try {
    const modelUrl = await generateImage(
      preset,
      image,
      req.signal,
      // Whatever is left, minus room to persist the result and reply.
      Math.max(5_000, requestDeadline - Date.now() - 8_000),
    )

    // The model's output URL expires within the hour, so copy the image
    // somewhere durable before handing it over - the user paid for a file they
    // can come back to, not a link that rots.
    // Named with a fresh random key rather than the order id: that id is public
    // on-chain, so reusing it would let anyone enumerate customers' photos.
    const resultKey = order.resultKey ?? mintResultKey()
    const stored = await persistResult(modelUrl, resultKey)

    await updateOrder(order.id, {
      status: 'complete',
      resultUrl: stored.url,
      resultKey,
      consumedAt: Date.now(),
    })
    return NextResponse.json({
      resultUrl: stored.url,
      // Lets the client urge an immediate save when the copy did not stick.
      durable: stored.durable,
      orderId: order.id,
      rail,
      txHash: settledTxHash,
      preset: preset.id,
    })
  } catch (err) {
    const known = err instanceof GenerationError
    const message = known ? err.message : 'The transformation failed unexpectedly.'
    // A configuration or billing fault will fail identically on every retry, so
    // saying "try again" would trap a paying user in a loop that cannot succeed.
    const retryable = known ? err.retryable : true
    if (!known) console.error('[nimsnap] unexpected generation failure:', err)

    // Leave the order paid-but-unconsumed so the user can retry without paying
    // twice - true even for terminal errors, so the credit survives for a
    // refund or a later fix.
    await updateOrder(order.id, { status: 'paid', error: message })
    return NextResponse.json(
      {
        error: retryable
          ? message
          : `${message} Your payment is still credited - nothing was lost.`,
        stage: 'generation',
        retryable,
      },
      { status: 502 },
    )
  }
}
