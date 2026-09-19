import { describe, it, expect } from 'vitest'
import { extractRows, extractTotal } from '../../src/utils/listResponse'

describe('extractRows', () => {
  it('returns a bare array response as-is', () => {
    expect(extractRows([{ id: 1 }])).toEqual([{ id: 1 }])
  })

  it('reads data.rows when present', () => {
    expect(extractRows({ rows: [{ id: 1 }], count: 1 })).toEqual([{ id: 1 }])
  })

  it('reads data.data when rows is absent', () => {
    expect(extractRows({ data: [{ id: 1 }] })).toEqual([{ id: 1 }])
  })

  it('falls back to an empty array for an unrecognized shape', () => {
    expect(extractRows({ unexpected: true })).toEqual([])
    expect(extractRows(null)).toEqual([])
  })
})

describe('extractTotal', () => {
  it('reads data.count when present', () => {
    expect(extractTotal({ count: 42 }, [])).toBe(42)
  })

  it('reads data.total when count is absent', () => {
    expect(extractTotal({ total: 7 }, [])).toBe(7)
  })

  it('falls back to the row count when no total field is present', () => {
    expect(extractTotal({}, [{ id: 1 }, { id: 2 }])).toBe(2)
  })
})
