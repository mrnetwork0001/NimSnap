import type { PresetId } from './presets'

/**
 * Before/after showcase assets.
 *
 * These exist so someone opening NimSnap in a plain browser - a judge, or anyone
 * following a shared link - can see what the product actually does without a
 * wallet. That audience currently hits a dead end.
 *
 * The pairs must be genuine output from our own pipeline. Nothing here is
 * stock or mocked up: `scripts/generate-examples.mjs` produces them by running
 * the real preset through the real model. If the assets are absent the showcase
 * simply does not render, so a deployment can never present a placeholder as if
 * it were a real result.
 */

export interface ExamplePair {
  presetId: PresetId
  before: string
  after: string
  /** Described for screen readers and as the visible caption. */
  caption: string
}

/** Expected asset locations. Presence on disk is what decides what renders. */
export const EXAMPLE_MANIFEST: ExamplePair[] = [
  {
    presetId: 'executive',
    before: '/examples/executive-before.jpg',
    after: '/examples/executive-after.jpg',
    caption: 'Phone selfie to boardroom headshot',
  },
  {
    presetId: 'cyberpunk',
    before: '/examples/cyberpunk-before.jpg',
    after: '/examples/cyberpunk-after.jpg',
    caption: 'Everyday photo to Web3 avatar',
  },
  {
    presetId: 'ecommerce',
    before: '/examples/ecommerce-before.jpg',
    after: '/examples/ecommerce-after.jpg',
    caption: 'Kitchen table to studio product shot',
  },
  {
    presetId: 'anime',
    before: '/examples/anime-before.jpg',
    after: '/examples/anime-after.jpg',
    caption: 'Portrait to illustrated character',
  },
  {
    presetId: 'restore',
    before: '/examples/restore-before.jpg',
    after: '/examples/restore-after.jpg',
    caption: 'Faded print to clean photograph',
  },
  {
    presetId: 'passport',
    before: '/examples/passport-before.jpg',
    after: '/examples/passport-after.jpg',
    caption: 'Snapshot to passport-style ID photo',
  },
  {
    presetId: 'sweep',
    before: '/examples/sweep-before.jpg',
    after: '/examples/sweep-after.jpg',
    caption: 'Desk clutter to coloured studio sweep',
  },
  {
    presetId: 'pet',
    before: '/examples/pet-before.jpg',
    after: '/examples/pet-after.jpg',
    caption: 'Phone snap to framed pet portrait',
  },
]
