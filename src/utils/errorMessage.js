/**
 * Maps an axios/API error to a short, user-friendly message — centralizes
 * "no unnecessary technical details" error handling (CLAUDE.md §8) so
 * pages/stores don't each re-derive this.
 */
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
