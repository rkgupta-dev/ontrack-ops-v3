/**
 * Client-side CSV/JSON export — a dependency-free replacement for the old
 * app's `xlsx` (SheetJS) based export. Deliberately does NOT add xlsx back:
 * that package has 2 unpatched high-severity advisories (prototype
 * pollution, ReDoS) with "no fix available" — the old app ships it anyway,
 * but there's no reason to bring an unpatched dependency into this repo
 * when CSV/JSON cover the same real need (Excel opens CSV natively; a true
 * .xlsx binary isn't actually required).
 */

function toCsvValue(value) {
  const str = value === null || value === undefined ? '' : String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function rowsToCsv(rows) {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((key) => toCsvValue(row[key])).join(','))
  }
  return lines.join('\n')
}

function downloadBlob(content, mimeType, filename) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Headerless 2-D rows (e.g. a multi-section report) → escaped CSV download. */
export function exportCsvLines(lines, filenameBase) {
  const csv = lines.map((line) => line.map(toCsvValue).join(',')).join('\n')
  downloadBlob(csv, 'text/csv', `${filenameBase}.csv`)
}

export function exportRows(rows, format, filenameBase) {
  if (format === 'json') {
    downloadBlob(JSON.stringify(rows, null, 2), 'application/json', `${filenameBase}.json`)
  } else {
    downloadBlob(rowsToCsv(rows), 'text/csv', `${filenameBase}.csv`)
  }
}
