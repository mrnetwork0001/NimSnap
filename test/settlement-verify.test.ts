import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * End-to-end verification behaviour with the chain stubbed.
 *
 * These are the checks that stand between a paying user and a free generation.
 * Each one asserts that a payment which is wrong in exactly one way is refused,
 * so a regression that loosens any single condition fails loudly here.
 */

const TREASURY_NIM = 'NQ07 1111 2222 3333 4444 5555 6666 7777 8888'
const TREASURY_USDT = '0x1111111111111111111111111111111111111111'
const USDT_CONTRACT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

vi.mock('@/lib/config', async (orig) => ({
  ...(await orig<typeof import('@/lib/config')>()),
  NIM_TREASURY: TREASURY_NIM,
  USDT_TREASURY: TREASURY_USDT,
  NIMIQ_RPC_URL: '',
  NIMIQ_WATCH_API: 'https://indexer.test/api/v1',
  POLYGON_RPC_URLS: ['https://polygon.test'],
  USDT_POLYGON_ADDRESS: USDT_CONTRACT,
}))

const { verifyNimPayment, verifyUsdtPayment } = await import('@/lib/settlement')

const ORDER_ID = '01fe35b992010ea5'
const LUNAS = 26_565_365

const order = (over: Record<string, unknown> = {}) =>
  ({
    id: ORDER_ID,
    presetId: 'cyberpunk',
    status: 'created',
    createdAt: Date.now(),
    quote: { usd: 0.1, lunas: LUNAS, nim: 265.65, nimAvailable: true, usdtBaseUnits: '100000', usdPerNim: 0.00037, quotedAt: Date.now(), rateStale: false },
    ...over,
  }) as never

const nimTx = (over: Record<string, unknown> = {}) => ({
  hash: 'a'.repeat(64),
  sender_address: 'NQ99 AAAA',
  receiver_address: TREASURY_NIM,
  value: LUNAS,
  data: ORDER_ID,
  timestamp: Date.now(),
  confirmations: 3,
  ...over,
})

const stubJson = (body: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body, text: async () => '' })

beforeEach(() => vi.stubGlobal('fetch', stubJson([])))
afterEach(() => vi.unstubAllGlobals())

describe('verifyNimPayment', () => {
  test('accepts a correct payment and returns its hash', async () => {
    vi.stubGlobal('fetch', stubJson([nimTx()]))
    const r = await verifyNimPayment(order())
    expect(r.settled).toBe(true)
    expect(r.txHash).toBe('a'.repeat(64))
  })

  test('accepts despite differing address spacing', async () => {
    vi.stubGlobal('fetch', stubJson([nimTx({ receiver_address: TREASURY_NIM.replace(/\s/g, '') })]))
    expect((await verifyNimPayment(order())).settled).toBe(true)
  })

  test('rejects a payment to a different address', async () => {
    vi.stubGlobal('fetch', stubJson([nimTx({ receiver_address: 'NQ07 9999 9999' })]))
    expect((await verifyNimPayment(order())).settled).toBe(false)
  })

  test('rejects a payment carrying someone else\'s order id', async () => {
    vi.stubGlobal('fetch', stubJson([nimTx({ data: 'ffffffffffffffff' })]))
    expect((await verifyNimPayment(order())).settled).toBe(false)
  })

  test('rejects a payment with no memo at all', async () => {
    vi.stubGlobal('fetch', stubJson([nimTx({ data: '' })]))
    expect((await verifyNimPayment(order())).settled).toBe(false)
  })

  test('rejects an underpayment beyond tolerance', async () => {
    vi.stubGlobal('fetch', stubJson([nimTx({ value: Math.floor(LUNAS * 0.8) })]))
    expect((await verifyNimPayment(order())).settled).toBe(false)
  })

  test('accepts a small shortfall inside the 5% rate-drift tolerance', async () => {
    vi.stubGlobal('fetch', stubJson([nimTx({ value: Math.floor(LUNAS * 0.97) })]))
    expect((await verifyNimPayment(order())).settled).toBe(true)
  })

  test('accepts an overpayment', async () => {
    vi.stubGlobal('fetch', stubJson([nimTx({ value: LUNAS * 2 })]))
    expect((await verifyNimPayment(order())).settled).toBe(true)
  })

  test('finds the right payment among unrelated treasury traffic', async () => {
    vi.stubGlobal('fetch', stubJson([
      nimTx({ data: 'aaaaaaaaaaaaaaaa', hash: 'b'.repeat(64) }),
      nimTx({ value: 1, data: '' , hash: 'c'.repeat(64) }),
      nimTx({ hash: 'd'.repeat(64) }),
    ]))
    const r = await verifyNimPayment(order())
    expect(r.settled).toBe(true)
    expect(r.txHash).toBe('d'.repeat(64))
  })

  test('reports a reachability failure instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const r = await verifyNimPayment(order())
    expect(r.settled).toBe(false)
    expect(r.reason).toMatch(/network down/i)
  })

  test('treats an indexer error status as unsettled, not settled', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}), text: async () => '' }))
    expect((await verifyNimPayment(order())).settled).toBe(false)
  })
})

