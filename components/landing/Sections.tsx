import Link from 'next/link'
import { PRESETS } from '@/lib/presets'
import PresetIcon from '@/components/PresetIcon'

/* ------------------------------------------------------------- features --- */

const FEATURES = [
  {
    title: 'Eight studio styles',
    body: 'Headshots, avatars, product shots, restoration, passport photos, pet portraits. Each tuned for its subject.',
    icon: (
      <path d="M4 7a2 2 0 012-2h2l1-1.5h6L20 5h-2a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" fill="none" stroke="currentColor" strokeWidth="1.7" />
    ),
  },
  {
    title: 'Ten cents a shot',
    body: 'Priced in dollars, charged in NIM at the live rate. No subscription, and no minimum to buy.',
    icon: <path d="M12 3v18M8 7.5h6a2.5 2.5 0 010 5H9a2.5 2.5 0 000 5h7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />,
  },
  {
    title: 'Verified before you get charged',
    body: 'The server reads the chain itself before the model runs, and links you the transaction afterwards.',
    icon: <path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3z M9 12l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />,
  },
  {
    title: 'No account, ever',
    body: 'No email, no password, no forms. Pay from Nimiq Pay on your phone or a Nimiq Wallet in any browser.',
    icon: <path d="M12 13a4 4 0 100-8 4 4 0 000 8zM5 20a7 7 0 0114 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />,
  },
]

export function Features() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <article key={f.title} className="card-sm group p-5 transition hover:-translate-y-0.5 hover:shadow-card">
            <span className="chip">
              <svg viewBox="0 0 24 24" className="h-[1.125rem] w-[1.125rem]" aria-hidden="true">{f.icon}</svg>
            </span>
            <h3 className="mt-3.5 text-[0.9375rem] font-bold text-ink">{f.title}</h3>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-muted">{f.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- styles --- */

export function Styles() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-14">
      <div className="card overflow-hidden p-8 lg:p-12">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="eyebrow">Built for real photos</p>
            <h2 className="mt-4 text-[1.875rem] leading-[1.1] sm:text-[2.25rem]">
              A good headshot should not cost fifty dollars a month.
            </h2>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
              Every AI photo tool wants a subscription. Most people need three headshots a
              year. NimSnap prices the thing you actually want - one finished photo - and
              charges for exactly that.
            </p>
          </div>

          {/* Two columns even on desktop: eight cards in four columns would be
              too dense to read beside the heading. */}
          <div className="grid gap-3 sm:grid-cols-2">
            {PRESETS.map((p) => (
              <div key={p.id} className="rounded-2xl border border-white bg-white/70 p-4 shadow-ghost">
                <div className="flex items-center gap-2.5">
                  <span className="chip h-8 w-8">
                    <PresetIcon preset={p.id} className="h-4 w-4" />
                  </span>
                  <h3 className="text-[0.875rem] font-bold text-ink">{p.name}</h3>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{p.tagline}</p>
                <p className="mt-2.5 text-[0.625rem] uppercase tracking-[0.14em] text-ink-soft">{p.bestFor}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ----------------------------------------------------------- how it works --- */

const STEPS = [
  { n: '01', title: 'Upload', body: 'A selfie, a product, your pet. The photo is resized on your device before it is sent.' },
  { n: '02', title: 'Pick a style', body: 'Eight presets, each with prompts tuned for the subject it is meant for.' },
  { n: '03', title: 'Pay $0.10', body: 'Nimiq Pay raises its own sheet on mobile; in a browser, Nimiq\u2019s hosted checkout does. One tap either way.' },
  { n: '04', title: 'Compare and keep', body: 'Drag the before/after slider, then save it. Your result is stored, not a link that expires.' },
]

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto w-full max-w-6xl scroll-mt-24 px-6 py-10">
      <p className="eyebrow">How it works</p>
      <h2 className="mt-4 max-w-xl text-[1.875rem] leading-[1.1] sm:text-[2.25rem]">
        Open, upload, pay, done.
      </h2>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <article key={s.n} className="card-sm relative overflow-hidden p-5">
            <span className="absolute right-4 top-4 text-[1.75rem] font-extrabold leading-none text-brand-200">
              {s.n}
            </span>
            <h3 className="mt-6 text-[0.9375rem] font-bold text-ink">{s.title}</h3>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-muted">{s.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- payment --- */

export function PaymentStory() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-14">
      <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <p className="eyebrow">Paid first, generated second</p>
          <h2 className="mt-4 text-[1.875rem] leading-[1.1] sm:text-[2.25rem]">
            We never take your word for it.
          </h2>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
            When the app says a payment landed, the server checks the chain itself. It
            looks for a transaction that reached our address, carries this order&rsquo;s id,
            and moved at least the quoted amount - before a single token is spent on the
            model. Afterwards it hands you the transaction, so you can confirm all of that
            on a public block explorer rather than take our word for it.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {['Verified on-chain', 'Single-use orders', 'Free retries', 'Linked receipt'].map((t) => (
              <span key={t} className="rounded-full border border-white bg-white/70 px-3 py-1.5 text-[0.6875rem] font-semibold text-brand-600 shadow-ghost">
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="space-y-2.5 font-mono text-[0.75rem] leading-relaxed">
            {[
              ['1', 'Order minted', 'id planted in the transaction'],
              ['2', 'Nimiq Pay confirms', 'settles in about a second'],
              ['3', 'Chain verified', 'server reads it independently'],
              ['4', 'Shot generated', 'only now does the model run'],
              ['5', 'Receipt linked', 'check it on the block explorer'],
            ].map(([n, title, sub]) => (
              <div key={n} className="flex items-start gap-3 rounded-2xl border border-white bg-white/70 px-4 py-3 shadow-ghost">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-gradient text-[0.625rem] font-bold text-white">
                  {n}
                </span>
                <span>
                  <span className="font-sans font-bold text-ink">{title}</span>
                  <span className="ml-2 font-sans text-ink-muted">{sub}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------- CTA --- */

export function ClosingCta() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-6">
      <div className="card px-8 py-14 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-gradient shadow-brand">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" aria-hidden="true">
            <rect x="2.5" y="6" width="19" height="13" rx="4" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <circle cx="12" cy="12.5" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <path d="M9 6l1.3-2h3.4L15 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          </svg>
        </span>
        <h2 className="mt-6 text-[2rem] leading-tight sm:text-[2.5rem]">NimSnap</h2>
        <p className="mt-2 font-medium text-brand-500">Studio photos for ten cents a shot.</p>
        <Link href="/app" className="btn-primary mt-7">
          Open the studio
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path d="M5 12h14m-6-6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </section>
  )
}
