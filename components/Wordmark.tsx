import Image from 'next/image'
import Link from 'next/link'

/**
 * The NimSnap lockup, used in both headers and the footer.
 *
 * The supplied artwork is a 3:1 wordmark with a tagline beneath it, so it is
 * sized by height and left to find its own width - fixing the width instead
 * would make the mark shrink on narrow phones where the header is tightest.
 *
 * `priority` because this sits in the first viewport on every route; letting it
 * lazy-load would leave a visible gap on the fold.
 */
export default function Wordmark({
  href = '/',
  className = 'h-9',
}: {
  href?: string
  className?: string
}) {
  return (
    <Link href={href} className="inline-flex items-center" aria-label="NimSnap home">
      <Image
        src="/brand/nimsnap-header.png"
        alt="NimSnap - studio photos for ten cents a shot"
        width={720}
        height={240}
        priority
        className={`${className} w-auto`}
      />
    </Link>
  )
}
