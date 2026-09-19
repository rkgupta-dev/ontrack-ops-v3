import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

/**
 * A-131 — GET tickets?booking=:bookingId
 *
 * Read as a raw array by the old app's Vuex `getPaymentTickets` action (no
 * envelope) — kept the same here.
 */
export async function fetchPaymentTickets(bookingId) {
  const response = await v2Client.get(ENDPOINTS.PAYMENT_TICKETS, {
    params: { booking: bookingId },
  })
  return Array.isArray(response.data) ? response.data : []
}

/** A-132 — create a payment (retrieval) ticket. */
export async function createPaymentTicket(payload) {
  const response = await v2Client.post(ENDPOINTS.PAYMENT_TICKETS, payload)
  return response.data
}
