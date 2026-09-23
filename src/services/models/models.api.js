import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

/**
 * A-104 — GET models/stock
 *
 * Powers the Model List page (old app: `components/ModelsList.vue`).
 * Query: `location` (numeric location id, omitted for all locations).
 * Response — CONFIRMED live 2026-09-23 (`?location=1`): bare array, one
 * entry per model: per-status counts `total`, `available`, `booked`,
 * `underService`, `not_working`, `ongoingUnderService`, `underWaterWash`,
 * `returned` (note the mixed snake/camelCase — differs from A-108's
 * naming), `model` (id), and the full embedded `modelData` record
 * (`id`, `name`, `image`, `image300`, `price`, `old_price`, `show` 0/1,
 * `model_type`, `evType`, ...). Entries without `modelData` are dropped,
 * same as assignVehicle.api.js::fetchModelsStock.
 */
export async function fetchModelsStock({ location } = {}) {
  const response = await v2Client.get(ENDPOINTS.MODELS_STOCK, {
    params: { location: location || undefined },
  })
  const rows = Array.isArray(response.data) ? response.data : []
  return rows.filter((row) => row?.modelData)
}

/**
 * A-110 — PUT /operations/models/update/:id
 *
 * Body: `{ show, price, old_price }` — exactly the three fields the old
 * app's edit modal sends. Response: `{ error, message }`; `error: 1` means
 * the update was rejected, surfaced here as a thrown Error.
 */
export async function updateModel(modelId, { show, price, oldPrice }) {
  const response = await v2Client.put(ENDPOINTS.MODEL_UPDATE(modelId), {
    show,
    price,
    old_price: oldPrice,
  })
  if (Number(response.data?.error) === 1) {
    throw new Error(response.data?.message || 'Could not update model.')
  }
  return response.data
}
