'use client'

import type { PresetId } from '../presets'
import type { Rail } from './pay'

/**
 * A paid-but-unredeemed shot, kept on the device.
 *
 * Previously this lived only in a React ref, so a reload, a backgrounded
 * webview, or a dropped response silently forfeited the user's money with no way
 * to get it back. Persisting it is what makes a payment survive the app dying.
 *
 * The claim token is the part that matters: the order id is published on-chain
 * so settlement can be verified, so it is not a secret and cannot authorise
 * recovery on its own.
 */

const KEY = 'nimsnap.credit.v1'

/** Long enough that a user who closes the app and comes back tomorrow is fine. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export interface PaidCredit {
  orderId: string
  claimToken: string
  /** The style actually paid for. The server generates this, not whatever is selected now. */
  presetId: PresetId
  rail: Rail
  txHash?: string
  savedAt: number
}

/**
 * Storage can throw outright, not just return null - Safari private mode and
 * "block all cookies" both do it - so every access is guarded. Losing the credit
 * is bad; crashing the studio over it is worse.
 */
export function saveCredit(credit: Omit<PaidCredit, 'savedAt'>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...credit, savedAt: Date.now() }))
  } catch {
    /* no persistence available; the in-memory path still works for this session */
  }
}

export function loadCredit(): PaidCredit | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PaidCredit
    if (!parsed?.orderId || !parsed?.claimToken || !parsed?.presetId) return null
    if (Date.now() - (parsed.savedAt ?? 0) > MAX_AGE_MS) {
      clearCredit()
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearCredit(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nothing to clear */
  }
}

export interface RecoveredOrder {
  status: 'created' | 'paid' | 'generating' | 'complete' | 'failed'
  presetId: PresetId
  resultUrl: string | null
  consumed: boolean
  rail: string | null
  txHash: string | null
}

/**
 * Ask the server what became of a stored credit.
 *
 * Returns null when the order is gone or the token does not match, which is the
 * signal to drop the local copy rather than keep offering a dead credit.
 */
export async function recoverOrder(credit: PaidCredit): Promise<RecoveredOrder | null> {
  try {
    const res = await fetch(
      `/api/orders/${encodeURIComponent(credit.orderId)}?token=${encodeURIComponent(credit.claimToken)}`,
      { cache: 'no-store' },
    )
    if (!res.ok) return null
    return (await res.json()) as RecoveredOrder
  } catch {
    // Offline: keep the credit, try again next load.
    return null
  }
}
