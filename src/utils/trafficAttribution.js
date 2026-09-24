/**
 * Pure helpers for the Traffic Attribution report (A-016 / A-017).
 */

/** "+75.00%" / "-14.49%" / "0.00%" — numbers or the backend's "12.34" strings. */
export function formatPercent(value, { signed = false } = {}) {
  const n = Number(value)
  const safe = Number.isFinite(n) ? n : 0
  const sign = signed && safe > 0 ? '+' : ''
  return `${sign}${safe.toFixed(2)}%`
}

export function trendColor(trend) {
  if (trend === 'up') return 'success'
  if (trend === 'down') return 'error'
  return 'medium-emphasis'
}

export const GROUPS = [
  { key: 'bySource', title: 'By Source', column: 'Source' },
  { key: 'bySourceMedium', title: 'By Medium', column: 'Source / Medium' },
  { key: 'bySourceCampaign', title: 'By Campaign', column: 'Source / Campaign' },
]

/**
 * The same multi-section CSV the old app downloaded (a Totals block, one
 * block per group, then Platform and Attribution Type), as 2-D rows for
 * `exportCsvLines`. `mode` is 'traffic' or 'value'; value mode adds the
 * per-row signup/booking conversion rates in place of the change %.
 */
export function buildReportCsvRows(stats, mode) {
  const rows = []
  const byValue = mode === 'value'
  rows.push([byValue ? 'Traffic Attribution By Value Report' : 'Traffic Attribution Report'])
  rows.push([])

  const totals = stats?.totals ?? []
  if (totals.length) {
    rows.push(['Totals'])
    rows.push(['Label', 'Count', 'Previous', 'Change %'])
    totals.forEach((t) =>
      rows.push([t.label, t.count, t.previousCount ?? '', t.changePercent ?? '']),
    )
    rows.push([])
  }

  for (const group of GROUPS) {
    const data = stats?.[group.key] ?? []
    if (!data.length) continue
    rows.push([group.title])
    if (byValue) {
      rows.push(['Label', 'Traffic', 'Signed Up', 'Signup %', 'Converted', 'Booking %'])
      data.forEach((d) =>
        rows.push([
          d.label,
          d.count,
          d.signedUp,
          Number(d.signup_conversion_rate || 0),
          d.converted,
          Number(d.booking_conversion_rate || 0),
        ]),
      )
    } else {
      rows.push(['Label', 'Traffic', 'Signed Up', 'Converted', 'Change %'])
      data.forEach((d) => rows.push([d.label, d.count, d.signedUp, d.converted, d.changePercent]))
    }
    rows.push([])
  }

  const tail = [
    ['byPlatform', 'By Platform', 'Platform'],
    ['byAttributionType', 'By Attribution Type', 'Type'],
  ]
  for (const [key, title, column] of tail) {
    const data = stats?.[key] ?? []
    if (!data.length) continue
    rows.push([title])
    rows.push([column, 'Volume'])
    data.forEach((d) => rows.push([d.label, d.count]))
    rows.push([])
  }

  return rows
}
