import Link from 'next/link'
import Wordmark from './Wordmark'

/**
 * Site footer.
 *
 * Structure borrowed from aetheria.exchange: a wide brand block beside three
 * narrow link columns, tiny wide-tracked uppercase headings, and monospace
 * throughout. The monospace is the part that does the work - it reads as
 * infrastructure rather than marketing, which suits an app whose whole claim is
 * that payments are verifiable.
 *
 * The palette is ours, not theirs: that site is near-black, this one is built on
 * a pale ground, so the same structure is rendered in the light theme rather
 * than copied wholesale.
 *
 * Note: the "your photo is sent to our AI provider" disclosure is deliberately
 * NOT repeated here. It lives in UploadZone, at the moment the user actually
 * hands over a photo, which is the only place it changes anyone's decision.
 */

interface FooterLink {
  label: string
  href: string
  external?: boolean
}

const COLUMNS: { heading: string; links: FooterLink[] }[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Open the studio', href: '/app' },
      { label: 'How it works', href: '/#how' },
      { label: 'Styles', href: '/#styles' },
    ],
  },
  {
    heading: 'Nimiq',
    links: [
      { label: 'Nimiq Pay', href: 'https://nimpay.app', external: true },
      { label: 'Nimiq Wallet', href: 'https://wallet.nimiq.com', external: true },
      { label: 'Mini Apps docs', href: 'https://nimiq.dev/mini-apps', external: true },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'GitHub', href: 'https://github.com/mrnetwork0001/NimSnap', external: true },
      { label: 'Block explorer', href: 'https://nimiq.watch', external: true },
      { label: 'MIT License', href: 'https://github.com/mrnetwork0001/NimSnap/blob/main/LICENSE', external: true },
    ],
  },
]

export default function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-white/70">
      <div className="mx-auto w-full max-w-6xl px-[1.125rem] py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-12">
          {/* Brand block, deliberately wider than the link columns. */}
          <div className="min-w-0">
            <Wordmark className="h-9" />
            <p className="mt-4 max-w-xs font-mono text-[0.78125rem] leading-relaxed tracking-[0.01em] text-ink-muted">
              Studio photos for ten cents a shot. Pay per photo in NIM through Nimiq Pay -
              no account, no subscription, and every payment verified on chain before
              anything is generated.
            </p>

          </div>

          {COLUMNS.map((col) => (
            <nav key={col.heading} className="min-w-0">
              <h2 className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-brand-500">
                {col.heading}
              </h2>
              <ul className="mt-3 space-y-1.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block py-0.5 font-mono text-[0.78125rem] leading-snug tracking-[0.02em] text-ink-muted transition hover:text-ink"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        href={l.href}
                        className="inline-block py-0.5 font-mono text-[0.78125rem] leading-snug tracking-[0.02em] text-ink-muted transition hover:text-ink"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

      </div>
    </footer>
  )
}
