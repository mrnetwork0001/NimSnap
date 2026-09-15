import Link from 'next/link'

/** The lockup, used in both headers and the footer. */
export default function Wordmark({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-gradient shadow-brand">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" aria-hidden="true">
          <rect x="2.5" y="6" width="19" height="13" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12.5" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 6l1.3-2h3.4L15 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-[1.0625rem] font-bold tracking-[-0.02em] text-ink">NimSnap</span>
    </Link>
  )
}
