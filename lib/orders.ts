import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { ORDER_TTL_MS, SETTLEMENT_GRACE_MS } from './config'
import type { Quote } from './rates'
import type { PresetId } from './presets'

/**
 * Order store.
 *
 * An order is the unit that ties a payment to a generation. The server mints the
 * id, the client writes that id into the on-chain transaction's data field, and
 * verification looks for exactly that id. Because the id is server-minted and
 * burned on first use, a client cannot replay one payment into two generations.
 *
 * Storage is pluggable. In-memory is the default and is correct for a single
 * long-lived server (`next start`, a container, a VM). On a serverless platform
 * where each request may hit a fresh instance, set UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN and orders persist across instances instead.
 */

export type OrderStatus = 'created' | 'paid' | 'generating' | 'complete' | 'failed'
export type PaymentRail = 'nim' | 'usdt' | 'demo'

export interface Order {
  id: string
  presetId: PresetId
  status: OrderStatus
  quote: Quote
  createdAt: number
  /** Rail the payment actually settled on. */
  rail?: PaymentRail
  /** On-chain reference: Nimiq tx hash, or Polygon tx hash for USDT. */
  txHash?: string
  /** Set once the generation is delivered, so the order cannot be reused. */
  consumedAt?: number
  resultUrl?: string
  /**
   * Unguessable name for the stored image.
   *
   * Deliberately NOT the order id: that id is planted in the public transaction
   * data so settlement can be verified, which means anyone reading the treasury's
   * transaction list can harvest it. Naming files after it would let a stranger
   * enumerate customers' photos.
   */
  resultKey?: string
  /**
   * SHA-256 of the claim token handed to the paying client.
   *
   * Recovery cannot be authorised by the order id alone: that id is published
   * on-chain so settlement can be verified, so anyone watching the treasury
   * could otherwise fetch a stranger's finished photo. The token never leaves
   * the client that paid.
   */
  claimTokenHash?: string
  /**
   * When the client first came back claiming to have paid.
   *
   * An order sits at 'created' until settlement is confirmed, so a slow indexer
   * used to let a genuine payment age past the 15-minute window and expire -
   * money taken, 410 forever. This is untrusted (anyone can claim), but it only
   * ever extends an order's life, never grants anything, so the worst an abuser
   * achieves is keeping their own unpaid order alive.
   */
  paymentReportedAt?: number
  error?: string
}

interface Store {
  get(id: string): Promise<Order | null>
  set(order: Order): Promise<void>
  /**
   * Atomically bind an on-chain transaction to an order.
   *
   * Returns true if this order now owns the transaction, false if a DIFFERENT
   * order already claimed it. Re-claiming with the same order id must succeed,
   * so a retry after a failed generation is not mistaken for a replay.
   */
  claimTx(txHash: string, orderId: string): Promise<boolean>
}

/** Serverless-safe store, used when Upstash credentials are present. */
class RedisStore implements Store {
  constructor(
    private url: string,
    private token: string,
  ) {}

