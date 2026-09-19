import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

/** A-047 — booking summary (status/vehicleData/modelData/dates/plan_type) used to seed the extend screen. */
export async function fetchExtendBookingSummary(bookingId) {
  const response = await v2Client.get(ENDPOINTS.EXTEND_BOOKING_LOOKUP(bookingId))
  return response.data ?? null
}

/**
 * A-065 — calculate the extension price. Response — read raw by the old
 * app: `{ days, minDaysToExtend, newEndDate, rentalAmountBeforeSurge,
 * surgeCharge, penalty, adjustedDiscount, totalAmount, status, ... }`.
 */
export async function calculateExtend({ bookingId, days, extendForMonth, adjustedDiscount }) {
  const response = await v2Client.post(ENDPOINTS.EXTEND_CALCULATE, {
    bookingId,
    days,
    extendForMonth,
    adjustedDiscount,
  })
  return response.data
}

/** A-066 — create the extend order from a calculated `extendResponse`. Response includes `extendId`. */
export async function createExtendOrder(extendResponse) {
  const response = await v2Client.post(ENDPOINTS.EXTEND_CREATE_ORDER, extendResponse)
  return response.data
}

/** A-067 — send a Razorpay payment link for this extension. */
export async function sendExtendPaymentLink(extendId) {
  const response = await v2Client.post(ENDPOINTS.EXTEND_SEND_PAYMENT_LINK, { extendId })
  return response.data
}

/** A-064 — send a Cashfree payment link for this extension. */
export async function sendExtendPaymentLinkCashfree(extendId) {
  const response = await v2Client.post(ENDPOINTS.EXTEND_SEND_PAYMENT_LINK_CASHFREE, { extendId })
  return response.data
}

/** A-129 — resend a payment link over SMS/WhatsApp/email. */
export async function sendPaymentLinkAlternate({ extendId, contact, method }) {
  const response = await v2Client.post(ENDPOINTS.SEND_PAYMENT_LINK_ALTERNATE, {
    bookingId: extendId,
    contact,
    method,
  })
  return response.data
}

/** A-126 — record a manually-collected cash/points/TOA payment. */
export async function verifyCashPayment({ extendId, paymentMethod, paymentId, comment }) {
  const response = await v2Client.post(ENDPOINTS.CASH_VERIFY_PAYMENT, {
    bookingId: extendId,
    paymentMethod,
    paymentId: paymentId?.length > 0 ? paymentId : null,
    comment,
  })
  return response.data
}
