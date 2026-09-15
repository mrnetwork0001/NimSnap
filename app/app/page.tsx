import Link from 'next/link'
import PageBackdrop from '@/components/PageBackdrop'
import Wordmark from '@/components/Wordmark'
import StudioApp from '@/components/StudioApp'
import { availableExamples } from '@/lib/examples.server'

/**
 * The studio itself.
 *
 * Lives at /app rather than / so the Nimiq Pay deeplink can drop a user
 * straight into the tool — inside the host app they arrived intending to make
 * something, and should not pay a marketing click to get there.
 */
export default function StudioPage() {
  const examples = availableExamples()

  return (
    <>
      <PageBackdrop />

      <header className="pt-safe relative z-40">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3">
          <Wordmark href="/app" />
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-white bg-white/70 px-3 py-1.5 text-[0.6875rem] font-bold text-brand-600 shadow-ghost">
              $0.10 / shot
            </span>
            <Link href="/" className="hidden text-[0.8125rem] font-semibold text-brand-500 transition hover:text-brand-600 sm:block">
              Back home
            </Link>
          </div>
        </div>
      </header>

      <main className="relative">
        <StudioApp examples={examples} />
      </main>
    </>
  )
}
