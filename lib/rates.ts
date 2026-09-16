import { LUNAS_PER_NIM, SHOT_PRICE_USD, USDT_DECIMALS } from './config'

/**
 * NIM/USD rate service.
 *
 * The shot price is denominated in dollars ($0.10), but the Nimiq provider is
 * paid in Lunas - so we need a live rate. CoinGecko is the source the Nimiq
 * Wallet itself uses. We cache aggressively because the quote only has to be
 * accurate to the cent, and a rate-limited price feed must never be able to
 * take the whole checkout down.
 */

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=nimiq-2&vs_currencies=usd'

/** Refresh at most this often. */
const CACHE_TTL_MS = 60_000

/**
 * How long a quote handed to a client stays honourable. Verification accepts a
 * payment priced at any rate quoted within this window, so a user who takes a
 * minute to confirm in Nimiq Pay is not rejected over a price tick.
 */
export const QUOTE_TTL_MS = 10 * 60 * 1000

/**
 * Tolerance applied when verifying an on-chain amount against the quote.
 * Absorbs rounding in the wallet and any drift inside the quote window.
 */
export const PRICE_TOLERANCE = 0.05

interface CachedRate {
  usdPerNim: number
  fetchedAt: number
}

let cache: CachedRate | null = null
let inflight: Promise<CachedRate> | null = null

async function fetchRate(): Promise<CachedRate> {
  const res = await fetch(COINGECKO_URL, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(6_000),
  })
  if (!res.ok) throw new Error(`Price feed responded ${res.status}`)
  const json = (await res.json()) as { 'nimiq-2'?: { usd?: number } }
  const usdPerNim = json['nimiq-2']?.usd
  if (typeof usdPerNim !== 'number' || !(usdPerNim > 0)) {
    throw new Error('Price feed returned no usable NIM/USD rate')
  }
  return { usdPerNim, fetchedAt: Date.now() }
}

/**
 * Current NIM/USD rate. Serves from cache when fresh, coalesces concurrent
 * refreshes, and falls back to the last known good rate if the feed fails -
 * a stale rate is far better than a checkout that cannot quote a price.
 */
export async function getNimUsdRate(): Promise<{ usdPerNim: number; stale: boolean }> {
  const now = Date.now()
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { usdPerNim: cache.usdPerNim, stale: false }
  }
  if (!inflight) {
    inflight = fetchRate()
      .then((fresh) => {
        cache = fresh
        return fresh
      })
      .finally(() => {
        inflight = null
      })
  }
  try {
    const fresh = await inflight
    return { usdPerNim: fresh.usdPerNim, stale: false }
  } catch (err) {
    if (cache) return { usdPerNim: cache.usdPerNim, stale: true }
    throw err
  }
}

export interface Quote {
  usd: number
  /**
   * Amount to pass to sendBasicTransactionWithData, in Lunas (integer).
   * Zero when the price feed is unreachable and nothing is cached - the NIM
   * rail is unavailable in that state, but USDT is unaffected.
   */
  lunas: number
  /** Same amount expressed in whole NIM, for display. */
  nim: number
  /** False when no rate could be obtained, so the NIM rail must be hidden. */
  nimAvailable: boolean
  /** USDT base units (6 decimals), as a decimal string for BigInt-safe transport. */
  usdtBaseUnits: string
  usdPerNim: number
  quotedAt: number
  rateStale: boolean
}

/**
 * Build a price quote for one shot.
 *
 * USDT is priced arithmetically - a dollar is a dollar - so it must never depend
 * on the NIM price feed. Previously a CoinGecko hiccup on a cold cache threw and
 * took the whole checkout down, including for a rail that never needed the rate.
 * Now a missing rate only disables the NIM rail.
 */
export async function quoteShot(usd: number = SHOT_PRICE_USD): Promise<Quote> {
  const usdtBaseUnits = BigInt(Math.ceil(usd * 10 ** USDT_DECIMALS)).toString()

  let usdPerNim = 0
  let stale = false
  let nimAvailable = true
  try {
    const rate = await getNimUsdRate()
    usdPerNim = rate.usdPerNim
    stale = rate.stale
  } catch {
    // No live rate and nothing cached. USDT still works; NIM cannot be quoted.
    nimAvailable = false
  }

  // Round up: never under-charge because of truncation.
  const lunas = nimAvailable ? Math.ceil((usd / usdPerNim) * LUNAS_PER_NIM) : 0

  return {
    usd,
    lunas,
    nim: lunas / LUNAS_PER_NIM,
    nimAvailable,
    usdtBaseUnits,
    usdPerNim,
    quotedAt: Date.now(),
    rateStale: stale,
  }
}
