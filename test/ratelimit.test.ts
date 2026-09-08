import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * The order and generate endpoints are unauthenticated by design — there is no
 * signup — so this limiter is the only thing between the app and someone
 * hammering the price feed or the paid model endpoint.
 */

async function freshLimiter() {
  vi.resetModules()
  return import('@/lib/ratelimit')
}

beforeEach(() => vi.resetModules())
afterEach(() => vi.useRealTimers())

describe('rateLimit', () => {
  test('allows up to the limit then refuses', async () => {
    const { rateLimit } = await freshLimiter()
    for (let i = 0; i < 5; i++) expect(rateLimit('k', 5, 60_000)).toBe(true)
    expect(rateLimit('k', 5, 60_000)).toBe(false)
  })

  test('keys are independent, so one abuser cannot lock everyone out', async () => {
    const { rateLimit } = await freshLimiter()
    for (let i = 0; i < 5; i++) rateLimit('abuser', 5, 60_000)
    expect(rateLimit('abuser', 5, 60_000)).toBe(false)
    expect(rateLimit('someone-else', 5, 60_000)).toBe(true)
  })

  test('the window reopens once it elapses', async () => {
    vi.useFakeTimers()
    const { rateLimit } = await freshLimiter()
    for (let i = 0; i < 3; i++) rateLimit('k', 3, 1_000)
    expect(rateLimit('k', 3, 1_000)).toBe(false)
    vi.advanceTimersByTime(1_500)
    expect(rateLimit('k', 3, 1_000)).toBe(true)
  })
})

describe('clientKey', () => {
  test('prefers the first hop of x-forwarded-for behind a proxy', async () => {
    const { clientKey } = await freshLimiter()
    const req = new Request('https://x.test', {
      headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1, 10.0.0.2' },
    })
    expect(clientKey(req)).toBe('203.0.113.9')
  })

  test('falls back to x-real-ip', async () => {
    const { clientKey } = await freshLimiter()
    expect(clientKey(new Request('https://x.test', { headers: { 'x-real-ip': '198.51.100.4' } })))
      .toBe('198.51.100.4')
  })

  test('degrades to a constant rather than throwing when nothing identifies the caller', async () => {
    const { clientKey } = await freshLimiter()
    expect(clientKey(new Request('https://x.test'))).toBe('unknown')
  })

  test('two different clients do not collide', async () => {
    const { clientKey } = await freshLimiter()
    const a = clientKey(new Request('https://x.test', { headers: { 'x-forwarded-for': '1.1.1.1' } }))
    const b = clientKey(new Request('https://x.test', { headers: { 'x-forwarded-for': '2.2.2.2' } }))
    expect(a).not.toBe(b)
  })
})
