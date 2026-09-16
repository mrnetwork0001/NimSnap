import PageBackdrop from '@/components/PageBackdrop'
import Wordmark from '@/components/Wordmark'
import StudioApp from '@/components/StudioApp'
import { availableExamples } from '@/lib/examples.server'

/**
 * The studio itself.
 *
 * Lives at /app rather than / so the Nimiq Pay deeplink can drop a user
 * straight into the tool - inside the host app they arrived intending to make
 * something, and should not pay a marketing click to get there.
 */
export default function StudioPage() {
  const examples = availableExamples()

  return (
    <>
      <PageBackdrop />

      <header className="pt-safe relative z-40">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-2.5 py-3">
          {/* The wordmark is the way back, so the header carries no second exit. */}
          <Wordmark href="/" />
          <span className="rounded-full border border-white bg-white/70 px-3 py-1.5 text-[0.6875rem] font-bold text-brand-600 shadow-ghost">
            $0.10 / shot
          </span>
        </div>
      </header>

      <main className="relative">
        <StudioApp examples={examples} />
      </main>
    </>
  )
}
