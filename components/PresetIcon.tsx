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
  // Restore: a photo frame with a tear running in from the edge, and a
  // spark where the damage turns back into light.
  restore: (
    <>
      <path d="M5.5 5h13a2 2 0 012 2v10a2 2 0 01-2 2h-13a2 2 0 01-2-2V7a2 2 0 012-2z" />
      <path d="M3.5 14.2l2.8-2.4 2.3 2.6 2.7-3.4" />
      <path d="M16 7.5l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
    </>
  ),
  // Passport: an ID card - portrait on the left, data lines on the right.
  // Reads as "document" rather than "person", which is the distinction.
  passport: (
    <>
      <path d="M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
      <circle cx="8.5" cy="9.8" r="2.1" />
      <path d="M5.1 16.4a3.4 3.4 0 016.8 0" />
      <path d="M14.5 10h3.5M14.5 13.5h2.5" />
    </>
  ),
  // Colour sweep: a bottle standing on a floor line under a curved backdrop.
  // The cube already belongs to E-Commerce, so this uses a different product
  // silhouette - at 18px the distinct outline matters more than the backdrop.
  sweep: (
    <>
      <path d="M20.5 2.5v7a9 9 0 01-9 9H3.5" />
      <path d="M10.2 8.4V5.6h3.6v2.8l1.5 2.2v7.9a1.1 1.1 0 01-1.1 1.1h-4.4a1.1 1.1 0 01-1.1-1.1v-7.9z" />
      <path d="M2.5 21.5h19" />
    </>
  ),
  // Pet: a paw print. The least ambiguous animal glyph there is at 18px.
  pet: (
    <>
      <path d="M12 12.8c-2.9 0-5.2 2.3-5.2 4.5 0 1.6 1.2 2.6 2.7 2.6 1 0 1.7-.5 2.5-.5s1.5.5 2.5.5c1.5 0 2.7-1 2.7-2.6 0-2.2-2.3-4.5-5.2-4.5z" />
      <circle cx="5.8" cy="10.4" r="1.6" />
      <circle cx="12" cy="6.8" r="1.6" />
      <circle cx="18.2" cy="10.4" r="1.6" />
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
