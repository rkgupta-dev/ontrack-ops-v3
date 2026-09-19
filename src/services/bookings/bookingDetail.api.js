import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

/**
 * A-046 — POST /operations/getBookings, filtered by `{ bookingId }` instead
 * of the Home-feed filter (see services/home/home.api.js). Response is a
 * bare array — CONFIRMED live 2026-09-07, same row shape as the Home feed
 * (customerData/vehicleData/modelData/locationData/recoveryData embedded).
 * Returns the single matching booking, or null if none was found.
 */
export async function fetchBookingDetail(bookingId) {
  const response = await v2Client.post(ENDPOINTS.BOOKING_DETAIL, { bookingId })
  const rows = Array.isArray(response.data) ? response.data : []
  return rows[0] ?? null
}

/** A-025 — cancel a booking, capturing refund details. */
export async function cancelBooking(id, { source, refundId, amount, comment }) {
  const response = await v2Client.post(ENDPOINTS.BOOKING_CANCEL(id), {
    source,
    refundId,
    amount,
    comment: `Cancel Booking - ${comment ?? ''}`,
  })
  return response.data
}

/** A-031 — reinitiate a cancelled/ended booking. */
export async function reinitiateBooking(bookingId, description) {
  const response = await v2Client.post(ENDPOINTS.BOOKING_REINITIATE(bookingId), { description })
  return response.data
}

/** A-139 — add this booking's vehicle to the recovery list. */
export async function addToRecovery(bookingDbId, { comment, address }) {
  const response = await v2Client.post(ENDPOINTS.BOOKING_ADD_TO_RECOVERY(bookingDbId), {
    comment: `Add Vehicle to Recovery - ${comment}`,
    address,
  })
  return response.data
}

/** A-140 — remove from the recovery list (id is the recovery record's own id). */
export async function removeFromRecovery(recoveryId) {
  const response = await v2Client.post(ENDPOINTS.BOOKING_REMOVE_FROM_RECOVERY(recoveryId))
  return response.data
}

/** A-130 — reconcile a manually-confirmed Razorpay order/payment. */
export async function updatePayment(bookingId, orderId) {
  const response = await v2Client.post(ENDPOINTS.BOOKING_UPDATE_PAYMENT, {
    bookingId,
    order_id: orderId,
  })
  return response.data
}

/** A-148 — set a customer's outstanding penalty for this booking. */
export async function updatePenalty(customerId, bookingId, penaltyCharge) {
  const response = await v2Client.put(ENDPOINTS.CUSTOMER_PENALTY_UPDATE(customerId), {
    customerId,
    bookingId,
    penaltyCharge,
  })
  return response.data
}

/**
 * A-023 — change delivery/pickup type + location/address, optionally with
 * an attached payment/refund entry (the `payment` object, or `null` when
 * the transaction type is "Not Applicable" — mirrors the old app's
 * UpdateDeliveryTypeModal.vue).
 */
export async function updateDeliveryType(payload) {
  const response = await v2Client.put(ENDPOINTS.BOOKING_UPDATE_DELIVERY, payload)
  return response.data
}

/** A-103 — pickup locations available for a given model. */
export async function fetchModelLocations(modelId) {
  const response = await v2Client.get(ENDPOINTS.MODEL_LOCATIONS(modelId))
  return Array.isArray(response.data?.data) ? response.data.data : []
}

/**
 * A-044 — the pre/post-booking image + KM line item (Images tab). Response
 * read raw by the old app (no envelope) — returns null if none exists yet
 * (booking not assigned a vehicle / images not uploaded).
 */
export async function fetchBookingLineItem(bookingId) {
  const response = await v2Client.get(ENDPOINTS.BOOKING_LINE_ITEM, {
    params: { booking: bookingId },
  })
  return response.data ?? null
}
