import type { PresetId } from '@/lib/presets'

/**
 * Line icons for the four style presets.
 *
 * Drawn rather than set in emoji so the styles read as part of one designed
 * system: a single stroke weight, the same rounded joins as the rest of the UI,
 * and colour inherited from context instead of a platform's fixed palette.
 * Emoji also render differently on every OS, which made the picker look
 * assembled rather than designed.
 */

const PATHS: Record<PresetId, React.ReactNode> = {
  // Executive: a bust in a collared shirt. A head plus shoulders reads as
  // "portrait" instantly at 18px, where a tie alone turns into a smudge.
  executive: (
    <>
      <circle cx="12" cy="7.5" r="3.6" />
      <path d="M4.5 20.5a7.5 7.5 0 0115 0" />
      <path d="M9.6 13.2L12 16l2.4-2.8" />
    </>
  ),
  // Cyberpunk: a head with a visor band straight across the eyes. A circle plus
  // one crossing bar is the least ambiguous read at this size - the earlier
  // helmet outline collapsed into a capsule shape.
  cyberpunk: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M4.2 9.8h15.6" />
      <path d="M4.6 13.6h14.8" />
      <path d="M9.2 11.7h1.6M13.2 11.7h1.6" />
    </>
  ),
  // E-commerce: a boxed product on a studio sweep.
  ecommerce: (
    <>
      <path d="M12 3.5l7 3.5v8l-7 3.5-7-3.5v-8l7-3.5z" />
      <path d="M5 7l7 3.5L19 7" />
      <path d="M12 10.5v8" />
      <path d="M3.5 21h17" />
    </>
  ),
  // Anime: an expressive eye with a highlight.
  anime: (
    <>
      <path d="M3 12s3.6-5.5 9-5.5S21 12 21 12s-3.6 5.5-9 5.5S3 12 3 12z" />
      <circle cx="12" cy="12" r="2.8" />
      <circle cx="13.4" cy="10.7" r="0.7" fill="currentColor" stroke="none" />
    </>
  ),
}

export default function PresetIcon({
  preset,
  className = 'h-5 w-5',
}: {
  preset: PresetId
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[preset]}
    </svg>
  )
}
