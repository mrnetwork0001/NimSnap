'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  beforeSrc: string
  afterSrc: string
  className?: string
}

/**
 * Before/after comparison slider.
 *
 * Built on pointer events so one code path serves touch, pen and mouse, with
 * keyboard support on the handle for accessibility. The reveal is done by
 * clipping the "after" layer rather than resizing it, so the two images stay
 * pixel-aligned at every position and the wipe reads as a single photograph
 * changing rather than two photos sliding past each other.
 */
export default function CompareSlider({ beforeSrc, afterSrc, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(50)
  const [dragging, setDragging] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.width === 0) return
    const ratio = ((clientX - rect.left) / rect.width) * 100
    setPosition(Math.min(100, Math.max(0, ratio)))
  }, [])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Capture so the drag keeps tracking even if the finger leaves the element.
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    setHasInteracted(true)
    updateFromClientX(e.clientX)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    // Stop the webview from interpreting the horizontal drag as a page swipe.
    e.preventDefault()
    updateFromClientX(e.clientX)
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    setDragging(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setHasInteracted(true)
      setPosition((p) => Math.max(0, p - step))
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      setHasInteracted(true)
      setPosition((p) => Math.min(100, p + step))
    } else if (e.key === 'Home') {
      setPosition(0)
    } else if (e.key === 'End') {
      setPosition(100)
    }
  }

  /**
   * A one-time nudge so the control explains itself: sweep the handle across
   * and settle in the middle. Skipped entirely once the user takes over.
   */
  useEffect(() => {
    if (hasInteracted) return
    const frames = [
      [70, 320],
      [30, 700],
      [50, 1080],
    ] as const
    const timers = frames.map(([value, delay]) =>
      setTimeout(() => setPosition((p) => (hasInteracted ? p : value)), delay),
    )
    return () => timers.forEach(clearTimeout)
  }, [hasInteracted])

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={`relative select-none overflow-hidden rounded-3xl bg-ink-800 ${
        dragging ? 'cursor-grabbing' : 'cursor-grab'
      } ${className}`}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Original sits underneath and is revealed as the handle moves right. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={beforeSrc}
        alt="Your original photo"
        draggable={false}
        className="block h-full w-full object-cover"
      />

      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterSrc}
          alt="Your NimSnap result"
          draggable={false}
          className="block h-full w-full object-cover"
        />
      </div>

      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-white/85 backdrop-blur-sm">
        After
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-white/85 backdrop-blur-sm">
        Before
      </span>

      {/* Divider */}
      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 bg-gradient-to-b from-neon-cyan via-white to-neon-magenta"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      />

      {/* Handle */}
      <button
        type="button"
        role="slider"
        aria-label="Compare before and after"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`${Math.round(position)} percent revealed`}
        onKeyDown={onKeyDown}
        className="absolute top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-white/15 shadow-neon backdrop-blur-md transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan active:scale-95"
        style={{ left: `${position}%` }}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" aria-hidden="true">
          <path
            d="M9 6L4 12l5 6M15 6l5 6-5 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )
}
