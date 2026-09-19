import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'
import { getDeviceInfo } from '../geolocation'
import { getDeviceToken } from '../firebase'

/**
 * A-010 — POST /profile/agent/v2/login
 *
 * Body shape confirmed from a real request payload:
 * `{ employeeId, password, deviceToken, device }`. `deviceToken` is an FCM
 * push token from getDeviceToken() (null if push isn't configured/granted
 * — see services/firebase.js, that's a normal, non-blocking outcome);
 * `device` is the user agent string, same as punch in/out (see
 * `getDeviceInfo`).
 *
 * Response is read by the old app as `data.userData` / `data.userData.token`.
 */
export async function login({ employeeId, password }) {
  const response = await v2Client.post(ENDPOINTS.LOGIN, {
    employeeId,
    password,
    deviceToken: await getDeviceToken(),
    device: getDeviceInfo(),
  })
  const userData = response.data?.userData
  if (!userData?.token) {
    throw new Error('Login response did not include a token (unexpected response shape).')
  }
  return { user: userData, token: userData.token }
}

/**
 * A-019 / A-020 — GET /outreach/user/loggedin/info
 *
 * Read as raw `response.data` by the old app (tagged "no envelope" in
 * docs/api-reference.md), so no unwrapping here.
 */
export async function fetchLoggedInUser() {
  const response = await v2Client.get(ENDPOINTS.LOGGED_IN_INFO)
  return response.data
}
