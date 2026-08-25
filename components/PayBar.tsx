'use client'

import type { Quote } from '@/lib/rates'
import type { Rail } from '@/lib/client/pay'

interface Props {
  quote: Quote | null
  rails: Rail[]
  rail: Rail | null
  onRailChange: (rail: Rail) => void
  onPay: () => void
  ready: boolean
  busy: boolean
  hint: string | null
}

const RAIL_LABEL: Record<Rail, string> = {
  nim: 'NIM',
  usdt: 'USDT',
  demo: 'Demo',
}

function formatNim(nim: number): string {
  if (nim >= 1000) return `${Math.round(nim).toLocaleString()} NIM`
  return `${nim.toFixed(nim < 10 ? 2 : 1)} NIM`
}

/**
 * Sticky checkout bar.
 *
 * Anchored to the bottom of the viewport inside the safe area so the primary
 * action is always under the user's thumb — they never have to scroll to pay.
 * The rail selector only appears when the device genuinely supports more than
 * one, so the common case stays a single tap.
 */
export default function PayBar({
  quote,
  rails,
  rail,
  onRailChange,
  onPay,
  ready,
  busy,
  hint,
}: Props) {
  const priceLabel = quote
    ? rail === 'usdt'
      ? `$${quote.usd.toFixed(2)} USDT`
      : rail === 'demo'
        ? 'Free (demo)'
        : `$${quote.usd.toFixed(2)}`
    : '…'

  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-900/80 px-4 pt-3 backdrop-blur-2xl">
      <div className="mx-auto w-full max-w-md space-y-2.5">
        {rails.length > 1 && (
          <div
            role="radiogroup"
            aria-label="Payment method"
            className="flex gap-1.5 rounded-full border border-white/10 bg-white/5 p-1"
          >
            {rails.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={rail === r}
                disabled={busy}
                onClick={() => onRailChange(r)}
                className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                  rail === r ? 'bg-white/15 text-white' : 'text-slate-400'
                }`}
              >
                {RAIL_LABEL[r]}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onPay}
          disabled={!ready || busy}
          className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-neon-cyan via-nimiq-blue to-neon-magenta px-5 py-4 text-base font-extrabold text-ink-900 shadow-neon transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {/* Shimmer sweep to signal the button is live and waiting. */}
          {ready && !busy && (
            <span
              aria-hidden="true"
              className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/35 to-transparent"
            />
          )}
          <span className="relative">
            {busy ? 'Opening Nimiq Pay…' : `Generate for ${priceLabel}`}
          </span>
        </button>

        <p className="text-center text-[0.6875rem] leading-relaxed text-slate-500">
          {hint ??
            (quote && rail !== 'demo' && rail !== 'usdt'
              ? `≈ ${formatNim(quote.nim)} · settles instantly · no subscription`
              : 'Pay per shot · no subscription · no account')}
        </p>
      </div>
    </div>
  )
}
