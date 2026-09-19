/**
 * Booking status → label/color, ported from the old app's
 * `AllBookingDetailsV2.vue::getStatusVariant()` (the most complete of 4
 * divergent inline copies found across the old codebase) — a real backend
 * enum was never documented in docs/api-reference.md, so treat this as the
 * best available evidence rather than a confirmed contract.
 *
 * Shared here (rather than duplicated) so the booking status chip and the
 * Customer Detail "Booking History" tab's status filter pills stay in
 * sync — labels tweaked slightly for the filter-pill wording confirmed
 * live 2026-09-18 ("Ongoing"/"Completed" rather than "Active"/"Complete").
 */
export const BOOKING_STATUS_META = {
  0: { label: 'Upcoming', color: 'primary' },
  1: { label: 'Ongoing', color: 'success' },
  2: { label: 'Completed', color: 'warning' },
  3: { label: 'Expired', color: 'error' },
  4: { label: 'Under Service', color: 'primary' },
  5: { label: 'Water Wash', color: 'primary' },
  6: { label: 'Returned', color: 'primary' },
  10: { label: 'Cancelled', color: 'error' },
}

/** A booking whose payment didn't go through reads as "Failed" regardless
 * of its own status code — ported as-is from the old app. */
export function getBookingStatusMeta(status, paymentStatus) {
  if (paymentStatus !== null && paymentStatus !== undefined && paymentStatus !== 1) {
    return { label: 'Failed', color: 'error' }
  }
  return BOOKING_STATUS_META[status] ?? { label: 'Unknown', color: 'secondary' }
}

/**
 * The 6 filter pills on the Customer Detail "Booking History" tab
 * (confirmed live 2026-09-18) — a curated subset/ordering of the map
 * above, sent to A-045 as `{ status }` (or `{ paymentStatus: 0 }` for
 * "Failed" — ASSUMPTION: only `paymentStatus: 1` = success is confirmed;
 * `0` for "failed" specifically, rather than "anything but 1", is a guess
 * at a single representative value since the filter takes one value, not
 * a "not equal" expression — verify with a real failed booking).
 *
 * `color` is additive (not read by BookingHistoryTab.vue, which only uses
 * `key`/`label`/`body`) — added so this same curated 5/6-status list can
 * also back the Bookings list page's Status filter and list-card badge
 * (BookingsPage.vue / BookingListCard.vue), which need this array's
 * "Active" wording for status `1` rather than BOOKING_STATUS_META's
 * "Ongoing" above.
 */
export const BOOKING_HISTORY_FILTERS = [
  { key: 'upcoming', label: 'Upcoming', body: { status: 0 }, color: 'warning' },
  { key: 'active', label: 'Active', body: { status: 1 }, color: 'success' },
  { key: 'expired', label: 'Expired', body: { status: 3 }, color: 'error' },
  { key: 'completed', label: 'Completed', body: { status: 2 }, color: 'primary' },
  { key: 'cancelled', label: 'Cancelled', body: { status: 10 }, color: 'error' },
  { key: 'failed', label: 'Failed', body: { paymentStatus: 0 }, color: 'error' },
]

/** Looks up a booking's list-card status badge (label/color) by numeric
 * `status` among BOOKING_HISTORY_FILTERS' status-keyed entries (all but
 * "failed", whose filter body keys on `paymentStatus` instead). */
export function getBookingListStatusMeta(status) {
  const match = BOOKING_HISTORY_FILTERS.find((f) => f.body.status === status)
  return match
    ? { label: match.label, color: match.color }
    : { label: 'Unknown', color: 'secondary' }
}
