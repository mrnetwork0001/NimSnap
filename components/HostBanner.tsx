'use client'

import { DEMO_MODE } from '@/lib/config'
import type { Rail } from '@/lib/client/pay'

interface Props {
  rails: Rail[]
}

/**
 * Explains the payment context when it is not the happy path.
 *
 * Renders nothing when the app is running inside Nimiq Pay with a real rail
 * available — that is the intended experience and needs no explanation. It only
 * speaks up when the user is in a plain browser (where NIM payment is
 * impossible) or when the deployment is running on demo credits.
 */
export default function HostBanner({ rails }: Props) {
  const hasRealRail = rails.some((r) => r !== 'demo')

  if (hasRealRail && !DEMO_MODE) return null

  if (!hasRealRail && !DEMO_MODE) {
    return (
      <div className="glass-sm flex items-start gap-3 px-4 py-3">
        <span aria-hidden="true" className="text-lg leading-none">📲</span>
        <p className="text-xs leading-relaxed text-slate-300">
          <span className="font-semibold text-white">Open NimSnap in Nimiq Pay</span> to pay
          per shot. In a normal browser there is no wallet to settle the payment.
        </p>
      </div>
    )
  }

  return (
    <div className="glass-sm flex items-start gap-3 border-nimiq-gold/30 bg-nimiq-gold/[0.07] px-4 py-3">
      <span aria-hidden="true" className="text-lg leading-none">🧪</span>
      <p className="text-xs leading-relaxed text-amber-100/90">
        <span className="font-semibold text-amber-50">Demo mode.</span> Generations run for
        free and no funds move.{' '}
        {hasRealRail && 'Switch the payment method below to settle for real.'}
      </p>
    </div>
  )
}
