import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

/**
 * A-046 — POST /operations/getBookings?limit=200
 *
 * Body is the fixed filter the old app's home page (`homepage-content.vue`)
 * sends: `{ status: 0, paymentStatus: 1, deliveryType: null, location: null }`
 * — confirmed 2026-09-07 from a real captured request (status 0 + paymentStatus
 * 1 reads as "booked, paid, not yet started" — the "upcoming/active bookings"
 * feed). Not parameterized here beyond that; this call is specifically the
 * Home dashboard feed, not a general-purpose bookings query.
 *
 * Response is a bare array (NOT the `{ count, rows }` envelope A-024/A-158
 * use) — confirmed live. Each row embeds `customerData`, `vehicleData`,
 * `modelData`, `locationData`, `recoveryData`.
 */
export async function fetchHomeBookingsFeed() {
  const response = await v2Client.post(
    ENDPOINTS.HOME_BOOKINGS_FEED,
    { status: 0, paymentStatus: 1, deliveryType: null, location: null },
    { params: { limit: 200 } },
  )
  return Array.isArray(response.data) ? response.data : []
}

/**
 * A-100 — GET locations
 *
 * Response is a bare array of location records (`id`, `name`, `address`,
 * coordinates, etc.) — confirmed live 2026-09-07. Used here only to resolve
 * a booking/vehicle's numeric `location` id to a display name.
 */
export async function fetchLocations() {
  const response = await v2Client.get(ENDPOINTS.LOCATIONS)
  return Array.isArray(response.data) ? response.data : []
}
