import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

/** A-165 — the main vehicle load. */
export async function fetchVehicleDetail(vehicleId) {
  const response = await v2Client.get(ENDPOINTS.VEHICLE_DETAIL(vehicleId))
  return response.data ?? null
}

/**
 * A-072 — GET /operations/vehicle/current-location?registrationNumber=
 *
 * Live GPS position, polled by VehicleLiveLocation.vue, so it opts out of
 * the global top-of-page loading bar. Response — CONFIRMED live 2026-09-23:
 * `{ data: [ { vehicleNumber, vehicleId, lat, lng, movementStatus
 * ("STOPPED", ...), speed (nullable), ignition ("ON"/"OFF"), orientation,
 * lastUpdated (nullable), batteryValue, batteryUnit, totalSatellites } ] }`.
 * An empty `data` means the vehicle has no tracking; returns null then.
 */
export async function fetchCurrentLocation(registrationNumber) {
  const response = await v2Client.get(ENDPOINTS.VEHICLE_CURRENT_LOCATION, {
    params: { registrationNumber },
    skipGlobalLoading: true,
  })
  const row = Array.isArray(response.data?.data) ? response.data.data[0] : null
  const lat = Number(row?.lat)
  const lng = Number(row?.lng)
  if (!row || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { ...row, lat, lng }
}

/** A-169 — service history. Response: `{ rows }`. */
export async function fetchServiceHistory(vehicleId) {
  const response = await v2Client.get(ENDPOINTS.VEHICLE_SERVICE_HISTORY(vehicleId))
  const data = response.data ?? {}
  return Array.isArray(data.rows) ? data.rows : []
}

/** A-046 — same endpoint as the booking lookups, scoped by `{ vehicle }` instead of `{ bookingId }`. */
export async function fetchVehicleBookingHistory(vehicleId) {
  const response = await v2Client.post(ENDPOINTS.VEHICLE_BOOKING_HISTORY, { vehicle: vehicleId })
  return Array.isArray(response.data) ? response.data : []
}

/**
 * A-161 — single/multi-field patch. Used for every "Update" link in the
 * Specs tab (RC expiry, insurance start/end, permit expiry, swap key id)
 * and for the Settings tab's "Update Insurance" action — the old app's
 * `changingInsurance()` sent the insurance fields through a hardcoded
 * `https://api.on-track.in/api/vehicle/:id` URL + a hardcoded LEGACY
 * Basic-auth header instead, bypassing this same endpoint's v2 client for
 * no apparent reason (every sibling field-update handler on the same page
 * uses this endpoint correctly) — treated as a bug and not replicated;
 * insurance fields go through this endpoint like everything else.
 */
export async function updateVehicleField(vehicleId, fields) {
  const response = await v2Client.post(ENDPOINTS.VEHICLE_FIELD_UPDATE(vehicleId), fields)
  return response.data
}

/** A-093 — full location list, for the "Update Location" picker. */
export async function fetchVehicleLocations() {
  const response = await v2Client.get(ENDPOINTS.VEHICLE_LOCATIONS)
  const data = response.data
  return Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
}

/** A-154 — update a vehicle's location. */
export async function updateVehicleLocation(vehicleId, locationId) {
  const response = await v2Client.post(ENDPOINTS.VEHICLE_UPDATE_LOCATION(vehicleId), {
    location: locationId,
  })
  return response.data
}

/** A-155 — update a vehicle's status. */
export async function updateVehicleStatus(vehicleId, status) {
  const response = await v2Client.post(ENDPOINTS.VEHICLE_UPDATE_STATUS(vehicleId), { status })
  return response.data
}

// Base64 of "adminAuth:vishu@1992" — a hardcoded credential the old app
// sends (in cleartext in its own bundle) for this one endpoint, at both of
// its two independent call sites (vehicleDetails.vue and
// Recovery/VehicleView.vue). Unlike the traffic-violations Legacy-auth
// override found earlier (a single anomalous call site contradicting an
// otherwise-consistent Bearer pattern, judged a copy-paste bug and NOT
// replicated), this same override appears consistently across two
// independently-written call sites — treated as a genuine (if crude)
// backend requirement and replicated as-is, flagged here as an ASSUMPTION
// pending a real backend check.
const GPS_TOGGLE_AUTH = 'Basic YWRtaW5BdXRoOnZpc2h1QDE5OTI='

/** A-073 — toggle GPS install status. */
export async function toggleGpsStatus(vehicleId, { gps, gpsVendor }) {
  const response = await v2Client.post(
    ENDPOINTS.VEHICLE_TOGGLE_GPS(vehicleId),
    { gps: gps ? 1 : 0, gps_vendor: gpsVendor },
    { headers: { Authorization: GPS_TOGGLE_AUTH } },
  )
  return response.data
}

/** A-171 — multipart document image upload. `type` is one of insuranceImage/pucc/rcImage/vehiclePermit. */
export async function uploadVehicleImage(vehicleId, file, type) {
  const fd = new FormData()
  fd.append('image', file)
  fd.append('type', type)
  fd.append('vehicleId', vehicleId)
  const response = await v2Client.post(ENDPOINTS.VEHICLE_UPLOAD_IMAGE, fd)
  return response.data
}

/**
 * A-168 — resale listing details. The old app identifies the vehicle by
 * `registrationNumber` in the body (not by id) — ported exactly as
 * observed, however odd that looks.
 */
export async function updateResaleListing(payload) {
  const response = await v2Client.put(ENDPOINTS.VEHICLE_UPDATE_RESALE, payload)
  return response.data
}

/** Undocumented (not yet in api-inventory.csv as its own row) — block/unblock a swap key. */
export async function blockSwapKey(swapKeyId) {
  const response = await v2Client.post(ENDPOINTS.VEHICLE_SWAP_KEY_BLOCK(swapKeyId))
  return response.data
}
export async function unblockSwapKey(swapKeyId) {
  const response = await v2Client.post(ENDPOINTS.VEHICLE_SWAP_KEY_UNBLOCK(swapKeyId))
  return response.data
}

/** Vehicle Condition Report — a fixed 23-field boolean checklist. */
export async function fetchVcr(vehicleId) {
  const response = await v2Client.get(ENDPOINTS.VEHICLE_VCR, {
    params: { vehicleId },
  })
  return response.data ?? null
}

/** A-074 — GPS vendor list, for the GPS-status toggle's vendor picker. */
export async function fetchGpsVendors() {
  const response = await v2Client.get(ENDPOINTS.VEHICLE_GPS_VENDORS)
  return Array.isArray(response.data) ? response.data : []
}
