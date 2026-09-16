import { describe, test, expect } from 'vitest'
import { explorerUrl, railLabel, shortHash } from '@/lib/explorer'

/** A real mainnet payment to the treasury, 258.69875 NIM, block 61738991. */
const REAL_HASH = '56d813c2b7e82da15fb3e92b3b7e9734a5176fb9152ba9904d8c1609fe676f5d'

describe('explorerUrl', () => {
  test('NIM payments point at the Nimiq explorer', () => {
    expect(explorerUrl('nim', REAL_HASH)).toBe(`https://nimiq.watch/#${REAL_HASH}`)
  })

  test('a Hub payment is a NIM payment, so it links the same way', () => {
    expect(explorerUrl('hub', REAL_HASH)).toBe(explorerUrl('nim', REAL_HASH))
  })

  test('USDT points at Polygon instead', () => {
    expect(explorerUrl('usdt', '0xabc')).toBe('https://polygonscan.com/tx/0xabc')
  })

  test('demo mode has nothing to link to, and must not pretend otherwise', () => {
    expect(explorerUrl('demo', REAL_HASH)).toBeNull()
  })

  test('a missing hash yields no link rather than a broken one', () => {
    expect(explorerUrl('nim', '')).toBeNull()
  })
})

describe('railLabel', () => {
  test('names the currency, not the plumbing', () => {
    // A user who paid through the Hub still paid NIM; "HUB" would only confuse.
    expect(railLabel('hub')).toBe('NIM')
    expect(railLabel('nim')).toBe('NIM')
    expect(railLabel('usdt')).toBe('USDT')
    expect(railLabel('demo')).toBe('demo mode')
  })
})

describe('shortHash', () => {
  test('keeps enough of both ends to match against the explorer page', () => {
    expect(shortHash(REAL_HASH)).toBe('56d813c2b7…676f5d')
  })

  test('leaves an already-short value alone', () => {
    expect(shortHash('abc123')).toBe('abc123')
  })
})
