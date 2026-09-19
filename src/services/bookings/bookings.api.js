import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'
import { extractRows, extractTotal } from '../../utils/listResponse'

/**
 * A-024 — GET /operations/bookings
 *
 * This is the exact endpoint the old app's bookings list page
 * (`components/bookings.vue`) calls to (re)load its grid, via
 * `updateQueryParamUrl()` — the strongest available signal that it's the
 * real paginated list endpoint, out of several Bookings-domain candidates
 * (see docs/api-reference.md A-021/A-027/A-037/A-045/A-046 for the
 * near-duplicates).
 *
 * `locations`/`models`/`plan_types`/`statuses`/`sortOrder` are documented
 * query params (array-valued, same shape as A-158's vehicles filters) now
 * wired for the filter sidebar UI. Their valid values aren't captured in
 * the inventory, so — same reasoning as `stores/vehicles.store.js` for the
 * vehicle Status filter — `models`/`locations` reuse the real option IDs
 * from A-107/A-100 (already confirmed generic lookups, not bookings-
 * specific), `statuses` reuses the numeric codes `utils/bookingStatus.js`
 * already confirmed live for the same status domain, and `plan_types`
 * reuses the lowercase `planType` string values already read off booking
 * records elsewhere (`BookingFeedCard.vue`). None of these four are
 * confirmed as *this* endpoint's accepted filter values — verify with a
 * real backend response before treating as a contract.
 *
 * Response envelope is NOT documented ("not read, or read indirectly") —
 * `extractRows`/`extractTotal` guess at the shape using patterns confirmed
 * elsewhere in this API. Row field names are also unconfirmed — see
 * stores/bookings.store.js.
 */
export async function fetchBookings({
  page = 1,
  limit = 25,
  searchQuery = '',
  statuses = [],
  models = [],
  locations = [],
  planTypes = [],
  sortOrder = ['createdAt', 'DESC'],
} = {}) {
  const response = await v2Client.get(ENDPOINTS.BOOKINGS_LIST, {
    params: {
      limit,
      offset: (page - 1) * limit,
      searchQuery: searchQuery || undefined,
      statuses,
      models,
      locations,
      plan_types: planTypes,
      sortOrder,
    },
  })
  const rows = extractRows(response.data)
  return { rows, total: extractTotal(response.data, rows) }
}
