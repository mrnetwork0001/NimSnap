'use client'

import { useEffect, useState } from 'react'

interface Props {
  presetName: string
  /** Set once payment is confirmed, so the copy can move on from settlement. */
  paid: boolean
}

const STEPS = ['Confirming your payment', 'Reading the photo', 'Applying the style', 'Finishing in HD']

/**
 * Progress overlay shown while a paid shot renders.
 *
 * There is no real progress signal to report — the model gives us one result at
 * the end — so instead of a fake percentage bar this walks through the actual
 * stages of the pipeline. It stalls on the final step rather than completing
 * early, because a bar that hits 100% and then waits reads as broken.
 */
export default function GeneratingOverlay({ presetName, paid }: Props) {
  const [step, setStep] = useState(0)

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
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-brand-500" aria-hidden="true">
            <path d="M12 3l1.8 4.9L19 9.6l-4.4 3 .6 5.4-4.2-2.6L6.8 18l.6-5.4L3 9.6l5.2-1.7L12 3z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
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
    </div>
  )
}
