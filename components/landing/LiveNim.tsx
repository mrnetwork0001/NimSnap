'use client'

import { useEffect, useRef, useState } from 'react'
import { useLiveQuote } from '@/lib/client/useLiveQuote'
import { formatNim } from '@/lib/format'

/**
 * The live NIM price of one shot.
 *
 * The number is counted from its old value to its new one rather than swapped.
 * A figure that simply changes between two glances is indistinguishable from a
 * hardcoded one that happened to be edited; a figure that visibly moves is the
 * whole point of putting a live rate on the page. The tween is short enough to
 * read as a correction rather than a slot machine, and it is skipped entirely
 * for anyone who has asked for reduced motion.
 */

const TWEEN_MS = 700

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Counts from the previously displayed value to the newest one. */
function useCounted(target: number | null): number | null {
  const [shown, setShown] = useState<number | null>(target)
  const from = useRef<number | null>(target)
  const frame = useRef<number>()

  useEffect(() => {
    if (target == null) return

    // First real value, or a user who does not want motion: land on it.
    if (from.current == null || prefersReducedMotion()) {
      from.current = target
      setShown(target)
      return
    }
    if (from.current === target) return

    const start = performance.now()
    const origin = from.current
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / TWEEN_MS)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(origin + (target - origin) * eased)
      if (t < 1) frame.current = requestAnimationFrame(step)
      else from.current = target
    }
    frame.current = requestAnimationFrame(step)

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
      // Whatever we reached is the new baseline, so an interrupted tween does
      // not restart from a value that was never on screen.
      from.current = target
    }
  }, [target])

  return shown
}

export default function LiveNim({ className = '' }: { className?: string }) {
  const { quote, live } = useLiveQuote()
  const nim = useCounted(quote?.nimAvailable ? quote.nim : null)

  // Before the first quote lands, hold the line's height with a shimmer rather
  // than a placeholder number. A wrong figure that corrects itself a moment
  // later is worse than no figure at all on a page about honest pricing.
  if (nim == null) {
    return (
      <span
        className={`inline-block h-[1em] w-[5.5em] animate-pulse rounded-full bg-ink/10 align-middle ${className}`}
        aria-hidden="true"
      />
    )
  }

  return (
    <span className={`inline-flex items-baseline gap-1.5 tabular-nums ${className}`}>
      <span>≈ {formatNim(nim)}</span>
      {live && (
        <span
          aria-hidden="true"
          className="relative inline-flex h-1.5 w-1.5 self-center"
          title="Updating from the live NIM/USD rate"
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
        </span>
      )}
    </span>
  )
}
