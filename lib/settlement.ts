import {
  NIM_TREASURY,
  NIMIQ_RPC_URL,
  NIMIQ_WATCH_API,
  POLYGON_RPC_URLS,
  USDT_POLYGON_ADDRESS,
  USDT_TREASURY,
} from './config'
import { PRICE_TOLERANCE } from './rates'
import type { Order } from './orders'

/**
 * Settlement verification.
 *
 * This is the trust boundary. The client tells us "I paid" — we never believe
 * it. We independently read the chain and confirm that a transaction exists
 * which (a) landed in *our* treasury, (b) carries *this* order's id, and
 * (c) moved at least the quoted amount. Only then does generation unlock.
 */

export interface SettlementResult {
  settled: boolean
  txHash?: string
  /** Why verification failed, for the client to display. */
  reason?: string
}

/* ------------------------------------------------------------------ NIM ---- */

/** Nimiq addresses are user-facing with spaces; comparisons must ignore them. */
function normalizeNimAddress(addr: string): string {
  return addr.replace(/\s+/g, '').toUpperCase()
}

/**
 * The data field's encoding is not guaranteed across indexers — some return the
 * raw bytes hex-encoded, some return decoded UTF-8. The order id is itself hex,
 * so we accept either representation rather than reject a genuine payment over
 * a transport detail.
 */
function dataCarriesOrderId(data: string | null | undefined, orderId: string): boolean {
  if (!data) return false
  const haystack = data.toLowerCase()
  if (haystack.includes(orderId)) return true
  // Indexer returned hex bytes; decode and look again.
  if (/^[0-9a-f]+$/.test(haystack) && haystack.length % 2 === 0) {
    try {
      const decoded = Buffer.from(haystack, 'hex').toString('utf8').toLowerCase()
      if (decoded.includes(orderId)) return true
    } catch {
      /* not valid hex bytes — fall through */
    }
  }
  return false
}

interface WatchTx {
  hash: string
  sender_address: string
  receiver_address: string
  value: number
  data: string | null
  timestamp: number
  confirmations: number
}

/** Read recent treasury transactions from the public Nimiq.Watch indexer. */
async function fetchNimTxsFromIndexer(address: string): Promise<WatchTx[]> {
  const url = `${NIMIQ_WATCH_API}/account-transactions/${encodeURIComponent(address)}/50`
  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
  })
  if (!res.ok) throw new Error(`Nimiq indexer responded ${res.status}`)
  return (await res.json()) as WatchTx[]
}

/** Read recent treasury transactions from a self-hosted Albatross JSON-RPC node. */
async function fetchNimTxsFromRpc(address: string): Promise<WatchTx[]> {
  const res = await fetch(NIMIQ_RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTransactionsByAddress',
      params: [address, 50],
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
  })
  if (!res.ok) throw new Error(`Nimiq RPC responded ${res.status}`)
  const json = (await res.json()) as {
    result?: { data?: unknown[] } | unknown[]
    error?: { message?: string }
  }
  if (json.error) throw new Error(json.error.message ?? 'Nimiq RPC error')
  const raw = (Array.isArray(json.result) ? json.result : json.result?.data) ?? []
  // Map the node's TransactionInfo shape onto the indexer shape we compare against.
  return (raw as Record<string, unknown>[]).map((t) => ({
    hash: String(t.hash ?? ''),
    sender_address: String(t.from ?? ''),
    receiver_address: String(t.to ?? ''),
    value: Number(t.value ?? 0),
    data: (t.recipientData ?? t.data ?? '') as string,
    timestamp: Number(t.timestamp ?? 0),
    confirmations: Number(t.confirmations ?? 0),
  }))
}

/**
 * Confirm a NIM payment for `order` has landed on chain.
 *
 * Matching is by order id in the transaction's data field rather than by
 * transaction hash: the provider returns a *serialized transaction*, not a
 * hash, so the id we planted is the reliable join key — and it makes the check
 * naturally idempotent.
 */
