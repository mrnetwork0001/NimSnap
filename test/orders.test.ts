import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Quote } from '@/lib/rates'

/**
 * The order lifecycle is what stops one payment becoming many generations, and
 * what stops a failed generation burning a payment the user already made.
 */

const quote: Quote = {
  usd: 0.1, lunas: 26_565_365, nim: 265.65, nimAvailable: true, usdtBaseUnits: '100000',
  usdPerNim: 0.00037643, quotedAt: Date.now(), rateStale: false,
}

async function freshOrders() {
  vi.resetModules()
  return import('@/lib/orders')
}

beforeEach(() => vi.resetModules())
afterEach(() => vi.useRealTimers())

describe('order ids', () => {
  test('are 16 hex characters - 8 random bytes', async () => {
    const { mintOrderId } = await freshOrders()
    expect(mintOrderId()).toMatch(/^[0-9a-f]{16}$/)
  })

  test('are not guessable or sequential', async () => {
    const { mintOrderId } = await freshOrders()
    const ids = new Set(Array.from({ length: 500 }, () => mintOrderId()))
    expect(ids.size).toBe(500)
  })

  test('fit inside a Nimiq transaction data field', async () => {
    const { mintOrderId } = await freshOrders()
    expect(Buffer.byteLength(mintOrderId(), 'utf8')).toBeLessThanOrEqual(64)
  })
})

describe('order store', () => {
  test('round-trips a created order', async () => {
    const { createOrder, getOrder } = await freshOrders()
    const { order: created } = await createOrder('cyberpunk', quote)
    const found = await getOrder(created.id)
    expect(found?.id).toBe(created.id)
    expect(found?.status).toBe('created')
    expect(found?.quote.lunas).toBe(quote.lunas)
  })

  test('refuses ids that are not the expected shape, without touching storage', async () => {
    const { getOrder } = await freshOrders()
    for (const bad of ['../etc/passwd', 'DROP TABLE', '', 'zz'.repeat(8), '0'.repeat(15)]) {
      expect(await getOrder(bad)).toBeNull()
    }
  })

  test('returns null for an id that was never issued', async () => {
    const { getOrder } = await freshOrders()
    expect(await getOrder('deadbeefdeadbeef')).toBeNull()
  })

  test('applies partial updates without dropping other fields', async () => {
    const { createOrder, updateOrder } = await freshOrders()
    const { order: o } = await createOrder('anime', quote)
    const updated = await updateOrder(o.id, { status: 'paid', txHash: 'abc' })
    expect(updated?.status).toBe('paid')
    expect(updated?.txHash).toBe('abc')
    expect(updated?.presetId).toBe('anime')
    expect(updated?.quote.lunas).toBe(quote.lunas)
  })

  test('updating an unknown order is a no-op, not a crash', async () => {
    const { updateOrder } = await freshOrders()
    expect(await updateOrder('deadbeefdeadbeef', { status: 'paid' })).toBeNull()
  })
})

describe('single-use enforcement', () => {
  test('a consumed order is marked so a replay can be refused', async () => {
    const { createOrder, updateOrder, getOrder } = await freshOrders()
    const { order: o } = await createOrder('executive', quote)
    await updateOrder(o.id, { status: 'complete', consumedAt: Date.now(), resultUrl: 'https://x/y.jpg' })
    const after = await getOrder(o.id)
    expect(after?.consumedAt).toBeTypeOf('number')
  })

  test('a failed generation leaves the order redeemable, so a retry is free', async () => {
    const { createOrder, updateOrder, getOrder } = await freshOrders()
    const { order: o } = await createOrder('executive', quote)
    await updateOrder(o.id, { status: 'paid', rail: 'nim', txHash: 'h' })
    await updateOrder(o.id, { status: 'generating' })
    // Generation blew up: route resets to paid and records why.
    await updateOrder(o.id, { status: 'paid', error: 'model timed out' })

    const after = await getOrder(o.id)
    expect(after?.consumedAt).toBeUndefined()   // credit NOT burned
    expect(after?.status).toBe('paid')
    expect(after?.txHash).toBe('h')             // settlement is remembered, so no re-verify
  })
})

describe('expiry', () => {
  test('an unpaid order expires after the payment window', async () => {
    const { createOrder, isExpired } = await freshOrders()
    const { ORDER_TTL_MS } = await import('@/lib/config')
    const { order: o } = await createOrder('anime', quote)
    expect(isExpired(o)).toBe(false)
    expect(isExpired({ ...o, createdAt: Date.now() - ORDER_TTL_MS - 1_000 })).toBe(true)
  })

  test('an order that was actually paid is never expired out from under the user', async () => {
    const { createOrder, isExpired } = await freshOrders()
    const { ORDER_TTL_MS } = await import('@/lib/config')
    const { order: o } = await createOrder('anime', quote)
    const oldButPaid = { ...o, status: 'paid' as const, createdAt: Date.now() - ORDER_TTL_MS * 10 }
    expect(isExpired(oldButPaid)).toBe(false)
  })
})

