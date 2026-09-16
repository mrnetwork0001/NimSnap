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

// 'hub' is still a NIM payment - it just arrives via Nimiq's hosted checkout
// rather than an injected provider - so the user sees the currency, not the
// plumbing.
const RAIL_LABEL: Record<Rail, string> = { nim: 'NIM', hub: 'NIM', usdt: 'USDT', demo: 'Demo' }

function formatNim(nim: number): string {
  if (nim >= 1000) return `${Math.round(nim).toLocaleString()} NIM`
  return `${nim.toFixed(nim < 10 ? 2 : 1)} NIM`
}

/**
 * Sticky checkout bar.
 *
 * Anchored to the bottom of the viewport inside the safe area so the primary
 * action is always under the user's thumb. The rail selector only appears when
 * the device genuinely supports more than one.
 */
export default function PayBar({ quote, rails, rail, onRailChange, onPay, ready, busy, hint }: Props) {
  // Until rail detection resolves we do not know what the user will be charged,
  // so the button stays neutral rather than flashing a price it may replace.
  const priceLabel = !quote
    ? '…'
    : rail === 'usdt'
      ? `$${quote.usd.toFixed(2)} USDT`
      : rail === 'demo'
        ? 'Free (demo)'
        : rail === 'nim' || rail === 'hub'
          ? `$${quote.usd.toFixed(2)}`
          : null

  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-white/70 bg-haze-400/80 px-2.5 pt-3 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-md space-y-2.5 lg:max-w-lg">
        {rails.length > 1 && (
          <div role="radiogroup" aria-label="Payment method" className="flex gap-1 rounded-full border border-white bg-white/70 p-1 shadow-ghost">
            {rails.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={rail === r}
                disabled={busy}
                onClick={() => onRailChange(r)}
                className={`flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                  rail === r ? 'bg-brand-gradient text-white shadow-brand' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {RAIL_LABEL[r]}
              </button>
            ))}
          </div>
        )}

        <button type="button" onClick={onPay} disabled={!ready || busy} className="btn-primary relative w-full overflow-hidden py-4 text-base">
          {ready && !busy && (
            <span aria-hidden="true" className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          )}
          <span className="relative">
            {busy ? 'Opening Nimiq Pay…' : priceLabel ? `Generate for ${priceLabel}` : 'Generate'}
          </span>
        </button>

        <p className="text-center text-[0.6875rem] leading-relaxed text-ink-soft">
          {hint ??
            (quote && (rail === 'nim' || rail === 'hub')
              ? `≈ ${formatNim(quote.nim)} · settles instantly · no subscription`
              : 'Pay per shot · no subscription · no account')}
        </p>
      </div>
    </div>
  )
}
