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
 * A-116 — GET operations/getModels?model_id=:id
 *
 * The assign-vehicle review step's stock count — the old app's
 * bookingDetails.vue getModelById() read `data[0].available` (confirmed as
 * the live call made on that screen). Returns the model row, or null.
 */
export async function fetchModelById(modelId) {
  const response = await v2Client.get(ENDPOINTS.MODEL_BY_ID, { params: { model_id: modelId } })
  const rows = Array.isArray(response.data) ? response.data : []
  return rows[0] ?? null
}

/**
 * A-052 — POST /operations/customer/:id with no body (POST used for a
 * read, ported exactly from the old app's bookingDetails.vue
 * assignVehicle()). Response read raw: `DLVerified`, `IDVerified`,
 * `DLnumberVerified` (1 = verified).
 */
export async function fetchCustomerVerification(customerId) {
  const response = await v2Client.post(ENDPOINTS.CUSTOMER_DETAIL(customerId))
  return response.data ?? {}
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
  // Odometer is the one optional photo (not part of the old app's
  // validation); it sent '' when none was chosen.
  fd.append('image6', images.odometerPic ?? '')
  fd.append('booking', bookingId)
  fd.append('preKm', kmReading)
  fd.append('preComment', `Assign Vehicle - ${comment ?? ''}`)
  fd.append('permanentAddress', permanentAddress)

  const response = await v2Client.post(ENDPOINTS.PRE_BOOKING_DATA, fd, {
    params: { id: bookingId },
  })
  return response.data
}

/**
 * A-175 — POST booking/:id/vehicle/assign/consent
 *
 * Pickup handoff consent: notifies the customer and sends them the 6-digit
 * OTP that assignVehicleToBooking() must then include. Body ported exactly
 * from the old app's assignVehicle2.vue::sendConsent().
 */
export async function sendAssignConsent(
  bookingId,
  { vehicleId, documentsVerified, customerInformed },
) {
  const response = await v2Client.post(ENDPOINTS.ASSIGN_VEHICLE_CONSENT(bookingId), {
    vehicleId,
    documentsVerified,
    customerInformed,
  })
  return response.data
}

/**
 * A-034 — the actual vehicle assignment, called after pre-booking data is
 * set. `otp` is the code the customer received from sendAssignConsent().
 */
export async function assignVehicleToBooking(bookingId, { vehicleId, startDate, endDate, otp }) {
  const response = await v2Client.post(ENDPOINTS.ASSIGN_VEHICLE(bookingId), {
    vehicleId,
    startDate,
    endDate,
    status: 1,
    otp,
  })
  return response.data
}
