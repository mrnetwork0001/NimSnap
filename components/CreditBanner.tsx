'use client'

import { getPreset } from '@/lib/presets'
import type { PaidCredit } from '@/lib/client/credit'

interface Props {
  credit: PaidCredit
  /** True once a photo is loaded, so the shot can actually be finished. */
  canResume: boolean
  onDiscard: () => void
}

/**
 * Tells someone their money is still there.
 *
 * Shown when the studio finds a paid shot that was never delivered - the app was
 * reloaded, the webview was reclaimed, or a response was lost. Before this
 * existed the payment simply disappeared and the user had no way to know whether
 * they had been charged.
 */
export default function CreditBanner({ credit, canResume, onDiscard }: Props) {
  const preset = getPreset(credit.presetId)

  return (
    <div className="card-sm border-brand-200 bg-brand-50/80 px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="chip h-8 w-8">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.8125rem] font-bold text-ink">You have a paid shot waiting</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            {preset ? `Your ${preset.name} ` : 'Your shot '}
            was paid for but never delivered.{' '}
            {canResume
              ? 'Tap Generate to finish it - you will not be charged again.'
              : 'Add a photo and tap Generate to finish it, at no extra cost.'}
          </p>
          <button
            type="button"
            onClick={onDiscard}
            className="mt-2 text-[0.6875rem] font-semibold text-ink-soft underline underline-offset-2 transition hover:text-ink-muted"
          >
            Discard this credit
          </button>
        </div>
      </div>
    </div>
  )
}
