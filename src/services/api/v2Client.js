import { createHttpClient } from './httpClient'
import { getToken } from '../tokenStorage'
import { useUiStore } from '../../stores/ui.store'

/**
 * Shared client for every v2 (glacier.on-track.in) endpoint — Bearer
 * agentToken auth, attached automatically. Replaces the two separate
 * axios instances the old app used for attendance ("test" client vs the
 * real one, see docs/api-reference.md A-003/A-004 `Issues`): everything
 * v2 goes through this single client so auth + 401 handling only exist
 * in one place.
 */
export const v2Client = createHttpClient({
  baseURL: import.meta.env.VITE_API_BASE_V2,
})

v2Client.interceptors.request.use((config) => {
  const token = getToken()
  // A caller can pre-set `headers.Authorization` to opt out of the usual
  // Bearer token — used only by the vehicle GPS-toggle admin endpoint,
  // which requires a separate hardcoded credential (see vehicleDetail.api.js
  // for why this one is believed genuine rather than a copy-paste bug).
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Drives the global loading indicator (AppLoadingOverlay.vue) — a plain
  // counter so overlapping requests don't hide it early (see ui.store.js).
  // Opt out per-request with `{ skipGlobalLoading: true }` in axios config
  // (e.g. background polling that shouldn't flash the indicator).
  if (!config.skipGlobalLoading) {
    useUiStore().startLoading()
  }
  return config
})

// Set once from main.js after the router/pinia are ready, so a 401 from
// anywhere can centrally clear the session and redirect — no page has to
// handle auth expiry itself.
let unauthorizedHandler = null

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

v2Client.interceptors.response.use(
  (response) => {
    if (!response.config.skipGlobalLoading) {
      useUiStore().stopLoading()
    }
    return response
  },
  (error) => {
    if (!error.config?.skipGlobalLoading) {
      useUiStore().stopLoading()
    }
    if (error.response?.status === 401 && unauthorizedHandler) {
      unauthorizedHandler()
    }
    return Promise.reject(error)
  },
)
