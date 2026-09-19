import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

/** A-118 — send a Cashfree payment link for a fresh (not-yet-paid) booking. */
export async function sendBookingPaymentLinkCashfree(bookingId) {
  const response = await v2Client.post(ENDPOINTS.BOOKING_PAYMENT_LINK_CASHFREE, { bookingId })
  return response.data
}

/**
 * A-128 — send/generate a Razorpay payment link for a fresh booking.
 * Response: `data.data.paymentLink` — used both to text the customer a
 * link and, for the "Pay through Razorpay" option, to open the same link
 * directly for an agent-assisted in-person payment.
 */
export async function sendBookingPaymentLinkRazorpay(bookingId) {
  const response = await v2Client.post(ENDPOINTS.BOOKING_PAYMENT_LINK_RAZORPAY, { bookingId })
  return response.data
}
