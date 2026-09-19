import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

/**
 * A-152 — POST operations/getVehicles?model_id=:modelId (empty body,
 * status=[0,2,5,4]/limit=400 as query params) — vehicles eligible for an
 * exchange (Available/Under Service/Water Wash/Ongoing Under Service —
 * excludes Booked/Not Working/Cancelled). A different real param shape
 * than assignVehicle.api.js::fetchAvailableVehicles() (`type=all`) for the
 * same physical endpoint — both ported exactly as the old app calls them.
 */
export async function fetchExchangeableVehicles(modelId) {
  const response = await v2Client.post(
    ENDPOINTS.EXCHANGEABLE_VEHICLES,
    {},
    { params: { model_id: modelId, status: [0, 2, 5, 4], limit: 400 } },
  )
  return Array.isArray(response.data?.rows) ? response.data.rows : []
}

/** A-029 — upload the exchange vehicle's condition photo. Response: `{ location }`. */
export async function uploadExchangeVehicleImage(file) {
  const fd = new FormData()
  fd.append('image', file)
  const response = await v2Client.post(ENDPOINTS.EXCHANGE_VEHICLE_IMAGE_UPLOAD, fd)
  return response.data?.location
}

/**
 * A-028 — the actual extend/exchange submission. `type` is `'extend'` or
 * `'exchange'` — both use this one endpoint; fields irrelevant to the
 * chosen type are just ignored server-side (same payload shape the old
 * app sends for both, ported as-is).
 */
export async function submitModifyBooking(payload) {
  const response = await v2Client.post(ENDPOINTS.MODIFY_BOOKING, payload)
  return response.data
}
