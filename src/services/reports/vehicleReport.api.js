import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

// Every report endpoint below takes the same optional `lessor` (numeric
// lessor id) filter; omitted entirely for "All Lessors", as the old app did.
function lessorParams(lessor) {
  return { lessor: lessor ?? undefined }
}

function asObject(data) {
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
}

/**
 * A-167 — GET operations/vehicle/report/v2
 *
 * The six headline cards on the Inventory Utilisation Report (old app:
 * `views/vehicles/stats.vue`). `limit`/`offset` are sent exactly as the old
 * app did (10/0) even though the response isn't paginated.
 * Response — CONFIRMED live 2026-09-23: bare array of
 * `{ label, percentage?, modelName?, createdAt?, count? }`. `percentage` is
 * a pre-formatted string ("70.31%"); `createdAt` is the model record's
 * creation date.
 */
export async function fetchReportSummary({ lessor } = {}) {
  const response = await v2Client.get(ENDPOINTS.VEHICLE_REPORT_SUMMARY, {
    params: { limit: 10, offset: 0, ...lessorParams(lessor) },
  })
  return Array.isArray(response.data) ? response.data : []
}

/**
 * A-156 — GET /operations/vehicle/report/chart-data
 *
 * Response — CONFIRMED live 2026-09-23: object keyed by model name, each
 * `{ available: { total, byAge }, booked: { total, byAge } }` where `byAge`
 * maps vehicle age in whole years ("0", "1", ...) to a count.
 */
export async function fetchAvailabilityByAge({ lessor } = {}) {
  const response = await v2Client.get(ENDPOINTS.VEHICLE_REPORT_CHART_DATA, {
    params: lessorParams(lessor),
  })
  return asObject(response.data)
}

/**
 * A-111 — GET /operations/vehicle/report/vehicle-count-by-model
 *
 * Response — CONFIRMED live 2026-09-23: object keyed by model name, each
 * `{ inStock, booked, total }` (total = inStock + booked).
 */
export async function fetchCountByModel({ lessor } = {}) {
  const response = await v2Client.get(ENDPOINTS.VEHICLE_REPORT_COUNT_BY_MODEL, {
    params: lessorParams(lessor),
  })
  return asObject(response.data)
}

/**
 * A-157 — GET /operations/vehicle/report/vehicle-count-by-age
 *
 * Response — CONFIRMED live 2026-09-23: object keyed by model name, each
 * mapping age in years to a vehicle count. Counts every vehicle of the
 * model, so totals can exceed A-156's available + booked.
 */
export async function fetchCountByAge({ lessor } = {}) {
  const response = await v2Client.get(ENDPOINTS.VEHICLE_REPORT_COUNT_BY_AGE, {
    params: lessorParams(lessor),
  })
  return asObject(response.data)
}
