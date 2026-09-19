import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

/**
 * A-104 — GET models/stock
 *
 * Response read raw by the old app (array of `{ modelData, ... }` entries,
 * filtered for malformed entries — some rows apparently lack `modelData`).
 */
export async function fetchModelsStock() {
  const response = await v2Client.get(ENDPOINTS.MODELS_STOCK)
  const rows = Array.isArray(response.data) ? response.data : []
  return rows.filter((row) => row?.modelData)
}

/**
 * A-152 — POST operations/getVehicles (empty body, `model_id`/`type=all`
 * as query params — POST used for a read, matches the old app exactly).
 * Response: `data.rows`.
 */
export async function fetchAvailableVehicles(modelId) {
  const response = await v2Client.post(
    ENDPOINTS.AVAILABLE_VEHICLES,
    {},
    { params: { model_id: modelId, type: 'all' } },
  )
  const rows = Array.isArray(response.data?.rows) ? response.data.rows : []
  return rows.filter(Boolean)
}

/**
 * A-030 — POST /operations/preBookingData/?id=:bookingId
 *
 * Multipart: 6 images (`image1`..`image6`), `booking`, `preKm`,
 * `preComment`, `permanentAddress` — field names/order ported exactly
 * from the old app's FormData construction.
 */
export async function submitPreBookingData(
  bookingId,
  images,
  { kmReading, comment, permanentAddress },
) {
  const fd = new FormData()
  fd.append('image1', images.riderPic)
  fd.append('image2', images.dlPic)
  fd.append('image3', images.addressProofFrontPic)
  fd.append('image4', images.idCardPic)
  fd.append('image5', images.addressProofBackPic)
  fd.append('image6', images.odometerPic)
  fd.append('booking', bookingId)
  fd.append('preKm', kmReading)
  fd.append('preComment', `Assign Vehicle - ${comment ?? ''}`)
  fd.append('permanentAddress', permanentAddress)

  const response = await v2Client.post(ENDPOINTS.PRE_BOOKING_DATA, fd, {
    params: { id: bookingId },
  })
  return response.data
}

/** A-034 — the actual vehicle assignment, called after pre-booking data is set. */
export async function assignVehicleToBooking(bookingId, { vehicleId, startDate, endDate }) {
  const response = await v2Client.post(ENDPOINTS.ASSIGN_VEHICLE(bookingId), {
    vehicleId,
    startDate,
    endDate,
    status: 1,
  })
  return response.data
}
