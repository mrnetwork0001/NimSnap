import LiveNim from './LiveNim'

/**
 * The four numbers that describe how NimSnap actually works.
 *
 * Deliberately not a usage counter. Volume and wallet counts are only social
 * proof once they are large, and below that threshold they argue against the
 * product they are meant to sell. These four are true on day one and stay true,
 * and the live one does the job a usage counter is usually reaching for: it
 * shows the thing is plugged into something real and moving.
 */

interface Stat {
  value: React.ReactNode
  label: string
}

const STATS: Stat[] = [
  { value: '$0.10', label: 'Flat price per shot' },
  { value: <LiveNim />, label: 'At the live NIM rate' },
  { value: '~1s', label: 'Payment settlement' },
  { value: '0', label: 'Accounts to create' },
]

export default function LiveStats() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-4 pt-2">
      <dl className="grid grid-cols-2 overflow-hidden rounded-3xl border border-white bg-white/60 shadow-card backdrop-blur-xl sm:grid-cols-4">
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            className={`min-w-0 px-4 py-5 text-center sm:px-5 ${
              // Hairlines between cells, without a trailing edge on either axis.
              i % 2 === 1 ? 'border-l border-white/80' : ''
            } ${i >= 2 ? 'border-t border-white/80 sm:border-t-0' : ''} ${
              i > 0 ? 'sm:border-l sm:border-white/80' : ''
            }`}
          >
            <dd className="truncate text-lg font-bold tracking-tight text-ink sm:text-xl">
              {stat.value}
            </dd>
            <dt className="eyebrow mt-1.5 text-balance normal-case tracking-normal text-ink-soft">
              {stat.label}
            </dt>
          </div>
        ))}
      </dl>
    </section>
  )
}
