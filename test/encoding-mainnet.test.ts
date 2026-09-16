import { describe, test, expect } from 'vitest'
import { dataCarriesOrderId } from '@/lib/settlement'

/**
 * Pins the data-field encoding against what mainnet actually returns.
 *
 * This was the project's one unverified assumption for a long time: the matcher
 * accepted several representations on the strength of reasoning, because no
 * mainnet transaction carrying a data payload was available to sample. One has
 * now been observed on the live treasury - the indexer returns the field as a
 * hex string (a 164-character staking payload), not as decoded text.
 *
 * So the hex-decode path is the one that carries real NIM payments, and these
 * lock it down.
 */

const ORDER = '2d602dcc9c34a82f' // a real id minted by the deployed server

/** What the app sends is an ASCII order id; the indexer hands back its bytes in hex. */
const asIndexerReturnsIt = Buffer.from(ORDER, 'utf8').toString('hex')

/** Verbatim from the treasury's transaction list - a staking payload, 164 chars. */
const REAL_STAKING_PAYLOAD =
  'f5aed34ec6eb02deb43c4e5775f20bda2d0912e2a70b9e44a448b5183ac4e186cd749d3d889fff84' +
  '01000000000000000000000000000000000000000000000000000000000000000001000001a0f0d1ed81'

describe('data field encoding, against observed mainnet behaviour', () => {
  test('the indexer hex-encodes the bytes, and the matcher decodes them', () => {
    expect(asIndexerReturnsIt).toBe('32643630326463633963333461383266')
    expect(asIndexerReturnsIt).toHaveLength(ORDER.length * 2)
    // The raw string does NOT contain the order id - only the decoded form does,
    // which is exactly why the hex path has to exist.
    expect(asIndexerReturnsIt.includes(ORDER)).toBe(false)
    expect(dataCarriesOrderId(asIndexerReturnsIt, ORDER)).toBe(true)
  })

  test('case from the indexer does not matter', () => {
    expect(dataCarriesOrderId(asIndexerReturnsIt.toUpperCase(), ORDER)).toBe(true)
  })

  test('a different order id is not matched by the same payload', () => {
    expect(dataCarriesOrderId(asIndexerReturnsIt, 'ffffffffffffffff')).toBe(false)
  })

  test('a real staking payload is not mistaken for a payment', () => {
    expect(dataCarriesOrderId(REAL_STAKING_PAYLOAD, ORDER)).toBe(false)
  })

  test('the payload decodes without throwing, however unprintable', () => {
    expect(() => dataCarriesOrderId(REAL_STAKING_PAYLOAD, ORDER)).not.toThrow()
  })
})
