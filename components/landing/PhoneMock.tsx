/**
 * A still of the studio, framed as a phone.
 *
 * Hand-built rather than a screenshot: it stays crisp at any density, weighs
 * nothing, and cannot drift out of date when the real UI moves. The before/after
 * panel carries a suggested subject so it reads as a photograph being restyled
 * rather than two empty swatches.
 */

/** Head-and-shoulders suggestion, tinted by the side it sits on. */
function Subject({ variant }: { variant: 'before' | 'after' }) {
  const skin = variant === 'after' ? '#F3CBA5' : '#B9BDC6'
  const body = variant === 'after' ? '#2F3C63' : '#8A909C'
  return (
    <svg viewBox="0 0 100 125" className="h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <circle cx="50" cy="46" r="21" fill={skin} />
      <path d="M12 125c0-21 17-34 38-34s38 13 38 34z" fill={body} />
    </svg>
  )
}

export default function PhoneMock() {
  return (
    <div className="relative mx-auto w-full max-w-[19rem]">
      <div className="rounded-[2.75rem] border border-white bg-white/60 p-3 shadow-card backdrop-blur-xl">
        <div className="overflow-hidden rounded-[2.125rem] bg-gradient-to-b from-white to-haze-200 p-4">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Your shot</p>
            <span className="rounded-full bg-white px-2 py-0.5 text-[0.5625rem] font-bold text-brand-600 shadow-ghost">
              $0.10
            </span>
          </div>

          <div className="relative mt-3 aspect-[4/5] overflow-hidden rounded-2xl border border-white shadow-lift">
            {/* After: warm, lit, styled. */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-100 via-accent-periwinkle/40 to-brand-300/70" />
            <div className="absolute inset-0"><Subject variant="after" /></div>

            {/* Before: the same frame, flat and desaturated, clipped to the left half. */}
            <div className="absolute inset-0 [clip-path:inset(0_50%_0_0)]">
              <div className="absolute inset-0 bg-gradient-to-br from-haze-300 to-ink/15" />
              <div className="absolute inset-0"><Subject variant="before" /></div>
            </div>

            <div className="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2 bg-white shadow-[0_0_10px_rgba(66,98,212,0.4)]" />
            <span className="absolute left-2.5 top-2.5 rounded-full bg-ink/55 px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wider text-white">
              Before
            </span>
            <span className="absolute right-2.5 top-2.5 rounded-full bg-white/90 px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wider text-ink">
              After
            </span>
            <span className="absolute left-1/2 top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white bg-white shadow-card">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-brand-500" aria-hidden="true">
                <path d="M9 6L4 12l5 6M15 6l5 6-5 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>

          {/* Style rail, echoing the real picker. */}
          <div className="mt-3 flex gap-1.5">
            {[
              ['💼', true],
              ['🦾', false],
              ['📸', false],
              ['🎨', false],
            ].map(([emoji, active], i) => (
              <span
                key={i}
                className={`flex h-8 flex-1 items-center justify-center rounded-xl border text-sm ${
                  active ? 'border-brand-300 bg-white shadow-ghost' : 'border-white bg-white/60'
                }`}
              >
                {emoji as string}
              </span>
            ))}
          </div>

          <div className="mt-3 rounded-full bg-brand-gradient px-4 py-2.5 text-center text-[0.8125rem] font-semibold text-white shadow-brand">
            Generate for $0.10
          </div>
          <p className="mt-2 text-center text-[0.625rem] text-ink-soft">
            ≈ 259 NIM · settles instantly
          </p>
        </div>
      </div>

      <div className="absolute -right-5 -top-10 hidden max-w-[10.5rem] rounded-2xl border border-white bg-white/85 px-3.5 py-2.5 text-[0.6875rem] font-medium leading-snug text-ink shadow-lift backdrop-blur-md sm:block">
        &ldquo;A headshot for the price of nothing.&rdquo;
      </div>
    </div>
  )
}
