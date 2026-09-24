import { describe, it, expect } from 'vitest'
import { buildReportCsvRows, formatPercent } from '../../src/utils/trafficAttribution'

describe('formatPercent', () => {
  it('formats numbers and numeric strings to 2dp', () => {
    expect(formatPercent(-14.49)).toBe('-14.49%')
    expect(formatPercent('12.3')).toBe('12.30%')
    expect(formatPercent(null)).toBe('0.00%')
  })

  it('prefixes a + only when signed and positive', () => {
    expect(formatPercent(75, { signed: true })).toBe('+75.00%')
    expect(formatPercent(-5, { signed: true })).toBe('-5.00%')
    expect(formatPercent(0, { signed: true })).toBe('0.00%')
  })
})

const stats = {
  totals: [{ label: 'Traffic', count: 531, previousCount: 621, changePercent: -14.49 }],
  bySource: [
    {
      label: 'direct',
      count: 407,
      signedUp: 39,
      converted: 1,
      changePercent: -5.13,
      signup_conversion_rate: '9.58',
      booking_conversion_rate: '0.25',
    },
  ],
  bySourceMedium: [],
  byPlatform: [{ label: 'web', count: 453 }],
}

describe('buildReportCsvRows', () => {
  it('builds the traffic report sections, skipping empty groups', () => {
    const rows = buildReportCsvRows(stats, 'traffic')
    expect(rows[0]).toEqual(['Traffic Attribution Report'])
    expect(rows).toContainEqual(['Traffic', 531, 621, -14.49])
    expect(rows).toContainEqual(['direct', 407, 39, 1, -5.13])
    expect(rows).toContainEqual(['web', 453])
    expect(rows.flat()).not.toContain('By Medium')
  })

  it('uses conversion-rate columns in value mode', () => {
    const rows = buildReportCsvRows(stats, 'value')
    expect(rows[0]).toEqual(['Traffic Attribution By Value Report'])
    expect(rows).toContainEqual(['direct', 407, 39, 9.58, 1, 0.25])
  })
})
