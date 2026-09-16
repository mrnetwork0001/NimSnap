import { describe, test, expect } from 'vitest'
import { dataCarriesOrderId, normalizeNimAddress, topicToAddress } from '@/lib/settlement'

/**
 * These cover the single riskiest assumption in the app.
 *
 * A NIM payment is tied to its order by an id planted in the transaction's data
 * field, because the provider returns a serialized transaction rather than a
 * hash. If the matcher misses the encoding an indexer actually returns, every
 * payment verification fails - users pay and get nothing. No mainnet
 * transaction carrying a data payload was available to sample, so the matcher
 * accepts several representations and these pin every one of them down.
 */

const ORDER = '01fe35b992010ea5' // 8 random bytes, hex - the real id shape
const hex = (s: string) => Buffer.from(s, 'utf8').toString('hex')

describe('dataCarriesOrderId', () => {
  test('indexer returns the id verbatim', () => {
    expect(dataCarriesOrderId(ORDER, ORDER)).toBe(true)
  })

  test('indexer hex-encodes the UTF-8 bytes of the id', () => {
    expect(dataCarriesOrderId(hex(ORDER), ORDER)).toBe(true)
  })

  test('uppercase hex from the indexer still matches', () => {
    expect(dataCarriesOrderId(hex(ORDER).toUpperCase(), ORDER)).toBe(true)
    expect(dataCarriesOrderId(ORDER.toUpperCase(), ORDER)).toBe(true)
  })

  test('id embedded in a larger memo matches', () => {
    expect(dataCarriesOrderId(`nimsnap:${ORDER}`, ORDER)).toBe(true)
    expect(dataCarriesOrderId(hex(`nimsnap:${ORDER}`), ORDER)).toBe(true)
  })

  test('empty and absent data never match', () => {
    for (const empty of ['', null, undefined]) {
      expect(dataCarriesOrderId(empty, ORDER)).toBe(false)
    }
  })

  test('a different order id does not match', () => {
    const other = 'ffffffffffffffff'
    expect(dataCarriesOrderId(other, ORDER)).toBe(false)
    expect(dataCarriesOrderId(hex(other), ORDER)).toBe(false)
  })

  test('odd-length hex is not misread as bytes', () => {
    // Must not throw, and must not produce a false positive.
    expect(dataCarriesOrderId('abc', ORDER)).toBe(false)
  })

  test('non-hex junk is handled without throwing', () => {
    expect(() => dataCarriesOrderId('☃ not hex ☃', ORDER)).not.toThrow()
    expect(dataCarriesOrderId('☃ not hex ☃', ORDER)).toBe(false)
  })

  /**
   * Documents a real limitation rather than asserting it is fine: an id that is
   * itself valid hex can appear inside an unrelated longer hex string. With 8
   * random bytes the odds are negligible, and a false positive still cannot
   * unlock anything on its own - the transaction must also be in our treasury
   * for at least the quoted amount.
   */
  test('known limitation: id can appear inside unrelated hex', () => {
    expect(dataCarriesOrderId(`dead${ORDER}beef`, ORDER)).toBe(true)
  })
})

describe('normalizeNimAddress', () => {
  test('ignores the spacing of user-facing addresses', () => {
    // A Nimiq address is NQ + 2 check digits + 8 groups of 4 = 36 characters.
    const spaced = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000'
    const flat = normalizeNimAddress(spaced)
    expect(flat).toHaveLength(36)
    expect(flat).toBe('NQ07' + '0'.repeat(32))
    expect(flat).toBe(normalizeNimAddress(spaced.replace(/\s/g, '')))
  })

  test('is case-insensitive', () => {
    expect(normalizeNimAddress('nq07 abcd')).toBe(normalizeNimAddress('NQ07 ABCD'))
  })

  test('distinguishes genuinely different addresses', () => {
    expect(normalizeNimAddress('NQ07 0000')).not.toBe(normalizeNimAddress('NQ07 0001'))
  })
})

describe('topicToAddress', () => {
  test('extracts the low 20 bytes of a padded topic', () => {
    const addr = '0xc2132d05d31c914a87c6611c10748aeb04b58e8f'
    const topic = '0x' + '0'.repeat(24) + addr.slice(2)
    expect(topicToAddress(topic)).toBe(addr)
  })

  test('always returns lowercase so comparisons are safe', () => {
    const topic = '0x' + '0'.repeat(24) + 'C2132D05D31C914A87C6611C10748AEB04B58E8F'
    expect(topicToAddress(topic)).toBe('0xc2132d05d31c914a87c6611c10748aeb04b58e8f')
  })
})
