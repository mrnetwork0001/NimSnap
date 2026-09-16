'use client'

import { DEMO_MODE } from '@/lib/config'
import type { Rail } from '@/lib/client/pay'

interface Props {
  rails: Rail[]
  /** Whether there is actually a showcase below to point at. */
  hasExamples?: boolean
}

/**
 * Explains the payment context when it is not the happy path.
 *
 * Renders nothing when the app is running inside Nimiq Pay with a real rail
 * available - that is the intended experience and needs no explanation.
 */
export default function HostBanner({ rails, hasExamples = false }: Props) {
  const hasRealRail = rails.some((r) => r !== 'demo')

  // Paying through Nimiq's hosted checkout works, but it is worth saying so:
  // a browser with no injected wallet used to be a dead end here.
  if (rails.includes('hub') && !DEMO_MODE) {
    return (
      <div className="card-sm flex items-start gap-3 px-4 py-3">
        <span className="chip h-8 w-8">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
            <rect x="3" y="6" width="18" height="12" rx="3" />
            <path d="M3 10h18" />
          </svg>
        </span>
        <p className="text-xs leading-relaxed text-ink-muted">
          <span className="font-bold text-ink">Pay with your Nimiq Wallet.</span> Tapping
          Generate opens Nimiq&rsquo;s secure checkout, so you can pay from
          wallet.nimiq.com without installing anything.
        </p>
      </div>
    )
  }

  if (hasRealRail && !DEMO_MODE) return null

  if (!hasRealRail && !DEMO_MODE) {
    return (
      <div className="card-sm flex items-start gap-3 px-4 py-3">
        <span className="chip h-8 w-8">
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <rect x="6" y="2.5" width="12" height="19" rx="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <path d="M10.5 18.5h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </span>
        <p className="text-xs leading-relaxed text-ink-muted">
          <span className="font-bold text-ink">Open NimSnap in Nimiq Pay</span> to pay per
          shot. A normal browser has no wallet to settle the payment
          {/* Only promise a showcase when one is actually rendered below. */}
          {hasExamples ? ', but you can still see what it makes below.' : '.'}
        </p>
      </div>
    )
  }

  return (
    <div className="card-sm flex items-start gap-3 border-amber-200/80 bg-amber-50/80 px-4 py-3">
      <span className="chip h-8 w-8 text-amber-600">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path d="M10 3h4M12 3v6l4.5 8a2 2 0 01-1.7 3H9.2a2 2 0 01-1.7-3L12 9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
      </span>
      <p className="text-xs leading-relaxed text-amber-900">
        <span className="font-bold">Demo mode.</span> Generations run for free and no funds
        move. {hasRealRail && 'Switch the payment method below to settle for real.'}
      </p>
    </div>
  )
}
