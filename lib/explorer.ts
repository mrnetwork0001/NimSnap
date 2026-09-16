import type { PaymentRail } from './orders'

/**
 * Public block explorer links for a settled payment.
 *
 * Showing the transaction is not decoration: the whole trust story is that the
 * server verified this payment on chain before generating anything, and a link
 * lets the user confirm that claim themselves rather than take our word for it.
 */

const NIMIQ_EXPLORER = process.env.NEXT_PUBLIC_NIMIQ_EXPLORER ?? 'https://nimiq.watch'
const POLYGON_EXPLORER = process.env.NEXT_PUBLIC_POLYGON_EXPLORER ?? 'https://polygonscan.com'

export function explorerUrl(rail: PaymentRail | string | undefined, txHash: string): string | null {
  if (!txHash) return null
  // USDT settles on Polygon; everything else is a Nimiq transaction, whether it
  // came from the injected provider or Nimiq's hosted checkout.
  if (rail === 'usdt') return `${POLYGON_EXPLORER}/tx/${txHash}`
  if (rail === 'demo') return null
  return `${NIMIQ_EXPLORER}/#${txHash}`
}

/**
 * What the user is told they paid in.
 *
 * 'hub' is a NIM payment that happened to be approved through Nimiq's hosted
 * checkout, so naming the plumbing would only confuse - they paid NIM.
 */
export function railLabel(rail: PaymentRail | string | undefined): string {
  if (rail === 'usdt') return 'USDT'
  if (rail === 'demo') return 'demo mode'
  return 'NIM'
}

/** Middle-truncated hash, long enough to be recognisable on the explorer page. */
export function shortHash(txHash: string): string {
  return txHash.length <= 20 ? txHash : `${txHash.slice(0, 10)}…${txHash.slice(-6)}`
}
