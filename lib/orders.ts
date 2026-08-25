import { randomBytes } from 'crypto'
import { ORDER_TTL_MS } from './config'
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
  error?: string
}

interface Store {
  get(id: string): Promise<Order | null>
  set(order: Order): Promise<void>
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
}

/** Default store. Survives for the lifetime of the server process. */
class MemoryStore implements Store {
  private map = new Map<string, Order>()

  async get(id: string): Promise<Order | null> {
    this.sweep()
    return this.map.get(id) ?? null
  }

  async set(order: Order): Promise<void> {
    this.map.set(order.id, order)
  }

  private sweep(): void {
    const cutoff = Date.now() - ORDER_TTL_MS * 4
    for (const [id, order] of this.map) {
      if (order.createdAt < cutoff) this.map.delete(id)
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
 * Mint an order id. 8 random bytes rendered as hex — compact enough to sit in a
 * Nimiq transaction's 64-byte data field, and unguessable so an attacker cannot
 * fish for someone else's paid order.
 */
export function mintOrderId(): string {
  return randomBytes(8).toString('hex')
}

export async function createOrder(presetId: PresetId, quote: Quote): Promise<Order> {
  const order: Order = {
    id: mintOrderId(),
    presetId,
    status: 'created',
    quote,
    createdAt: Date.now(),
  }
  await store.set(order)
  return order
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

export function isExpired(order: Order): boolean {
  return order.status === 'created' && Date.now() - order.createdAt > ORDER_TTL_MS
}
