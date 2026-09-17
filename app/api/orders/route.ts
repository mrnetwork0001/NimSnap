import { NextResponse } from 'next/server'
import { createOrder } from '@/lib/orders'
import { isPresetId } from '@/lib/presets'
import { quoteShot } from '@/lib/rates'
import { clientKey, rateLimit } from '@/lib/ratelimit'
import { DEMO_MODE, NIM_TREASURY, USDT_TREASURY } from '@/lib/config'
import { isEngineConfigured } from '@/lib/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Mint an order.
 *
 * The returned id is what the client writes into the payment's data field, and
 * the returned quote is the price we will hold them to. Both are server-issued
 * so neither can be forged client-side.
 */
export async function POST(req: Request) {
  if (!rateLimit(`order:${clientKey(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Too many orders. Slow down a moment.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request body.' }, { status: 400 })
  }

  const presetId = (body as { presetId?: unknown })?.presetId
  if (!isPresetId(presetId)) {
    return NextResponse.json({ error: 'Unknown style preset.' }, { status: 400 })
  }

  if (!DEMO_MODE && !NIM_TREASURY && !USDT_TREASURY) {
    console.error('[nimsnap] no treasury configured and demo mode is off.')
    return NextResponse.json(
      { error: 'Payments are not available right now.' },
      { status: 503 },
    )
  }

  // Refuse to take money for something this deployment cannot deliver. Without
  // this the user pays, then meets a generation failure that no retry can fix.
  if (!isEngineConfigured()) {
    console.error('[nimsnap] refusing to sell a shot: REPLICATE_API_TOKEN is not set.')
    return NextResponse.json(
      { error: 'NimSnap is not able to generate photos right now. Please try again later.' },
      { status: 503 },
    )
  }

  try {
    const quote = await quoteShot()
    const { order, claimToken } = await createOrder(presetId, quote)
    return NextResponse.json({
      orderId: order.id,
      // The client keeps this to recover its own result later. It is never
      // published onchain, unlike the order id.
      claimToken,
      quote,
      treasury: { nim: NIM_TREASURY || null, usdt: USDT_TREASURY || null },
      demoMode: DEMO_MODE,
    })
  } catch (err) {
    console.error('[nimsnap] order creation failed:', err)
    return NextResponse.json({ error: 'Could not start the order. Try again.' }, { status: 503 })
  }
}
