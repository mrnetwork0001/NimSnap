'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

interface Props {
  links: { href: string; label: string }[]
}

/**
 * Hamburger nav for narrow screens.
 *
 * The desktop header lays the links out inline; below `sm` they collapse in
 * here so the wordmark keeps its room on a 360px phone.
 *
 * Closes on outside tap, on Escape, and on following a link - that last one
 * matters because every link is an in-page anchor, so without it the panel
 * would sit over the section the user just jumped to.
 */
export default function MobileNav({ links }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="grid h-10 w-10 place-items-center rounded-full border border-white bg-white/70 text-ink shadow-ghost transition active:scale-95"
      >
        <svg viewBox="0 0 24 24" className="h-[1.125rem] w-[1.125rem]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? (
            <>
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </>
          ) : (
            <>
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </>
          )}
        </svg>
      </button>

      <div
        id="mobile-nav"
        hidden={!open}
        // An overlay panel has to be opaque. The translucent card style used
        // elsewhere sits over page content here, and the hero headline read
        // straight through it.
        className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-panel border border-white bg-white p-1.5 shadow-card"
      >
        <nav className="flex flex-col">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3.5 py-2.5 text-[0.875rem] font-semibold text-ink-muted transition hover:bg-haze-200 hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/app"
            onClick={() => setOpen(false)}
            className="btn-primary mt-1.5 w-full px-4 py-2.5 text-[0.8125rem]"
          >
            Open the studio
          </Link>
        </nav>
      </div>
    </div>
  )
}
