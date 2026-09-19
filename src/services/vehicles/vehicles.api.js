import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'
import { extractRows, extractTotal } from '../../utils/listResponse'

/**
 * A-158 — GET /operations/vehicles
 *
 * Same reasoning as bookings.api.js::fetchBookings — this is the exact
 * endpoint the old app's vehicles list page (`views/vehicles/vehiclesList.vue`)
 * calls via `throttledGetFleets()`. `statuses`/`models`/`lessors`/
 * `manufactureDate`/`locations`/`sortOrder` are now wired too, confirmed
 * against that page's real param shape (all arrays, `sortOrder` a
 * `[field, direction]` pair) rather than left out — the earlier version of
 * this function only sent `searchQuery`/`limit`/`offset` to avoid
 * inventing values before the real shapes were confirmed.
 *
 * Response envelope is NOT documented — see utils/listResponse.js. Row
 * field names are also unconfirmed — see stores/vehicles.store.js.
 */
export async function fetchVehicles({
  page = 1,
  limit = 25,
  searchQuery = '',
  statuses = [],
  models = [],
  lessors = [],
  locations = [],
  manufactureDate = [],
  sortOrder = ['createdAt', 'DESC'],
} = {}) {
  const response = await v2Client.get(ENDPOINTS.VEHICLES_LIST, {
    params: {
      limit,
      offset: (page - 1) * limit,
      searchQuery: searchQuery || undefined,
      statuses,
      models,
      lessors,
      locations,
      manufactureDate,
      sortOrder,
    },
  })
  const rows = extractRows(response.data)
  return { rows, total: extractTotal(response.data, rows) }
}

/** A-107 — model list, for the filter's model options. Response: `{ rows, count }`. */
export async function fetchModelOptions() {
  const response = await v2Client.get(ENDPOINTS.MODELS_LIST)
  const rows = Array.isArray(response.data?.rows) ? response.data.rows : []
  return rows.map((row) => ({ title: row.name, value: row.id }))
}

/** A-089 — lessor list, for the filter's lessor options. Response: bare array. */
export async function fetchLessorOptions() {
  const response = await v2Client.get(ENDPOINTS.LESSORS_LIST)
  const rows = Array.isArray(response.data) ? response.data : []
  return rows.map((row) => ({ title: row.name, value: row.id }))
}

/**
 * A-159 — vehicles with an expired RC/insurance/permit/PUCC, for the
 * Reminders page. `expiryType` is one of 'rc'/'insurance'/'permit'/'pucc'
 * (only one flag is ever `1` at a time, matching the old app's single-select
 * radio filter). Response is `{ total, data }` — a different envelope shape
 * than every other list endpoint in this app (`{ count, rows }`), ported
 * exactly as observed rather than normalized to match.
 */
export async function fetchExpiredVehicles({ expiryType, limit = 100, offset = 0 } = {}) {
  const response = await v2Client.get(ENDPOINTS.VEHICLES_EXPIRED, {
    params: {
      limit,
      offset,
      rc_expired: expiryType === 'rc' ? 1 : 0,
      insurance_expired: expiryType === 'insurance' ? 1 : 0,
      permit_expired: expiryType === 'permit' ? 1 : 0,
      pucc_expired: expiryType === 'pucc' ? 1 : 0,
    },
  })
  return {
    rows: Array.isArray(response.data?.data) ? response.data.data : [],
    total: response.data?.total ?? 0,
  }
}