const receipt = (over: Record<string, unknown> = {}) => ({
  status: '0x1',
  logs: [
    {
      address: USDT_CONTRACT,
      topics: [
        TRANSFER_TOPIC,
        '0x' + '0'.repeat(24) + '9'.repeat(40),
        '0x' + '0'.repeat(24) + TREASURY_USDT.slice(2),
      ],
      data: '0x' + (100_000).toString(16).padStart(64, '0'),
    },
  ],
  ...over,
})

const HASH = '0x' + 'a'.repeat(64)
const rpc = (result: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ result }), text: async () => '' })

describe('verifyUsdtPayment', () => {
  test('accepts a correct USDT transfer', async () => {
    vi.stubGlobal('fetch', rpc(receipt()))
    expect((await verifyUsdtPayment(order(), HASH)).settled).toBe(true)
  })

  test('rejects a malformed hash without calling the chain', async () => {
    const f = rpc(receipt())
    vi.stubGlobal('fetch', f)
    const r = await verifyUsdtPayment(order(), 'not-a-hash')
    expect(r.settled).toBe(false)
    expect(f).not.toHaveBeenCalled()
  })

  test('rejects a reverted transaction', async () => {
    vi.stubGlobal('fetch', rpc(receipt({ status: '0x0' })))
    const r = await verifyUsdtPayment(order(), HASH)
    expect(r.settled).toBe(false)
    expect(r.reason).toMatch(/revert/i)
  })

  test('rejects a transfer of a counterfeit token contract', async () => {
    const bad = receipt()
    bad.logs[0].address = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
    vi.stubGlobal('fetch', rpc(bad))
    expect((await verifyUsdtPayment(order(), HASH)).settled).toBe(false)
  })

  test('rejects a transfer to somebody else', async () => {
    const bad = receipt()
    bad.logs[0].topics[2] = '0x' + '0'.repeat(24) + '7'.repeat(40)
    vi.stubGlobal('fetch', rpc(bad))
    expect((await verifyUsdtPayment(order(), HASH)).settled).toBe(false)
  })

  test('rejects an underpayment', async () => {
    const bad = receipt()
    bad.logs[0].data = '0x' + (1_000).toString(16).padStart(64, '0')
    vi.stubGlobal('fetch', rpc(bad))
    expect((await verifyUsdtPayment(order(), HASH)).settled).toBe(false)
  })

  test('rejects a receipt with no Transfer log', async () => {
    vi.stubGlobal('fetch', rpc(receipt({ logs: [] })))
    expect((await verifyUsdtPayment(order(), HASH)).settled).toBe(false)
  })

  test('treats an unmined transaction as pending, not settled', async () => {
    vi.stubGlobal('fetch', rpc(null))
    const r = await verifyUsdtPayment(order(), HASH)
    expect(r.settled).toBe(false)
    expect(r.reason).toMatch(/not mined/i)
  })
})
