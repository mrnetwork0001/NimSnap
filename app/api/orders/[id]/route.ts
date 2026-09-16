import { NextResponse } from 'next/server'
import { claimTokenMatches, getOrder } from '@/lib/orders'
import { clientKey, rateLimit } from '@/lib/ratelimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Recover an order the client already paid for.
 *
 * This is what stops a reload, a killed webview, or a dropped response from
 * costing somebody their ten cents. The studio stores its order id and claim
 * token locally the moment a payment succeeds, and asks here on next load.
 *
 * Authorisation is the claim token, never the order id: that id is deliberately
 * planted in public transaction data so settlement can be verified, so anyone
 * watching the treasury could otherwise pull a stranger's finished photo.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!rateLimit(`recover:${clientKey(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
  }

  const token = new URL(req.url).searchParams.get('token') ?? ''
  const order = await getOrder(params.id)

  // Same response for "no such order" and "wrong token", so this cannot be used
  // to test whether an order id is real.
  if (!order || !claimTokenMatches(token, order.claimTokenHash)) {
    return NextResponse.json({ error: 'Unknown order.' }, { status: 404 })
  }

  return NextResponse.json({
    orderId: order.id,
    status: order.status,
    presetId: order.presetId,
    rail: order.rail ?? null,
    txHash: order.txHash ?? null,
    // Present only once a generation actually finished.
    resultUrl: order.resultUrl ?? null,
    consumed: Boolean(order.consumedAt),
    quote: order.quote,
  })
}
