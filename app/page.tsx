import StudioApp from '@/components/StudioApp'
import { availableExamples } from '@/lib/examples.server'

export default function Home() {
  // Resolved on the server so the showcase is present in the first paint rather
  // than popping in after hydration.
  const examples = availableExamples()

  return (
    <main className="pt-safe relative min-h-[100dvh]">
      {/* Faint grid gives the glass panels something to refract. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-grid-fade bg-grid opacity-[0.35] [mask-image:radial-gradient(60%_50%_at_50%_30%,#000,transparent)]"
      />

      <header className="relative mx-auto mb-5 w-full max-w-md px-4 lg:max-w-5xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-neon-cyan to-nimiq-blue text-base shadow-neon">
              📸
            </span>
            <div className="leading-tight">
              <h1 className="text-base font-extrabold tracking-tight text-white">NimSnap</h1>
              <p className="text-[0.625rem] uppercase tracking-[0.14em] text-slate-500">
                Pay-per-shot studio
              </p>
            </div>
          </div>
          <span className="rounded-full border border-neon-cyan/30 bg-neon-cyan/10 px-3 py-1 font-mono text-[0.6875rem] font-bold text-neon-cyan">
            $0.10 / shot
          </span>
        </div>
      </header>

      <div className="relative">
        <StudioApp examples={examples} />
      </div>
    </main>
  )
}
