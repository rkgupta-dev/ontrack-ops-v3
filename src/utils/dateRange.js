/**
 * Date-range presets for report pages — replaces the old app's
 * `vue2-daterange-picker` `ranges` (Today … Last Year, ISO weeks starting
 * Monday). All boundaries are in the browser's local time: start-of-day
 * for `start`, end-of-day (23:59:59.999) for `end`, matching the old app's
 * `moment().startOf('day')` / `endOf('day')` epoch-ms params.
 */

export const DATE_RANGE_PRESETS = [
  { title: 'Today', value: 'today' },
  { title: 'Yesterday', value: 'yesterday' },
  { title: 'This Week', value: 'this_week' },
  { title: 'Last Week', value: 'last_week' },
  { title: 'This Month', value: 'this_month' },
  { title: 'Last Month', value: 'last_month' },
  { title: 'This Year', value: 'this_year' },
  { title: 'Last Year', value: 'last_year' },
  { title: 'Custom', value: 'custom' },
]

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

/** Monday of the ISO week containing `date`. */
function startOfIsoWeek(date) {
  const offset = (date.getDay() + 6) % 7 // Mon=0 … Sun=6
  return addDays(date, -offset)
}

/** `{ start, end }` Dates for a preset, or null for unknown / 'custom'. */
export function presetRange(preset, now = new Date()) {
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (preset) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) }
    case 'yesterday': {
      const d = addDays(now, -1)
      return { start: startOfDay(d), end: endOfDay(d) }
    }
    case 'this_week': {
      const mon = startOfIsoWeek(now)
      return { start: mon, end: endOfDay(addDays(mon, 6)) }
    }
    case 'last_week': {
      const mon = addDays(startOfIsoWeek(now), -7)
      return { start: mon, end: endOfDay(addDays(mon, 6)) }
    }
    case 'this_month':
      return { start: new Date(y, m, 1), end: endOfDay(new Date(y, m + 1, 0)) }
    case 'last_month':
      return { start: new Date(y, m - 1, 1), end: endOfDay(new Date(y, m, 0)) }
    case 'this_year':
      return { start: new Date(y, 0, 1), end: endOfDay(new Date(y, 11, 31)) }
    case 'last_year':
      return { start: new Date(y - 1, 0, 1), end: endOfDay(new Date(y - 1, 11, 31)) }
    default:
      return null
  }
}

function parseIsoDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '')
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

/** `{ start, end }` from two 'YYYY-MM-DD' strings (local), or null if invalid/reversed. */
export function customRange(fromIso, toIso) {
  const from = parseIsoDate(fromIso)
  const to = parseIsoDate(toIso)
  if (!from || !to || from > to) return null
  return { start: startOfDay(from), end: endOfDay(to) }
}

/** Local 'YYYY-MM-DD' for a Date (for native date inputs / URL params). */
export function toLocalIsoDate(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
