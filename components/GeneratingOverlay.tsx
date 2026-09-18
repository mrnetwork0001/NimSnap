'use client'

import { useEffect, useState } from 'react'
import NimMark from './NimMark'

interface Props {
  presetName: string
  /** Set once payment is confirmed, so the copy can move on from settlement. */
  paid: boolean
  /** Abort the attempt. The payment survives, so this is never a forfeit. */
  onCancel?: () => void
  /** Which wallet we are waiting on, so a stall can name the right window. */
  wallet?: 'Nimiq Pay' | 'the Nimiq Hub' | null
}

const STEPS = ['Confirming your payment', 'Reading the photo', 'Applying the style', 'Finishing in HD']

/**
 * Progress overlay shown while a paid shot renders.
 *
 * There is no real progress signal to report - the model gives us one result at
 * the end - so instead of a fake percentage bar this walks through the actual
 * stages of the pipeline. It stalls on the final step rather than completing
 * early, because a bar that hits 100% and then waits reads as broken.
 */
export default function GeneratingOverlay({ presetName, paid, onCancel, wallet }: Props) {
  const [step, setStep] = useState(0)
  /**
   * The escape hatch stays hidden at first. Offering it immediately invites
   * people to cancel a perfectly healthy five-second render; it only appears
   * once the wait has stopped feeling normal.
   */
  const [showCancel, setShowCancel] = useState(false)
  /**
   * A wallet that has not answered after half a minute is usually wedged rather
   * than slow - the Hub stalling on "Requesting balances" is the observed case.
   * Naming the window and saying plainly that nothing has been charged is the
   * difference between a user retrying and a user assuming we took their money.
   */
  const [walletStalled, setWalletStalled] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowCancel(true), 12_000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (paid) {
      setWalletStalled(false)
      return
    }
    const t = setTimeout(() => setWalletStalled(true), 30_000)
    return () => clearTimeout(t)
  }, [paid])

  useEffect(() => {
    if (!paid) {
      setStep(0)
      return
    }
    setStep((s) => Math.max(s, 1))
    const timers = [setTimeout(() => setStep(2), 1_400), setTimeout(() => setStep(3), 4_200)]
    return () => timers.forEach(clearTimeout)
  }, [paid])

  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-haze-400/85 px-8 backdrop-blur-xl">
      <div className="relative grid h-28 w-28 place-items-center">
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-300/40" />
        <span className="absolute inset-2 animate-spin rounded-full border-2 border-brand-100 border-t-brand-500 [animation-duration:1.4s]" />
        <span className="grid h-16 w-16 place-items-center rounded-full border border-white bg-white shadow-card">
          <NimMark className="h-8 w-8 text-brand-500" framed />
        </span>
      </div>

      <div className="space-y-1.5 text-center">
        <p className="text-lg font-bold tracking-[-0.02em] text-ink">Creating your {presetName}</p>
        <p className="text-sm text-ink-muted">This usually takes a few seconds.</p>
      </div>

      <ol className="w-full max-w-[16rem] space-y-2.5">
        {STEPS.map((label, i) => {
          const done = i < step
          const active = i === step
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[0.625rem] font-bold transition ${
                  done
                    ? 'border-transparent bg-brand-gradient text-white'
                    : active
                      ? 'border-brand-400 text-brand-500'
                      : 'border-ink-soft/40 text-ink-soft'
                }`}
              >
                {done ? (
                  <svg viewBox="0 0 24 24" className="h-3 w-3">
                    <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className={`text-sm transition ${done ? 'text-ink-soft' : active ? 'font-bold text-ink' : 'text-ink-soft'}`}>
                {label}
              </span>
              {active && <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />}
            </li>
          )
        })}
      </ol>

      {walletStalled && !paid && (
        <p className="max-w-[19rem] text-center text-xs leading-relaxed text-ink-muted">
          Still waiting on {wallet ?? 'your wallet'}. If that window is stuck, close it and
          try again - nothing has been charged unless you approved a payment.
        </p>
      )}

      {onCancel && (
        <div className={`transition-opacity duration-500 ${showCancel ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
          <button type="button" onClick={onCancel} className="btn-ghost px-5 py-2.5 text-xs">
            Stop waiting
          </button>
          <p className="mt-2 text-center text-[0.625rem] text-ink-soft">
            Your payment stays credited
          </p>
        </div>
      )}
    </div>
  )
}
