import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

/** A-060 — search for a customer by phone number. Response read raw (bare array) by the old app. */
export async function searchCustomerByPhone(phone) {
  const response = await v2Client.get(ENDPOINTS.SEARCH_CUSTOMER_BY_PHONE(phone))
  return Array.isArray(response.data) ? response.data : []
}

/**
 * A-046 (same endpoint as home/booking-detail fetches, different filter) —
 * a customer's booking history, ordered by status ascending (matches the
 * old app's `_.orderBy(data, 'status', 'asc')`), for the "already booked?"
 * eligibility check and the history list under the Manual flow.
 */
export async function fetchCustomerBookingHistory(customerId) {
  const response = await v2Client.post(
    ENDPOINTS.BOOKING_DETAIL,
    { customer: customerId, paymentStatus: 1 },
    { params: { limit: 40 } },
  )
  const rows = Array.isArray(response.data) ? response.data : []
  return [...rows].sort((a, b) => (a.status ?? 0) - (b.status ?? 0))
}

/** A-094 — delivery charge lookup, used for the Manual flow's delivery-charge line item. */
export async function fetchDeliveryCharges() {
  const response = await v2Client.get(ENDPOINTS.DELIVERY_CHARGE)
  return response.data
}

/** A-101 — addon/merchandise list, shared by both create-booking flows. */
export async function fetchAddons() {
  const response = await v2Client.get(ENDPOINTS.MERCHANDISE)
  return Array.isArray(response.data?.rows) ? response.data.rows : []
}

/** A-124 — "Old (Manual)" flow's booking submission. */
export async function submitManualBooking(payload) {
  const response = await v2Client.post(ENDPOINTS.BOOKING_ORDER_MANUAL, payload)
  return response.data
}

/**
 * A-127 — "New (Dynamic)" flow's booking submission. Response:
 * `{ data: { bookingId, modelPrice, addOnsCharge, deliveryCharge, penalty,
 * adjustedDiscount, payable, ... } }`.
 *
 * NOTE: the old app (bookingForm.vue) hardcodes `test: true` in this
 * payload on every real submission — a leftover debug flag, not a real
 * business requirement (it's almost certainly why so many real bookings in
 * this backend have "TEST-"-prefixed ids). Deliberately NOT ported — see
 * docs/api-inventory.csv A-127 notes and the migration-plan memory note.
 */
export async function submitDynamicBooking(payload) {
  const response = await v2Client.post(ENDPOINTS.BOOKING_CREATE_ORDER, payload)
  return response.data?.data
}
