import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

/**
 * A-119 — GET /operations/collectionPayments
 *
 * Response envelope + row shape CONFIRMED live 2026-09-18 (real payload,
 * customerId-scoped for the Customer Detail "Collection History" tab):
 * `{ rows, count, totalCreditAmount, totalDebitAmount, lifetimeValue }`.
 * Row: `id`, `bookingId`, `type` ("KM_BILL"/"extend"/"exchange"/"booking"),
 * `amount`, `source`, `transactionType` ("CREDIT"/"DEBIT"), `paymentId`,
 * `paymentReceivedOn`, plus embedded `vehicleData`/`modelData`.
 */
export async function fetchCollections({
  bookingId,
  vehicleId,
  customerId,
  page = 1,
  limit = 10,
  paymentStatus = null,
}) {
  // `collectionList.vue` (the old app's shared component) accepts any of
  // 3 scopes — `bookingId`, `vehicle` (vehicleDetails.vue's Collection
  // tab), or `customerId` (Customer Detail's Collection History tab).
  const scopeParams = customerId
    ? { customerId }
    : vehicleId
      ? { vehicle: vehicleId }
      : { bookingId }
  const response = await v2Client.get(ENDPOINTS.COLLECTIONS_LIST, {
    params: { ...scopeParams, limit, offset: (page - 1) * limit, paymentStatus },
  })
  const data = response.data ?? {}
  return {
    rows: Array.isArray(data.rows) ? data.rows : [],
    total: data.count ?? 0,
    totalCreditAmount: data.totalCreditAmount ?? 0,
    totalDebitAmount: data.totalDebitAmount ?? 0,
    lifetimeValue: data.lifetimeValue ?? 0,
  }
}

/** A-123 — add a manual collection/payment entry for a booking. */
export async function addCollection(bookingId, payload) {
  const response = await v2Client.post(ENDPOINTS.COLLECTION_ADD(bookingId), payload)
  return response.data
}
