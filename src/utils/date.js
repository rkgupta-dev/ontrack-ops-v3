/** Whether a date (any parseable string) is in the past — used for the
 * various "RC/Insurance/Permit/PUCC Expired" badges across the Vehicles
 * domain (VehicleDetailPage.vue, RemindersPage.vue), ported from the old
 * app's repeated `moment().isAfter(moment(date))` pattern. A falsy/
 * unparseable date is treated as not-expired rather than throwing. */
export function isExpired(dateStr) {
  if (!dateStr) return false
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return false
  return date <= new Date()
}

/** ISO calendar date (YYYY-MM-DD) for "today", in the browser's local time.
 * ASSUMPTION: the date format /attendance (A-003) expects isn't documented;
 * ISO-8601 date-only is the most conventional default. */
export function todayIsoDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Adds `days` to an ISO date string (YYYY-MM-DD), returning an ISO date
 * string — ported from the old app's `moment(startDate).add(days, 'days')`
 * pattern (e.g. assignVehicle2.vue's plan-type-driven end-date default).
 * Does the arithmetic entirely in UTC (both parsing and re-serializing) so
 * it's not off by a day in timezones behind UTC — parsing "YYYY-MM-DDT00:00:00"
 * as local time, then re-serializing via toISOString() (UTC), would shift
 * the date backwards there. */
export function addDaysIso(isoDate, days) {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * Combines a date + time input (assumed entered as IST wall-clock time,
 * matching the agent's real timezone) into the naive UTC "YYYY-MM-DD HH:mm"
 * string several payment-related payloads expect — ported from the old
 * app's repeated `moment(...).subtract(5,'hours').subtract(30,'minutes')`
 * pattern (collectionList.vue, modifyBooking.vue, UpdateDeliveryTypeModal.vue
 * all did this identically for `paymentReceivedOn`). IST is UTC+5:30, so
 * subtracting that converts the wall-clock reading to its UTC equivalent.
 */
export function toPaymentReceivedOn(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute))
  date.setUTCMinutes(date.getUTCMinutes() - 330) // 5h30m
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
}

/** Formats a timestamp for display; returns a fallback for missing/invalid input. */
export function formatTime(value, fallback = '—') {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function ordinalSuffix(day) {
  if (day >= 11 && day <= 13) return 'th'
  switch (day % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

/** "September 7th 2026, 01:28 pm" — full date with an ordinal day suffix. */
export function formatFullDate(value, fallback = '—') {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  const month = date.toLocaleDateString(undefined, { month: 'long' })
  const day = date.getDate()
  const year = date.getFullYear()
  const time = date
    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    .toLowerCase()
  return `${month} ${day}${ordinalSuffix(day)} ${year}, ${time}`
}

/** "Jul 29, 2024" — short calendar date, no time (profile DOB/agent-since). */
export function formatDateOnly(value, fallback = '—') {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** "Sep 18, 2026 2:38 PM" — short date + time (attendance punch in/out display). */
export function formatDateTime(value, fallback = '—') {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  const datePart = date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  const timePart = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${datePart} ${timePart}`
}

/** "25 minutes ago" / "3 hours ago" / "2 days ago" — relative to now. */
export function formatRelativeTime(value, fallback = '—') {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback

  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'

  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, secondsInUnit] of units) {
    const count = Math.floor(seconds / secondsInUnit)
    if (count >= 1) return `${count} ${unit}${count === 1 ? '' : 's'} ago`
  }
  return fallback
}
