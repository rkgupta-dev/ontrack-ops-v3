import { describe, it, expect } from 'vitest'
import { customRange, presetRange, toLocalIsoDate } from '../../src/utils/dateRange'

// Thursday 24 Sep 2026, mid-afternoon local time.
const NOW = new Date(2026, 8, 24, 15, 30)

function span(range) {
  return [toLocalIsoDate(range.start), toLocalIsoDate(range.end)]
}

describe('presetRange', () => {
  it('covers the whole local day for today/yesterday', () => {
    const today = presetRange('today', NOW)
    expect(today.start).toEqual(new Date(2026, 8, 24, 0, 0, 0, 0))
    expect(today.end).toEqual(new Date(2026, 8, 24, 23, 59, 59, 999))
    expect(span(presetRange('yesterday', NOW))).toEqual(['2026-09-23', '2026-09-23'])
  })

  it('uses ISO (Monday-start) weeks', () => {
    expect(span(presetRange('this_week', NOW))).toEqual(['2026-09-21', '2026-09-27'])
    expect(span(presetRange('last_week', NOW))).toEqual(['2026-09-14', '2026-09-20'])
    // Sunday still belongs to the week that started the previous Monday.
    expect(span(presetRange('this_week', new Date(2026, 8, 27)))).toEqual([
      '2026-09-21',
      '2026-09-27',
    ])
  })

  it('handles month and year boundaries', () => {
    expect(span(presetRange('this_month', NOW))).toEqual(['2026-09-01', '2026-09-30'])
    expect(span(presetRange('last_month', NOW))).toEqual(['2026-08-01', '2026-08-31'])
    expect(span(presetRange('last_month', new Date(2026, 0, 10)))).toEqual([
      '2025-12-01',
      '2025-12-31',
    ])
    expect(span(presetRange('this_year', NOW))).toEqual(['2026-01-01', '2026-12-31'])
    expect(span(presetRange('last_year', NOW))).toEqual(['2025-01-01', '2025-12-31'])
  })

  it('returns null for custom / unknown presets', () => {
    expect(presetRange('custom', NOW)).toBeNull()
    expect(presetRange('nope', NOW)).toBeNull()
  })
})

describe('customRange', () => {
  it('spans start-of-day to end-of-day', () => {
    const r = customRange('2026-09-01', '2026-09-24')
    expect(r.start).toEqual(new Date(2026, 8, 1))
    expect(r.end).toEqual(new Date(2026, 8, 24, 23, 59, 59, 999))
  })

  it('rejects invalid or reversed input', () => {
    expect(customRange('2026-09-24', '2026-09-01')).toBeNull()
    expect(customRange('', '2026-09-01')).toBeNull()
    expect(customRange('24/09/2026', '2026-09-30')).toBeNull()
  })
})
