import { describe, it, expect } from 'vitest'
import { firstPresent, lessorName } from '../../src/utils/fields'

describe('firstPresent', () => {
  it('returns the value of the first candidate field that is present', () => {
    expect(firstPresent({ name: 'Ann', fullName: 'Ann Lee' }, ['fullName', 'name'])).toBe('Ann Lee')
  })

  it('skips candidates that are null, undefined, or empty string', () => {
    expect(firstPresent({ a: null, b: '', c: 'value' }, ['a', 'b', 'c'])).toBe('value')
  })

  it('resolves dot-path candidates against nested objects', () => {
    expect(firstPresent({ customer: { name: 'Ann' } }, ['customer.name'])).toBe('Ann')
  })

  it('does not throw when a dot-path parent is missing', () => {
    expect(firstPresent({}, ['customer.name'])).toBeNull()
  })

  it('returns the fallback when no candidate matches', () => {
    expect(firstPresent({}, ['a', 'b'], 'unknown')).toBe('unknown')
  })
})

describe('lessorName', () => {
  it('returns the name when present', () => {
    expect(lessorName({ id: 2, name: 'TRADENET PRIME' })).toBe('TRADENET PRIME')
  })

  it('reads "Unknown" for a lessor with a null or blank name', () => {
    expect(lessorName({ id: 40, name: null })).toBe('Unknown')
    expect(lessorName({ id: 41, name: '  ' })).toBe('Unknown')
  })

  it('returns the fallback when there is no lessor record', () => {
    expect(lessorName(null)).toBeNull()
    expect(lessorName(undefined, '—')).toBe('—')
  })
})
