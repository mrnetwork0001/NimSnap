'use client'

import { init, type NimiqProvider } from '@nimiq/mini-app-sdk'
import {
  HUB_ENDPOINT,
  NIM_TREASURY,
  POLYGON_CHAIN_ID,
  USDT_POLYGON_ADDRESS,
  USDT_TREASURY,
  DEMO_MODE,
} from '../config'
import type { Quote } from '../rates'

/**
 * Client-side payment rails.
 *
 * NIM goes through the Nimiq provider that Nimiq Pay injects as `window.nimiq`;
 * the host renders its own native confirmation sheet, so there is no checkout UI
 * for us to build - we hand it a transaction and await the user's decision.
 *
 * USDT goes through `window.ethereum`, which Nimiq Pay also exposes, as a plain
 * ERC-20 transfer on Polygon.
 */

export type Rail = 'nim' | 'hub' | 'usdt' | 'demo'

export interface PayResult {
  rail: Rail
  /** Polygon tx hash. Absent for NIM: the provider returns a serialized transaction. */
  txHash?: string
  /** Raw provider return value, kept for diagnostics. */
  raw?: unknown
}

export class PaymentError extends Error {
  constructor(
    message: string,
    readonly cancelled = false,
  ) {
    super(message)
    this.name = 'PaymentError'
  }
}

/**
 * Resolved Nimiq provider, or null when we are not inside Nimiq Pay.
 *
 * `init()` polls for the host injection and rejects on timeout. We keep the
 * resolved provider so the checkout path never has to wait for detection twice,
 * and we use a short timeout here because this only drives which buttons to show
 * - a plain browser should fall through to "not available" quickly, not hang.
 */
let providerPromise: Promise<NimiqProvider | null> | null = null

export function getNimiqProvider(timeout = 1_500): Promise<NimiqProvider | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.nimiq) return Promise.resolve(window.nimiq)
  if (!providerPromise) {
    providerPromise = init({ timeout }).catch(() => null)
  }
  return providerPromise
}

/** True when the page is running inside the Nimiq Pay host webview. */
export function hasNimiqHost(): boolean {
  return typeof window !== 'undefined' && !!window.nimiq
}

export function hasEthereumHost(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as { ethereum?: unknown }).ethereum
}

/** The SDK's error shape is a plain object, not a thrown Error. Normalise both. */
function asError(value: unknown, fallback: string): PaymentError {
  if (value && typeof value === 'object' && 'error' in value) {
    const inner = (value as { error?: { message?: string; type?: string } }).error
    const message = inner?.message ?? fallback
    return new PaymentError(message, /reject|denie|cancel/i.test(message))
  }
  if (value instanceof Error) {
    return new PaymentError(value.message, /reject|denie|cancel|4001/i.test(value.message))
  }
  return new PaymentError(fallback)
}

/** An ErrorResponse from the provider rather than a success value. */
function isErrorResponse(value: unknown): boolean {
  return !!value && typeof value === 'object' && 'error' in value
}

/**
 * Pay in NIM.
 *
 * The order id rides along in the transaction's data field. That is what makes
 * server-side verification possible: the provider returns a serialized
 * transaction rather than a hash, so an on-chain memo is the only reliable way
 * to tie this payment back to this order.
 */
export async function payWithNim(orderId: string, quote: Quote): Promise<PayResult> {
  const provider = await getNimiqProvider()
  if (!provider) {
    throw new PaymentError('Open NimSnap inside Nimiq Pay to pay with NIM.')
  }
  if (!quote.nimAvailable || quote.lunas <= 0) {
    throw new PaymentError(
      'The NIM price is unavailable right now. Try USDT, or try again shortly.',
    )
  }
  if (!NIM_TREASURY) {
    throw new PaymentError('This deployment has no NIM treasury configured.')
  }

  let result: unknown
  try {
    result = await provider.sendBasicTransactionWithData({
      recipient: NIM_TREASURY,
      value: quote.lunas,
      data: orderId,
    })
  } catch (err) {
    throw asError(err, 'Nimiq Pay could not complete the payment.')
  }
  if (isErrorResponse(result)) throw asError(result, 'Payment was not completed.')

  return { rail: 'nim', raw: result }
}

/* ------------------------------------------------------- Nimiq Hub rail ---- */

