import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Quote } from '@/lib/rates'

/**
 * The order lifecycle is what stops one payment becoming many generations, and
 * what stops a failed generation burning a payment the user already made.
 */

const quote: Quote = {
  usd: 0.1, lunas: 26_565_365, nim: 265.65, usdtBaseUnits: '100000',
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
    const created = await createOrder('cyberpunk', quote)
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
    const o = await createOrder('anime', quote)
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
    const o = await createOrder('executive', quote)
    await updateOrder(o.id, { status: 'complete', consumedAt: Date.now(), resultUrl: 'https://x/y.jpg' })
    const after = await getOrder(o.id)
    expect(after?.consumedAt).toBeTypeOf('number')
  })

  test('a failed generation leaves the order redeemable, so a retry is free', async () => {
    const { createOrder, updateOrder, getOrder } = await freshOrders()
    const o = await createOrder('executive', quote)
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
    const o = await createOrder('anime', quote)
    expect(isExpired(o)).toBe(false)
    expect(isExpired({ ...o, createdAt: Date.now() - ORDER_TTL_MS - 1_000 })).toBe(true)
  })

  test('an order that was actually paid is never expired out from under the user', async () => {
    const { createOrder, isExpired } = await freshOrders()
    const { ORDER_TTL_MS } = await import('@/lib/config')
    const o = await createOrder('anime', quote)
    const oldButPaid = { ...o, status: 'paid' as const, createdAt: Date.now() - ORDER_TTL_MS * 10 }
    expect(isExpired(oldButPaid)).toBe(false)
  })
})
