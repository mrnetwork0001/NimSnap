import { describe, expect, it } from 'vitest'

/**
 * Guards text contrast against the page background.
 *
 * `ink-muted` and `ink-soft` carry most of the copy in the app and both once
 * sat below the WCAG AA threshold for body text - 3.54:1 and 2.38:1 against the
 * haze background. They are easy to lighten again by eye, so the ratio is
 * pinned here rather than left to judgement.
 */

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lin = c.map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const WHITE = '#FFFFFF'
/** The lightest ground body text is ever set on. */
const HAZE = '#EEF4F8'
const AA_BODY = 4.5

const TEXT = {
  ink: '#17213D',
  'ink-muted': '#4F5D7A',
  'ink-soft': '#5F6F89',
  'brand-500': '#4262D4',
}

describe('text contrast meets WCAG AA', () => {
  for (const [name, hex] of Object.entries(TEXT)) {
    it(`${name} passes on white and on haze`, () => {
      expect(contrast(hex, WHITE)).toBeGreaterThanOrEqual(AA_BODY)
      expect(contrast(hex, HAZE)).toBeGreaterThanOrEqual(AA_BODY)
    })
  }

  it('keeps the three-step hierarchy: ink darkest, soft lightest', () => {
    expect(luminance(TEXT.ink)).toBeLessThan(luminance(TEXT['ink-muted']))
    expect(luminance(TEXT['ink-muted'])).toBeLessThan(luminance(TEXT['ink-soft']))
  })

  it('the tokens under test are the ones the config actually ships', async () => {
    const { readFileSync } = await import('fs')
    const cfg = readFileSync(new URL('../tailwind.config.ts', import.meta.url), 'utf8')
    for (const hex of Object.values(TEXT)) expect(cfg).toContain(hex)
  })
})
