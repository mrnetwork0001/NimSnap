import { NextResponse } from 'next/server'
import { createOrder } from '@/lib/orders'
import { isPresetId } from '@/lib/presets'
import { quoteShot } from '@/lib/rates'
import { clientKey, rateLimit } from '@/lib/ratelimit'
import { DEMO_MODE, NIM_TREASURY, USDT_TREASURY } from '@/lib/config'

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
    return NextResponse.json(
      { error: 'This deployment has no treasury configured and demo mode is off.' },
      { status: 503 },
    )
  }

  try {
    const quote = await quoteShot()
    const order = await createOrder(presetId, quote)
    return NextResponse.json({
      orderId: order.id,
      quote,
      treasury: { nim: NIM_TREASURY || null, usdt: USDT_TREASURY || null },
      demoMode: DEMO_MODE,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not create the order.' },
      { status: 503 },
    )
  }
}
