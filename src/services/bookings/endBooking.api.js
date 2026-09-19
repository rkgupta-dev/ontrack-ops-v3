import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

/** A-086 — pending/unbilled KM usage that must be resolved before ending (Step 1). */
export async function fetchPendingKmBills(bookingId) {
  const response = await v2Client.get(ENDPOINTS.KM_BILLS_PENDING_SUMMARY(bookingId))
  return response.data?.pending ?? []
}

/** A-085 — create a bill for a pending/unbilled usage item. */
export async function createPendingKmBill(bookingId) {
  const response = await v2Client.post(ENDPOINTS.KM_BILL_CREATE_PENDING(bookingId))
  return response.data
}

/** A-022 — send the customer a link to generate/re-generate their drop PIN (Step 2). */
export async function sendPinGenerationLink(bookingId) {
  const response = await v2Client.post(ENDPOINTS.SEND_PIN_GENERATION_LINK, { bookingId })
  return response.data
}

/** A-048 — post-booking KM reading + comment (Step 3). */
export async function updatePostBookingData(lineItemId, { postKm, postComment }) {
  const response = await v2Client.put(ENDPOINTS.BOOKING_LINE_ITEM_UPDATE(lineItemId), {
    postKm,
    postComment: `Post Booking Comment - ${postComment ?? ''}`,
  })
  return response.data
}

/** A-033 — mandatory post-booking image upload (Step 4). */
export async function uploadMandatoryImage(lineItemId, file, imageType) {
  const fd = new FormData()
  fd.append('image', file)
  fd.append('type', imageType)
  const response = await v2Client.post(ENDPOINTS.UPLOAD_MANDATORY_IMAGE(lineItemId), fd)
  return response.data
}

/** A-056 — penalty adjustment (Step 5) — a different real call shape than bookingDetail.api.js's A-148 flow. */
export async function updateCustomerPenalty(customerId, penaltyCharge) {
  const response = await v2Client.post(ENDPOINTS.END_BOOKING_UPDATE_PENALTY(customerId), {
    penaltyCharge,
  })
  return response.data
}

/**
 * A-070 — traffic violations for a booking (Step 6).
 *
 * NOTE: the old app's Vuex action for this call overrides the request's
 * Authorization header with a hardcoded LEGACY Basic-auth constant, even
 * though this is a v2 (glacier) endpoint the doc otherwise confirms uses
 * normal Bearer auth — almost certainly a copy-paste artifact, not a real
 * requirement. Deliberately NOT replicated; this uses the standard
 * Bearer-token v2Client like every other endpoint in this file.
 */
export async function fetchTrafficViolations(bookingId) {
  const response = await v2Client.post(ENDPOINTS.TRAFFIC_VIOLATIONS, { bookingId })
  return Array.isArray(response.data) ? response.data : []
}

/** A-026 — the terminal end-booking submission (Step 9). Response: `{ error, message }`. */
export async function submitEndBooking(payload) {
  const response = await v2Client.post(ENDPOINTS.END_BOOKING, payload)
  return response.data
}
