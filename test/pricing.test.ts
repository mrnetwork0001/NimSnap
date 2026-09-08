import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { LUNAS_PER_NIM } from '@/lib/config'

/**
 * Pricing is denominated in dollars but settled in Lunas, so every quote passes
 * through a live rate. These pin down the properties that protect revenue: a
 * quote never asks for less than the dollar price, and a dead price feed cannot
 * take checkout down.
 *
 * The rate cache is module-global — correct for production, where a rate-limited
 * feed must not be hit per request — so each test loads a fresh copy of the
 * module rather than inheriting a primed cache from the test before it.
 */

const feed = (usd: number) =>
  vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ 'nimiq-2': { usd } }) })

async function freshRates() {
  vi.resetModules()
  return import('@/lib/rates')
}

beforeEach(() => vi.resetModules())
afterEach(() => vi.unstubAllGlobals())

describe('quoteShot', () => {
  test('converts the dollar price into Lunas at the live rate', async () => {
    vi.stubGlobal('fetch', feed(0.001))
    const { quoteShot } = await freshRates()
    const q = await quoteShot(0.1)
    // $0.10 at $0.001/NIM = 100 NIM = 10,000,000 Lunas
    expect(q.lunas).toBe(100 * LUNAS_PER_NIM)
    expect(q.nim).toBeCloseTo(100, 6)
  })

  test('rounds up so truncation can never under-charge', async () => {
    vi.stubGlobal('fetch', feed(0.00037643))
    const { quoteShot } = await freshRates()
    const q = await quoteShot(0.1)
    const exact = (0.1 / 0.00037643) * LUNAS_PER_NIM
    expect(q.lunas).toBe(Math.ceil(exact))
    expect(q.lunas).toBeGreaterThanOrEqual(exact)
    expect(Number.isInteger(q.lunas)).toBe(true)
  })

  test('quotes USDT in 6-decimal base units', async () => {
    vi.stubGlobal('fetch', feed(0.001))
    const { quoteShot } = await freshRates()
    expect((await quoteShot(0.1)).usdtBaseUnits).toBe('100000')
    expect((await quoteShot(1)).usdtBaseUnits).toBe('1000000')
  })

  test('a cheaper NIM means proportionally more NIM per shot', async () => {
    vi.stubGlobal('fetch', feed(0.001))
    const dear = await (await freshRates()).quoteShot(0.1)

    vi.stubGlobal('fetch', feed(0.0005))
    const cheap = await (await freshRates()).quoteShot(0.1)

    expect(cheap.lunas).toBeGreaterThan(dear.lunas)
    expect(cheap.lunas).toBe(dear.lunas * 2)
  })

  test('serves a cached rate rather than hammering the feed', async () => {
    const f = feed(0.001)
    vi.stubGlobal('fetch', f)
    const { quoteShot } = await freshRates()
    await quoteShot(0.1)
    await quoteShot(0.1)
    await quoteShot(0.1)
    expect(f).toHaveBeenCalledTimes(1)
  })

  test('falls back to the last good rate when the feed dies, and flags it stale', async () => {
    vi.stubGlobal('fetch', feed(0.001))
    const { quoteShot } = await freshRates()
    const good = await quoteShot(0.1)
    expect(good.rateStale).toBe(false)

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('feed down')))
    vi.useFakeTimers()
    vi.advanceTimersByTime(120_000) // push the cache past its freshness window
    const stale = await quoteShot(0.1)
    vi.useRealTimers()

    expect(stale.rateStale).toBe(true)
    expect(stale.lunas).toBe(good.lunas)
  })

  test('refuses to quote from a nonsense rate when there is no cache to fall back on', async () => {
    vi.stubGlobal('fetch', feed(0))
    const { quoteShot } = await freshRates()
    await expect(quoteShot(0.1)).rejects.toThrow(/rate/i)
  })

  test('refuses to quote when the feed is unreachable and nothing is cached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const { quoteShot } = await freshRates()
    await expect(quoteShot(0.1)).rejects.toThrow()
  })
})
