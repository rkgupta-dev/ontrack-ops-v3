/**
 * Maps an axios/API error to a short, user-friendly message — centralizes
 * "no unnecessary technical details" error handling (CLAUDE.md §8) so
 * pages/stores don't each re-derive this.
 */
/**
 * True when the server rejected a *logged-in* agent for lacking permission,
 * as opposed to a dead session. The v2 backend uses 401 for both: its auth
 * middleware (`checkAgentAuth`) answers a bad or expired token with a plain
 * string body, while role checks inside handlers (e.g. "ADMIN only" in
 * `updateModelFields`) answer with a JSON `{ error: 1, message }` body.
 * That JSON body is what tells the two apart. A 403 always counts.
 */
export function isPermissionDenied(error) {
  const status = error?.response?.status
  if (status === 403) return true
  const data = error?.response?.data
  return status === 401 && data !== null && typeof data === 'object' && Boolean(data.message)
}

export function toUserMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback

  const status = error.response?.status
  const serverMessage = error.response?.data?.message || error.response?.data?.error

  if (error.code === 'ECONNABORTED') {
    return 'The request timed out. Please check your connection and try again.'
  }
  if (!error.response) {
    return 'Could not reach the server. Please check your connection and try again.'
  }
  if (isPermissionDenied(error)) {
    return typeof serverMessage === 'string' && serverMessage.trim()
      ? serverMessage
      : "You don't have permission to do that."
  }
  if (status === 401) {
    return 'Your session has expired. Please log in again.'
  }
  if (status === 403) {
    return "You don't have permission to do that."
  }
  if (status === 404) {
    return 'The requested resource was not found.'
  }
  if (status >= 500) {
    return 'The server ran into a problem. Please try again shortly.'
  }
  return typeof serverMessage === 'string' && serverMessage.trim() ? serverMessage : fallback
}