export async function verifyNimPayment(order: Order): Promise<SettlementResult> {
  if (!NIM_TREASURY) return { settled: false, reason: 'No NIM treasury configured' }

  let txs: WatchTx[]
  try {
    txs = NIMIQ_RPC_URL
      ? await fetchNimTxsFromRpc(NIM_TREASURY)
      : await fetchNimTxsFromIndexer(NIM_TREASURY)
  } catch (err) {
    return {
      settled: false,
      reason: err instanceof Error ? err.message : 'Could not reach the Nimiq network',
    }
  }

  const treasury = normalizeNimAddress(NIM_TREASURY)
  // Accept a small shortfall so a rate tick between quote and confirm does not
  // reject a user who paid exactly what the wallet showed them.
  const minValue = Math.floor(order.quote.lunas * (1 - PRICE_TOLERANCE))

  const match = txs.find(
    (tx) =>
      normalizeNimAddress(tx.receiver_address) === treasury &&
      tx.value >= minValue &&
      dataCarriesOrderId(tx.data, order.id),
  )

  if (!match) return { settled: false, reason: 'Payment not visible on chain yet' }
  return { settled: true, txHash: match.hash }
}

/* ----------------------------------------------------------------- USDT ---- */

/** keccak256("Transfer(address,address,uint256)") */
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

async function polygonRpc<T>(method: string, params: unknown[]): Promise<T> {
  let lastError: unknown
  for (const url of POLYGON_RPC_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000),
      })
      if (!res.ok) throw new Error(`Polygon RPC responded ${res.status}`)
      const json = (await res.json()) as { result?: T; error?: { message?: string } }
      if (json.error) throw new Error(json.error.message ?? 'Polygon RPC error')
      return json.result as T
    } catch (err) {
      lastError = err
    }
  }
  throw lastError instanceof Error ? lastError : new Error('All Polygon RPC endpoints failed')
}

/** A 32-byte log topic holds an address right-aligned; take the low 20 bytes. */
function topicToAddress(topic: string): string {
  return `0x${topic.slice(-40)}`.toLowerCase()
}

interface Receipt {
  status: string
  logs: { address: string; topics: string[]; data: string }[]
}

/**
 * Confirm a USDT-on-Polygon payment for `order`.
 *
 * ERC-20 transfers carry no memo, so unlike the NIM path we cannot plant the
 * order id in the transaction itself. Instead the client reports the hash and
 * we verify the receipt: it must have succeeded, and it must contain a Transfer
 * log emitted by the real USDT contract, into our treasury, for at least the
 * quoted amount. The order id binding comes from the order record, and single-use
 * enforcement comes from `consumedAt`.
 */
export async function verifyUsdtPayment(order: Order, txHash: string): Promise<SettlementResult> {
  if (!USDT_TREASURY) return { settled: false, reason: 'No USDT treasury configured' }
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return { settled: false, reason: 'Malformed transaction hash' }
  }

  let receipt: Receipt | null
  try {
    receipt = await polygonRpc<Receipt | null>('eth_getTransactionReceipt', [txHash])
  } catch (err) {
    return {
      settled: false,
      reason: err instanceof Error ? err.message : 'Could not reach Polygon',
    }
  }

  if (!receipt) return { settled: false, reason: 'Transaction not mined yet' }
  if (receipt.status !== '0x1') return { settled: false, reason: 'Transaction reverted on chain' }

  const treasury = USDT_TREASURY.toLowerCase()
  const token = USDT_POLYGON_ADDRESS.toLowerCase()
  const expected = BigInt(order.quote.usdtBaseUnits)
  const minValue = (expected * BigInt(Math.round((1 - PRICE_TOLERANCE) * 1000))) / 1000n

  const transferred = receipt.logs.some((log) => {
    if (log.address.toLowerCase() !== token) return false
    if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC) return false
    if (topicToAddress(log.topics[2] ?? '') !== treasury) return false
    try {
      return BigInt(log.data) >= minValue
    } catch {
      return false
    }
  })

  if (!transferred) {
    return { settled: false, reason: 'No matching USDT transfer to the treasury in this transaction' }
  }
  return { settled: true, txHash }
}
