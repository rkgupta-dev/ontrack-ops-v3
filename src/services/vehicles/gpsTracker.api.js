import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

/**
 * A-032 — GET /outreach/bookings/expired/map-data
 *
 * Despite the "expired" name and its Bookings-domain placement in the
 * inventory, this powers the GPS Tracker map — it returns vehicles tied to
 * upcoming/active/expired bookings (filterable by `status`), each with
 * `bookingId`, `isTraceable`, `vehicleId`, `vehicleData.registrationNumber`,
 * and (when trackable) `gpsData.{lat,lng}`. Response is a bare array — same
 * "not read/indirectly read" gap the old app's own inventory entry has;
 * treated here as ported-exactly-as-observed, not independently confirmed.
 */
export async function fetchTrackedVehicles({
  status = null,
  searchQuery = '',
  limit = 10,
  offset = 0,
} = {}) {
  const params = { limit, offset }
  if (status !== null) params.status = status
  if (searchQuery) params.searchQuery = searchQuery
  const response = await v2Client.get(ENDPOINTS.GPS_TRACKER_MAP_DATA, { params })
  return Array.isArray(response.data) ? response.data : []
}