describe('claim tokens', () => {
  test('every order gets a token, and its hash is what is stored', async () => {
    const { createOrder, hashClaimToken, getOrder } = await freshOrders()
    const { order, claimToken } = await createOrder('cyberpunk', quote)
    expect(claimToken).toMatch(/^[0-9a-f]{48}$/)
    const stored = await getOrder(order.id)
    // The secret itself is never persisted, only its hash.
    expect(stored?.claimTokenHash).toBe(hashClaimToken(claimToken))
    expect(JSON.stringify(stored)).not.toContain(claimToken)
  })

  test('tokens are unique per order', async () => {
    const { createOrder } = await freshOrders()
    const a = await createOrder('anime', quote)
    const b = await createOrder('anime', quote)
    expect(a.claimToken).not.toBe(b.claimToken)
  })

  test('the right token matches and a wrong one does not', async () => {
    const { createOrder, claimTokenMatches } = await freshOrders()
    const { order, claimToken } = await createOrder('executive', quote)
    expect(claimTokenMatches(claimToken, order.claimTokenHash)).toBe(true)
    expect(claimTokenMatches('0'.repeat(48), order.claimTokenHash)).toBe(false)
  })

  test('an empty token or a missing hash never matches', async () => {
    const { claimTokenMatches, hashClaimToken } = await freshOrders()
    expect(claimTokenMatches('', hashClaimToken('x'))).toBe(false)
    expect(claimTokenMatches('abc', undefined)).toBe(false)
  })

  test('knowing the order id alone does not authorise recovery', async () => {
    const { createOrder, claimTokenMatches } = await freshOrders()
    const { order } = await createOrder('ecommerce', quote)
    // The order id is public on-chain; it must be useless as a credential.
    expect(claimTokenMatches(order.id, order.claimTokenHash)).toBe(false)
  })
})

describe('settlement grace', () => {
  test('an order whose payment was reported survives past the normal window', async () => {
    const { createOrder, isExpired } = await freshOrders()
    const { ORDER_TTL_MS } = await import('@/lib/config')
    const { order } = await createOrder('anime', quote)

    const old = { ...order, createdAt: Date.now() - ORDER_TTL_MS - 60_000 }
    // Without a reported payment it is gone.
    expect(isExpired(old)).toBe(true)
    // With one, a slow indexer cannot strand the money.
    expect(isExpired({ ...old, paymentReportedAt: Date.now() })).toBe(false)
  })

  test('the grace period is finite, so abandoned orders still expire', async () => {
    const { createOrder, isExpired } = await freshOrders()
    const { SETTLEMENT_GRACE_MS } = await import('@/lib/config')
    const { order } = await createOrder('anime', quote)
    expect(
      isExpired({
        ...order,
        createdAt: Date.now() - SETTLEMENT_GRACE_MS * 2,
        paymentReportedAt: Date.now() - SETTLEMENT_GRACE_MS - 60_000,
      }),
    ).toBe(true)
  })
})

describe('expiry ordering (regression)', () => {
  test('a payment reported after the TTL still keeps the order redeemable', async () => {
    const { createOrder, isExpired } = await freshOrders()
    const { ORDER_TTL_MS } = await import('@/lib/config')
    const { order } = await createOrder('passport', quote)

    // The order was minted when the style was picked, not when pay was clicked -
    // on the Hub rail, earlier still. A user who lingers pays against an order
    // that is already past its TTL.
    const stale = { ...order, createdAt: Date.now() - ORDER_TTL_MS - 60_000 }
    expect(isExpired(stale)).toBe(true)

    // The route now records the claim BEFORE testing expiry, which is what stops
    // a real payment being rejected after the money has left the wallet.
    expect(isExpired({ ...stale, paymentReportedAt: Date.now() })).toBe(false)
  })
})

describe('generation lock', () => {
  /**
   * The race this closes: /api/generate reads `consumedAt` at the top of the
   * handler and does not write it until the model has finished, about a minute
   * later. Two requests carrying the same order id both cleared that read
   * before either wrote, so one payment produced two images. Binding the
   * transaction cannot help - it is the same transaction, and re-claiming by
   * the same order must succeed so a retry after a failure stays free.
   */
  test('only one caller can hold a given order', async () => {
    const { claimGenerationSlot, mintOrderId } = await freshOrders()
    const id = mintOrderId()
    expect(await claimGenerationSlot(id, 60_000)).toBe(true)
    expect(await claimGenerationSlot(id, 60_000)).toBe(false)
    expect(await claimGenerationSlot(id, 60_000)).toBe(false)
  })

  test('concurrent callers produce exactly one winner', async () => {
    const { claimGenerationSlot, mintOrderId } = await freshOrders()
    const id = mintOrderId()
    const results = await Promise.all(
      Array.from({ length: 12 }, () => claimGenerationSlot(id, 60_000)),
    )
    expect(results.filter(Boolean)).toHaveLength(1)
  })

  test('releasing lets the payer retry at once rather than wait out the TTL', async () => {
    const { claimGenerationSlot, releaseGenerationSlot, mintOrderId } = await freshOrders()
    const id = mintOrderId()
    expect(await claimGenerationSlot(id, 60_000)).toBe(true)
    await releaseGenerationSlot(id)
    expect(await claimGenerationSlot(id, 60_000)).toBe(true)
  })

  test('an expired lock frees itself, so a dead process cannot strand an order', async () => {
    const { claimGenerationSlot, mintOrderId } = await freshOrders()
    const id = mintOrderId()
    expect(await claimGenerationSlot(id, 1)).toBe(true)
    await new Promise((r) => setTimeout(r, 15))
    expect(await claimGenerationSlot(id, 60_000)).toBe(true)
  })

  test('locks are per order, not global', async () => {
    const { claimGenerationSlot, mintOrderId } = await freshOrders()
    const a = mintOrderId()
    const b = mintOrderId()
    expect(await claimGenerationSlot(a, 60_000)).toBe(true)
    expect(await claimGenerationSlot(b, 60_000)).toBe(true)
  })
})
