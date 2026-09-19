import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

/**
 * A-083 — GET /operations/km-logs/bill?bookingId=
 *
 * Response: `{ success, bills }` per the old app's read — an empty list on
 * `success: false` rather than throwing, matching the old behavior.
 */
export async function fetchKmBills(bookingId) {
  const response = await v2Client.get(ENDPOINTS.KM_BILLS_LIST, { params: { bookingId } })
  return response.data?.success ? (response.data.bills ?? []) : []
}

/** A-082 — mark a KM bill as paid. */
export async function markKmBillPaid(billId, { paymentId, source, comment }) {
  const response = await v2Client.get(ENDPOINTS.KM_BILL_MARK_PAID(billId), {
    params: { paymentId, source, comment: `KM Bill Marked as Paid - ${comment ?? ''}` },
  })
  return response.data
}
