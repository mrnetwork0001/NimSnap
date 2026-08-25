'use client'

import { useEffect, useState } from 'react'

interface Props {
  presetName: string
  /** Set once payment is confirmed, so the copy can move on from settlement. */
  paid: boolean
}

const STEPS = [
  'Confirming your payment',
  'Reading the photo',
  'Applying the style',
  'Finishing in HD',
]

/**
 * Progress overlay shown while a paid shot renders.
 *
 * There is no real progress signal to report — the model gives us one result at
 * the end — so instead of a fake percentage bar this walks through the actual
 * stages of the pipeline on a timer. It stalls on the final step rather than
 * completing early, because a bar that hits 100% and then waits reads as broken.
 */
export default function GeneratingOverlay({ presetName, paid }: Props) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!paid) {
      setStep(0)
      return
    }
    setStep((s) => Math.max(s, 1))
    const timers = [
      setTimeout(() => setStep(2), 1_400),
      setTimeout(() => setStep(3), 4_200),
    ]
    return () => timers.forEach(clearTimeout)
  }, [paid])

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-ink-900/85 px-8 backdrop-blur-xl"
    >
      <div className="relative grid h-28 w-28 place-items-center">
        <span className="absolute inset-0 rounded-full border border-neon-cyan/30" />
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-neon-cyan/15" />
        <span className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-t-neon-cyan border-r-neon-magenta [animation-duration:1.4s]" />
        <span className="text-3xl">✨</span>
      </div>

      <div className="space-y-1.5 text-center">
        <p className="text-lg font-bold text-white">Creating your {presetName}</p>
        <p className="text-sm text-slate-400">This usually takes a few seconds.</p>
      </div>

      <ol className="w-full max-w-[16rem] space-y-2.5">
        {STEPS.map((label, i) => {
          const done = i < step
          const active = i === step
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[0.625rem] transition ${
                  done
                    ? 'border-neon-cyan bg-neon-cyan text-ink-900'
                    : active
                      ? 'border-neon-cyan text-neon-cyan'
                      : 'border-white/15 text-slate-600'
                }`}
              >
                {done ? (
                  <svg viewBox="0 0 24 24" className="h-3 w-3">
                    <path
                      d="M5 13l4 4L19 7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={`text-sm transition ${
                  done ? 'text-slate-500' : active ? 'font-semibold text-white' : 'text-slate-600'
                }`}
              >
                {label}
              </span>
              {active && (
                <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-neon-cyan" />
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
