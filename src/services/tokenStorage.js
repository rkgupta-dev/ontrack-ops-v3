/**
 * Single read/write point for the persisted agent token.
 *
 * Kept separate from the auth store so the axios request interceptor
 * (services/api/v2Client.js) can read the token without importing the
 * store — avoids a circular import between the store and the client the
 * store's actions call.
 */
const TOKEN_KEY = 'ontrack_ops_v3_agent_token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // localStorage unavailable (private mode, disabled storage) — session
    // simply won't persist across reloads; not fatal.
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // no-op
  }
}
