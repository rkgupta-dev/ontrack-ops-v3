import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

/**
 * A-030 — POST /operations/preBookingData/?id=:bookingId
 *
 * Same physical endpoint as assignVehicle.api.js::submitPreBookingData(),
 * but a different real call shape (confirmed against the old app's
 * views/bookings/preBookingData.vue, the standalone "edit already-assigned
 * booking's pre-booking data" screen — distinct from the Assign Vehicle
 * flow that uses the same endpoint to set it for the first time):
 *  - only the 5 images actually re-selected are sent (the backend keeps
 *    whichever ones aren't included) — Assign Vehicle always sends all 6
 *  - no `image6`/odometer field — that field doesn't exist on this screen
 *  - `preComment` is sent as-is, with no "Assign Vehicle - " prefix
 */
export async function updatePreBookingData(
  bookingId,
  images,
  { kmReading, comment, permanentAddress },
) {
  const fd = new FormData()
  if (images.riderPic) fd.append('image1', images.riderPic)
  if (images.dlPic) fd.append('image2', images.dlPic)
  if (images.addressProofFrontPic) fd.append('image3', images.addressProofFrontPic)
  if (images.idCardPic) fd.append('image4', images.idCardPic)
  if (images.addressProofBackPic) fd.append('image5', images.addressProofBackPic)
  fd.append('booking', bookingId)
  fd.append('preKm', kmReading)
  fd.append('permanentAddress', permanentAddress)
  fd.append('preComment', comment ?? '')

  const response = await v2Client.post(ENDPOINTS.PRE_BOOKING_DATA, fd, {
    params: { id: bookingId },
  })
  return response.data
}
