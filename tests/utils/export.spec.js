import { describe, it, expect } from 'vitest'
import { rowsToCsv } from '../../src/utils/export'

describe('rowsToCsv', () => {
  it('returns an empty string for no rows', () => {
    expect(rowsToCsv([])).toBe('')
  })

  it("builds a header row from the first row's keys", () => {
    const csv = rowsToCsv([{ a: 1, b: 2 }])
    expect(csv).toBe('a,b\n1,2')
  })

  it('quotes and escapes values containing commas, quotes, or newlines', () => {
    const csv = rowsToCsv([{ name: 'Ontrack, Inc.', note: 'says "hi"\nagain' }])
    expect(csv).toBe('name,note\n"Ontrack, Inc.","says ""hi""\nagain"')
  })

  it('renders null/undefined values as empty', () => {
    const csv = rowsToCsv([{ a: null, b: undefined }])
    expect(csv).toBe('a,b\n,')
  })
})