/**
 * Pay from a Nimiq Wallet (wallet.nimiq.com) via the Nimiq Hub.
 *
 * This is the rail for people in an ordinary browser, who have no injected
 * provider because Nimiq Pay is a phone app. The Hub is Nimiq's own hosted
 * checkout: it opens in a popup, the user approves with their existing wallet,
 * and it hands back a signed transaction.
 *
 * `extraData` carries the order id exactly as the Mini App rail's `data` field
 * does, so settlement verification is identical and the server needs no special
 * case - a Hub payment and a Nimiq Pay payment are indistinguishable on chain.
 *
 * IMPORTANT: this opens a popup, so it must be called while the browser still
 * considers a user gesture active. Awaiting anything first (minting the order,
 * for instance) spends that activation and the popup is blocked. The caller is
 * responsible for having the order id already in hand.
 */
export async function payWithHub(orderId: string, quote: Quote): Promise<PayResult> {
  if (!NIM_TREASURY) {
    throw new PaymentError('This deployment has no NIM treasury configured.')
  }
  if (!quote.nimAvailable || quote.lunas <= 0) {
    throw new PaymentError('The NIM price is unavailable right now. Try again shortly.')
  }

  // Loaded on demand: the Hub bundle is substantial and most visitors, who
  // arrive inside Nimiq Pay, never need it.
  const { default: HubApi } = await import('@nimiq/hub-api')
  const hub = new HubApi(HUB_ENDPOINT)

  try {
    const signed = await hub.checkout({
      appName: 'NimSnap',
      recipient: NIM_TREASURY,
      value: quote.lunas,
      // Encoded explicitly rather than passed as a string, so there is no
      // ambiguity about whether the Hub treats it as text or as hex.
      extraData: new TextEncoder().encode(orderId),
    })

    const hash = (signed as { hash?: string })?.hash
    return { rail: 'hub', txHash: hash, raw: signed }
  } catch (err) {
    throw asError(err, 'The payment was not completed.')
  }
}

/* ------------------------------------------------------------ USDT rail ---- */

/** ERC-20 `transfer(address,uint256)` selector. */
const TRANSFER_SELECTOR = '0xa9059cbb'

function encodeTransfer(to: string, amountBaseUnits: string): string {
  const addr = to.replace(/^0x/, '').toLowerCase().padStart(64, '0')
  const amount = BigInt(amountBaseUnits).toString(16).padStart(64, '0')
  return `${TRANSFER_SELECTOR}${addr}${amount}`
}

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>
}

function getEthereum(): Eip1193Provider {
  const eth = (window as unknown as { ethereum?: Eip1193Provider }).ethereum
  if (!eth) throw new PaymentError('No Ethereum provider available for USDT payments.')
  return eth
}

/** Make sure the wallet is on Polygon before we ask it to move USDT. */
async function ensurePolygon(eth: Eip1193Provider): Promise<void> {
  const chainId = (await eth.request({ method: 'eth_chainId' })) as string
  if (chainId?.toLowerCase() === POLYGON_CHAIN_ID) return
  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: POLYGON_CHAIN_ID }],
    })
  } catch (err) {
    throw asError(err, 'Switch to the Polygon network to pay with USDT.')
  }
}

export async function payWithUsdt(quote: Quote): Promise<PayResult> {
  if (!USDT_TREASURY) {
    throw new PaymentError('This deployment has no USDT treasury configured.')
  }
  const eth = getEthereum()

  let accounts: string[]
  try {
    accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[]
  } catch (err) {
    throw asError(err, 'Wallet connection was declined.')
  }
  const from = accounts?.[0]
  if (!from) throw new PaymentError('No wallet account is available.')

  await ensurePolygon(eth)

  let txHash: string
  try {
    txHash = (await eth.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from,
          to: USDT_POLYGON_ADDRESS,
          data: encodeTransfer(USDT_TREASURY, quote.usdtBaseUnits),
          value: '0x0',
        },
      ],
    })) as string
  } catch (err) {
    throw asError(err, 'The USDT payment was not completed.')
  }

  return { rail: 'usdt', txHash }
}

/**
 * Which rails this device can actually use right now. Drives the checkout UI so
 * we never offer a payment method that is guaranteed to fail.
 *
 * Async because provider injection is not guaranteed to have happened by the
 * time React mounts - waiting briefly avoids flashing "open me in Nimiq Pay" at
 * a user who is already inside Nimiq Pay.
 */
export async function availableRails(): Promise<Rail[]> {
  const rails: Rail[] = []
  const provider = await getNimiqProvider()

  if (provider && NIM_TREASURY) {
    // Inside Nimiq Pay the injected provider is the better experience: no
    // popup, no second wallet to unlock.
    rails.push('nim')
  } else if (NIM_TREASURY) {
    // An ordinary browser has no injected provider, but the Hub lets anyone
    // with a Nimiq Wallet pay anyway. Without this the web is a dead end.
    rails.push('hub')
  }

  if (hasEthereumHost() && USDT_TREASURY) rails.push('usdt')
  if (DEMO_MODE) rails.push('demo')
  return rails
}
