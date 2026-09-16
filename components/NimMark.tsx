/**
 * The NimSnap mark: four corner brackets around an N.
 *
 * Drawn rather than loaded as the PNG app icon, because that icon is a solid
 * blue rounded square - dropped inside the white circle of the loading ring it
 * reads as a heavy blob competing with the thin ring stroke. As SVG the mark
 * inherits colour, stays crisp at any size, and the brackets can be animated
 * independently of the N.
 *
 * `framed` pulls the brackets inward on a loop, which is what a camera does
 * when it focuses - the mark is a capture frame, so it may as well capture.
 */
export default function NimMark({
  className = 'h-8 w-8',
  framed = false,
}: {
  className?: string
  framed?: boolean
}) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <g
        stroke="currentColor"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={framed ? 'ns-frame origin-center' : undefined}
      >
        <path d="M7 17V11a4 4 0 014-4h6" />
        <path d="M31 7h6a4 4 0 014 4v6" />
        <path d="M41 31v6a4 4 0 01-4 4h-6" />
        <path d="M17 41h-6a4 4 0 01-4-4v-6" />
      </g>
      {/* The N, weighted to match the wordmark's stroke. */}
      <path
        d="M17.5 33V15h3.6l9.4 12V15h3.6v18h-3.6l-9.4-12v12z"
        fill="currentColor"
      />
    </svg>
  )
}
