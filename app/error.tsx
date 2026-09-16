'use client'

import { useEffect } from 'react'
import Link from 'next/link'

/**
 * Route-level error boundary.
 *
 * Without this, a throw during render hands the user a blank page - and if it
 * happens after they have paid, they have no idea whether their money went
 * anywhere. So this says plainly that a paid shot is not lost, and points at the
 * studio, which recovers an unredeemed credit on mount.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[nimsnap] render error:', error)
  }, [error])

  return (
    <main className="grid min-h-[100dvh] place-items-center px-6">
      <div className="card w-full max-w-md px-8 py-10 text-center">
        <h1 className="text-[1.5rem] leading-tight text-ink">Something broke on our side</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          This is a bug in NimSnap, not something you did.{' '}
          <span className="font-semibold text-ink">
            If you had already paid for a shot, that payment is safe
          </span>{' '}
          - reopen the studio and it will offer to finish it.
        </p>

        <div className="mt-7 flex flex-col gap-2.5">
          <button type="button" onClick={reset} className="btn-primary w-full">
            Try again
          </button>
          <Link href="/app" className="btn-ghost w-full">
            Back to the studio
          </Link>
        </div>

        {error.digest && (
          <p className="mt-5 font-mono text-[0.625rem] text-ink-soft">ref {error.digest}</p>
        )}
      </div>
    </main>
  )
}
