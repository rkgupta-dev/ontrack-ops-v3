import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'
import { extractRows, extractTotal } from '../../utils/listResponse'

/**
 * A-049 — POST operations/create/customer
 *
 * CONFIRMED live 2026-09-18 (real payload/response). Throws if the
 * backend reports failure (`error !== 0`) so callers can rely on a
 * resolved promise meaning success, same convention as the rest of this
 * API layer.
 */
export async function createCustomer({
  fName,
  lName,
  mobile,
  email,
  alternateNo,
  gender,
  state,
  city,
  pincode,
  address,
}) {
  const response = await v2Client.post(ENDPOINTS.CREATE_CUSTOMER, {
    fName,
    lName,
    mobile,
    email,
    alternateNo: alternateNo || undefined,
    gender: gender || undefined,
    state: state || undefined,
    city: city || undefined,
    pincode: pincode || undefined,
    address: address || undefined,
  })
  if (response.data?.error) {
    throw new Error(response.data?.message || 'Could not create customer.')
  }
  return response.data
}

/**
 * A-058 — POST operations/getCustomerList
 *
 * `status` is one of the documented body fields — used here to drive the
 * Active/Halt filter. `offset` isn't documented for this endpoint (only
 * `limit` is) — paired with `limit` here as the same pagination pattern
 * used elsewhere in this API (e.g. A-050) — ASSUMPTION, verify with backend.
 *
 * Response envelope IS documented: `data.count`, `data.rows`. Row shape
 * CONFIRMED live 2026-09-18 (real payload) — see stores/customers.store.js.
 */
export async function fetchCustomers({ page = 1, limit = 25, searchTerm = '', status } = {}) {
  const response = await v2Client.post(
    ENDPOINTS.CUSTOMERS_LIST,
    { searchTerm: searchTerm || undefined, status },
    { params: { limit, offset: (page - 1) * limit } },
  )
  const rows = extractRows(response.data)
  return { rows, total: extractTotal(response.data, rows) }
}

/**
 * A-058, filtered by `customerId` — CONFIRMED live 2026-09-18: sending
 * `customerId` in the body (also documented, alongside `searchTerm`/
 * `status`) returns that one customer's full record (incl. nested
 * `dlData`/`agentActivities`/`aadharData`) in the same `{ count, rows }`
 * envelope as the list. Used for the customer detail page instead of
 * A-051 (`GET /operations/customer/:id`, response never captured).
 */
export async function fetchCustomerById(customerId) {
  const response = await v2Client.post(ENDPOINTS.CUSTOMERS_LIST, { customerId })
  const rows = extractRows(response.data)
  return rows[0] ?? null
}

/**
 * A-045 — POST operations/getBookingList — the Customer Detail "Booking
 * History" tab.
 *
 * CONFIRMED live 2026-09-18 (real payload): body `{ searchTerm, status,
 * paymentStatus }`, response `{ count, rows }`, each row embedding
 * `customerData`/`vehicleData.modelData`. The capture didn't include a
 * `customerId` filter — ASSUMPTION: sent here anyway, since every sibling
 * customer-scoped endpoint in this API (A-050/A-063/A-090/A-119) takes
 * `customerId` — verify this one actually narrows results server-side
 * rather than being ignored. `offset` isn't documented (only `limit` is)
 * — same pagination-pattern assumption as `fetchCustomers` above.
 */
export async function fetchCustomerBookings({
  customerId,
  page = 1,
  limit = 10,
  searchTerm = '',
  statusFilter = null,
} = {}) {
  const response = await v2Client.post(
    ENDPOINTS.CUSTOMER_BOOKING_HISTORY,
    { customerId, searchTerm: searchTerm || undefined, ...statusFilter },
    { params: { limit, offset: (page - 1) * limit } },
  )
  const rows = extractRows(response.data)
  return { rows, total: extractTotal(response.data, rows) }
}

/**
 * A-090 — GET operations/points-ledger — the Customer Detail "Points
 * History" tab.
 *
 * CONFIRMED live 2026-09-18 (real payload): query `{ customerId, limit,
 * offset }`, response `{ count, rows }`. Row: `id`, `bookingId`,
 * `subscriptionId`, `customer`, `transactionType` ("credit"/"debit"),
 * `value`, `status`, `description`, `createdAt`, `updatedAt`.
 */
export async function fetchCustomerPoints({ customerId, page = 1, limit = 10 } = {}) {
  const response = await v2Client.get(ENDPOINTS.CUSTOMER_POINTS_LEDGER, {
    params: { customerId, limit, offset: (page - 1) * limit },
  })
  const rows = extractRows(response.data)
  return { rows, total: extractTotal(response.data, rows) }
}

/**
 * A-050 — GET operations/customer-activities — the Customer Detail
 * "Activities History" tab.
 *
 * CONFIRMED live 2026-09-18 (real payload): query `{ customerId, limit,
 * offset }`, response `{ count, rows }`. Row: `id`, `customerId`,
 * `description`, `type` (e.g. "blacklist"), `createdAt`, `updatedAt`.
 */
export async function fetchCustomerActivities({ customerId, page = 1, limit = 10 } = {}) {
  const response = await v2Client.get(ENDPOINTS.CUSTOMER_ACTIVITIES, {
    params: { customerId, limit, offset: (page - 1) * limit },
  })
  const rows = extractRows(response.data)
  return { rows, total: extractTotal(response.data, rows) }
}

/**
 * A-015 — GET attribution/anonymous/:customerId — the Customer Detail
 * "Traffic Attribution" tab.
 *
 * CONFIRMED live 2026-09-18 (real payload): no query params, response
 * `{ success, total, data }` (handled by extractRows/extractTotal's
 * `data`/`total` fallbacks). Row: `id`, `anonId`, `attributionType`
 * ("last_touch"/"first_touch"), `status` ("conversion_pending"/...),
 * `source`, `medium`, `campaign`, `platform`, `bookingId`, `attributedAt`,
 * `createdAt`. Not paginated — returns every row at once.
 */
export async function fetchCustomerTrafficAttribution(customerId) {
  const response = await v2Client.get(ENDPOINTS.CUSTOMER_TRAFFIC_ATTRIBUTION(customerId))
  const rows = extractRows(response.data)
  return { rows, total: extractTotal(response.data, rows) }
}
