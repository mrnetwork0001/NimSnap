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
 * Demo mode lets the app run end-to-end outside the Nimiq Pay host (a plain
 * desktop browser, a competition judge's laptop, CI) without moving real funds.
 * It is OFF unless explicitly enabled, and the UI always says when it is on.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

/** How long an unpaid order stays claimable before it is swept. */
export const ORDER_TTL_MS = 15 * 60 * 1000

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
