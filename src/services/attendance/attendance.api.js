import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

/**
 * A-003 — POST /attendance
 *
 * ASSUMPTION (verify with backend): response shape isn't documented
 * ("not read, or read indirectly" in docs/api-reference.md). Treated as
 * an array of attendance records, with today's record at index 0 — this
 * mirrors the one concrete behaviour we do know about the old code
 * (guarding against an empty array rather than assuming data[0] exists).
 * Returns null when there is no record yet for the day (not punched in).
 */
export async function getToday(date) {
  const response = await v2Client.post(ENDPOINTS.ATTENDANCE_TODAY, { date })
  const records = Array.isArray(response.data) ? response.data : (response.data?.data ?? [])
  return records[0] ?? null
}

/** A-004 — POST /attendance/punch/in — body: device, lat, long, place */
export async function punchIn({ device, lat, long, place }) {
  const response = await v2Client.post(ENDPOINTS.ATTENDANCE_PUNCH_IN, {
    device,
    lat,
    long,
    place,
  })
  return response.data
}

/**
 * A-005 — POST /attendance/punch/out — body: device, lat, long, place
 *
 * Documented Vuex side effect in the old app: `dispatches authLogout`.
 * Punching out ends the session there, and callers of this function must
 * preserve that (see stores/attendance.store.js) — this layer only makes
 * the request.
 */
export async function punchOut({ device, lat, long, place }) {
  const response = await v2Client.post(ENDPOINTS.ATTENDANCE_PUNCH_OUT, {
    device,
    lat,
    long,
    place,
  })
  return response.data
}