  private async cmd<T>(...args: (string | number)[]): Promise<T> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(args),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Order store error ${res.status}`)
    const json = (await res.json()) as { result: T }
    return json.result
  }

  async get(id: string): Promise<Order | null> {
    const raw = await this.cmd<string | null>('GET', `nimsnap:order:${id}`)
    return raw ? (JSON.parse(raw) as Order) : null
  }

  async set(order: Order): Promise<void> {
    // Expire well after the payment window so completed orders stay auditable
    // for a while, but abandoned ones do not accumulate forever.
    const ttlSeconds = Math.ceil((ORDER_TTL_MS * 4) / 1000)
    await this.cmd('SET', `nimsnap:order:${order.id}`, JSON.stringify(order), 'EX', ttlSeconds)
  }

  async claimTx(txHash: string, orderId: string): Promise<boolean> {
    const key = `nimsnap:tx:${txHash.toLowerCase()}`
    // SET NX is the atomic primitive: it succeeds only if nobody holds the key,
    // which settles the race between two concurrent requests replaying one hash.
    const won = await this.cmd<string | null>('SET', key, orderId, 'NX')
    if (won) return true
    // Already held. Ours only if the holder is this same order.
    const holder = await this.cmd<string | null>('GET', key)
    return holder === orderId
  }
}

/** Default store. Survives for the lifetime of the server process. */
class MemoryStore implements Store {
  private map = new Map<string, Order>()
  /** Transaction hashes already spent, so one payment cannot fund many orders. */
  private claimedTx = new Map<string, { orderId: string; at: number }>()

  async get(id: string): Promise<Order | null> {
    this.sweep()
    return this.map.get(id) ?? null
  }

  async set(order: Order): Promise<void> {
    this.map.set(order.id, order)
  }

  async claimTx(txHash: string, orderId: string): Promise<boolean> {
    const key = txHash.toLowerCase()
    const holder = this.claimedTx.get(key)
    if (holder === undefined) {
      this.claimedTx.set(key, { orderId, at: Date.now() })
      return true
    }
    return holder.orderId === orderId
  }

  private sweep(): void {
    const cutoff = Date.now() - ORDER_TTL_MS * 4
    for (const [id, order] of this.map) {
      if (order.createdAt < cutoff) this.map.delete(id)
    }
    // Spent hashes are swept on a much longer horizon than orders: a hash that
    // is forgotten too early becomes replayable again.
    const txCutoff = Date.now() - ORDER_TTL_MS * 96
    for (const [hash, claim] of this.claimedTx) {
      if (claim.at < txCutoff) this.claimedTx.delete(hash)
    }
  }
}

function makeStore(): Store {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? new RedisStore(url, token) : new MemoryStore()
}

// Reuse across hot reloads in dev so orders are not lost on every file save.
const globalForStore = globalThis as unknown as { __nimsnapStore?: Store }
const store: Store = globalForStore.__nimsnapStore ?? makeStore()
if (process.env.NODE_ENV !== 'production') globalForStore.__nimsnapStore = store

/**
 * Mint an order id. 8 random bytes rendered as hex - compact enough to sit in a
 * Nimiq transaction's 64-byte data field, and unguessable so an attacker cannot
 * fish for someone else's paid order.
 */
export function mintOrderId(): string {
  return randomBytes(8).toString('hex')
}

/**
 * Mint the storage name for a finished image. 16 random bytes, never derived
 * from anything public, so a stored result cannot be found without being given
 * its URL.
 */
export function mintResultKey(): string {
  return randomBytes(16).toString('hex')
}

/** Secret handed to the paying client, so only they can recover the result. */
export function mintClaimToken(): string {
  return randomBytes(24).toString('hex')
}

export function hashClaimToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Constant-time comparison, so a token cannot be guessed a byte at a time. */
export function claimTokenMatches(token: string, expectedHash: string | undefined): boolean {
  if (!expectedHash || !token) return false
  const a = Buffer.from(hashClaimToken(token), 'hex')
  const b = Buffer.from(expectedHash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function createOrder(
  presetId: PresetId,
  quote: Quote,
): Promise<{ order: Order; claimToken: string }> {
  const claimToken = mintClaimToken()
  const order: Order = {
    id: mintOrderId(),
    presetId,
    status: 'created',
    quote,
    createdAt: Date.now(),
    claimTokenHash: hashClaimToken(claimToken),
  }
  await store.set(order)
  return { order, claimToken }
}

export async function getOrder(id: string): Promise<Order | null> {
  if (!/^[0-9a-f]{16}$/.test(id)) return null
  return store.get(id)
}

export async function updateOrder(id: string, patch: Partial<Order>): Promise<Order | null> {
  const current = await store.get(id)
  if (!current) return null
  const next = { ...current, ...patch }
  await store.set(next)
  return next
}

/**
 * Bind an on-chain transaction to this order, once and for all.
 *
 * ERC-20 transfers carry no memo, so a USDT receipt proves only that *someone*
 * paid the treasury - not which order it was for. Without this, one $0.10
 * transfer could be replayed against unlimited fresh orders, each costing us a
 * paid generation. The NIM rail needs no such guard: its order id is planted
 * inside the transaction, so a given transfer can only ever match one order.
 *
 * Returns false when a different order already spent this transaction.
 */
export async function claimPaymentTx(txHash: string, orderId: string): Promise<boolean> {
  if (!txHash) return false
  return store.claimTx(txHash, orderId)
}

export function isExpired(order: Order): boolean {
  if (order.status !== 'created') return false
  // Once payment has been reported, the order stays redeemable far longer, so a
  // slow chain or indexer cannot strand somebody's money.
  if (order.paymentReportedAt) {
    return Date.now() - order.paymentReportedAt > SETTLEMENT_GRACE_MS
  }
  return Date.now() - order.createdAt > ORDER_TTL_MS
}
