import { NextResponse } from 'next/server'
import { quoteShot } from '@/lib/rates'
import { clientKey, rateLimit } from '@/lib/ratelimit'
import { DEMO_MODE, NIM_TREASURY, USDT_TREASURY } from '@/lib/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Live price of one shot, plus the treasury addresses the client should pay. */
export async function GET(req: Request) {
  if (!rateLimit(`quote:${clientKey(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
  }
  try {
    const quote = await quoteShot()
    return NextResponse.json({
      quote,
      treasury: { nim: NIM_TREASURY || null, usdt: USDT_TREASURY || null },
      demoMode: DEMO_MODE,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not price a shot right now.' },
      { status: 503 },
    )
  }
}
