/**
 * Central runtime configuration. Everything payment-critical is read from the
 * environment so the treasury address is never hard-coded into the bundle.
 */

/** Price of a single generation, in US dollars. The "Pay-Per-Shot" unit. */
export const SHOT_PRICE_USD = 0.1

/** 1 NIM = 1e5 Lunas. The Nimiq provider takes `value` in Lunas. */
export const LUNAS_PER_NIM = 1e5

/** USDT on Polygon uses 6 decimals. */
export const USDT_DECIMALS = 6

/** Polygon mainnet, as an EIP-155 hex chain id for window.ethereum. */
export const POLYGON_CHAIN_ID = '0x89'

/** Canonical USDT (PoS) contract on Polygon mainnet. */
export const USDT_POLYGON_ADDRESS = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'

/**
 * Treasury addresses that receive shot payments.
 * NEXT_PUBLIC_ is required: the client builds the transaction, so it must know
 * the recipient. The server independently re-reads these when verifying, so a
 * tampered client cannot redirect a payment and still unlock a generation.
 */
export const NIM_TREASURY = process.env.NEXT_PUBLIC_NIM_TREASURY_ADDRESS ?? ''
export const USDT_TREASURY = process.env.NEXT_PUBLIC_USDT_TREASURY_ADDRESS ?? ''

/** Public Nimiq Albatross JSON-RPC endpoint used for server-side settlement checks. */
export const NIMIQ_WATCH_API = process.env.NIMIQ_WATCH_API ?? 'https://api.nimiq.watch/api/v1'

/** Optional self-hosted Albatross JSON-RPC node. Preferred over the public indexer when set. */
export const NIMIQ_RPC_URL = process.env.NIMIQ_RPC_URL ?? ''

/**
 * Polygon JSON-RPC endpoints used for server-side USDT receipt checks. Tried in
 * order; free public nodes rate-limit and occasionally go dark, so we keep a
 * spare rather than let one flaky host block a paid generation.
 */
export const POLYGON_RPC_URLS = (
  process.env.POLYGON_RPC_URL ?? 'https://polygon-bor-rpc.publicnode.com,https://polygon.drpc.org'
)
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean)

/**
 * Nimiq Hub endpoint - Nimiq's own hosted checkout, used by browsers with no
 * injected provider. Override only to point at the testnet Hub.
 */
export const HUB_ENDPOINT = process.env.NEXT_PUBLIC_HUB_ENDPOINT ?? 'https://hub.nimiq.com'

/**
 * Demo mode lets the app run end-to-end outside the Nimiq Pay host (a plain
 * desktop browser, a competition judge's laptop, CI) without moving real funds.
 * It is OFF unless explicitly enabled, and the UI always says when it is on.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

/** How long an unpaid order stays claimable before it is swept. */
export const ORDER_TTL_MS = 15 * 60 * 1000

/**
 * How long an order stays redeemable once the payer says they have paid.
 *
 * Settlement can lag: a public indexer catches up in seconds normally, but an
 * outage can take far longer, and the user has already parted with their money
 * by then. A day of grace costs nothing and means a slow chain never strands a
 * real payment.
 */
export const SETTLEMENT_GRACE_MS = 24 * 60 * 60 * 1000

/**
 * How long the platform will let a single request run, in milliseconds.
 *
 * This is a property of where you deploy, not of the app. Vercel's Hobby plan
 * kills a function at 60s and Pro at 300s; a container has no limit worth
 * worrying about. The default is the Hobby ceiling because being killed
 * mid-generation after the user has paid is the worst outcome, and overshooting
 * it produces no JSON at all - the client just sees a parse error.
 *
 * Raise it if your platform allows more (Vercel Pro: 300000).
 */
export const FUNCTION_BUDGET_MS = Number(process.env.FUNCTION_BUDGET_MS ?? 60_000)

/**
 * Headroom left for reading the request, writing the order, and serialising the
 * response, so we always finish on our own terms rather than being cut off.
 */
export const BUDGET_RESERVE_MS = 6_000

/** Max upload we accept, pre-compression. Mobile cameras routinely emit 8-12MB. */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024

export function assertPaymentConfig(): void {
  if (DEMO_MODE) return
  if (!NIM_TREASURY && !USDT_TREASURY) {
    throw new Error(
      'No treasury configured. Set NEXT_PUBLIC_NIM_TREASURY_ADDRESS and/or ' +
        'NEXT_PUBLIC_USDT_TREASURY_ADDRESS, or set NEXT_PUBLIC_DEMO_MODE=true for a dry run.',
    )
  }
}
