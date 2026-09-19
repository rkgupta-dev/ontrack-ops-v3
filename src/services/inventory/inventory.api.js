import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

/**
 * A-109 — GET operations/models/inventory/stats
 *
 * Response — CONFIRMED live 2026-09-07: `{ data: [...], count }`. Each
 * `data` entry: `{ count, filter_tag, label, abbr_label, status, percentage }`
 * (the `Total` entry omits `filter_tag`/`percentage`). Returned as-is —
 * no guessing needed, every field is documented from the real payload.
 */
export async function fetchInventoryStats() {
  const response = await v2Client.get(ENDPOINTS.INVENTORY_STATS)
  return Array.isArray(response.data?.data) ? response.data.data : []
}

/**
 * A-108 — GET operations/models/inventory
 *
 * Per-model status breakdown table (old app: `components/stockCount.vue`).
 * Query: `lessor` (numeric lessor id, or blank/undefined for all lessors),
 * `searchQuery`. Response — CONFIRMED live 2026-09-19 (`?lessor=19&searchQuery=`):
 * `{ success, rows, count }`. Each row: `id`, `model`, `name`, `image`,
 * `price`, `show`, `old_price`, plus per-status counts `available`,
 * `booked`, `underService`, `notWorking`, `ongoingService`, `waterWash`,
 * `returned`, `sold`, `scrapped` — all camelCase, read as-is below.
 */
export async function fetchModelInventory({ lessor, searchQuery } = {}) {
  const response = await v2Client.get(ENDPOINTS.MODEL_INVENTORY, {
    params: { lessor: lessor || undefined, searchQuery: searchQuery || undefined },
  })
  return {
    rows: Array.isArray(response.data?.rows) ? response.data.rows : [],
    total: response.data?.count ?? 0,
  }
}
