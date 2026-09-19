import axios from 'axios'

/**
 * Creates a bare axios instance with sane defaults. Backend-specific
 * concerns (auth headers, 401 handling) are layered on by the callers
 * of this factory (see v2Client.js), keeping this file backend-agnostic
 * so a future legacy/Basic-auth client can reuse it the same way.
 */
export function createHttpClient({ baseURL, timeout = 15000 } = {}) {
  return axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
