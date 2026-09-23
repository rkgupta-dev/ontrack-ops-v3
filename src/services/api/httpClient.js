import axios from 'axios'

/**
 * Creates a bare axios instance with sane defaults. Backend-specific
 * concerns (auth headers, 401 handling) are layered on by the callers
 * of this factory (see v2Client.js), keeping this file backend-agnostic
 * so a future legacy/Basic-auth client can reuse it the same way.
 */
export function createHttpClient({ baseURL, timeout = 15000 } = {}) {
  // No default Content-Type on purpose: axios picks it per request —
  // `application/json` for plain objects, `multipart/form-data; boundary=…`
  // for FormData. Forcing JSON here made axios serialize every FormData
  // upload to JSON, so the files never reached the backend (multer saw no
  // multipart body and `request.files` was undefined).
  return axios.create({ baseURL, timeout })
}
