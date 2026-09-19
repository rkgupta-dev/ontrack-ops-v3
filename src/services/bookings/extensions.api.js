import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

/**
 * A-063 — GET /operations/extensionPayments
 *
 * Takes either `bookingId` (booking detail's Extensions tab) or
 * `customerId` (Customer Detail's "Extension History" tab, response
 * CONFIRMED live 2026-09-18) — both are documented query params on the
 * same endpoint. Response envelope: `{ rows, count }`. Row fields:
 * `bookingId`, `extendId`, `orderId`, `paymentId`, `amount`,
 * `rentalAmount`, `paymentStatus`, `paymentMessage`, `currentEndDate`,
 * `newEndDate`, `noOfDays`, `comment`, `source`, `createdAt`.
 */
export async function fetchExtensions({ bookingId, customerId, page = 1, limit = 10 } = {}) {
  const response = await v2Client.get(ENDPOINTS.EXTENSIONS_LIST, {
    params: { bookingId, customerId, limit, offset: (page - 1) * limit },
  })
  const data = response.data ?? {}
  return { rows: Array.isArray(data.rows) ? data.rows : [], total: data.count ?? 0 }
}

/** A-062 — one extension's full detail, shown in a row-click dialog. */
export async function fetchExtensionDetail(extendId) {
  const response = await v2Client.get(ENDPOINTS.EXTENSION_DETAIL(extendId))
  return response.data
}
