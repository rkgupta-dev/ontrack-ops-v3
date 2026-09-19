/**
 * Best-effort extraction for list/grid endpoints whose response envelope
 * isn't documented in docs/api-reference.md ("not read, or read
 * indirectly" — see each api.js caller for the specific A-xxx note).
 * Tries the `{ rows, count }` shape already *confirmed* elsewhere in this
 * API (A-045, A-058, A-152, A-169) first, then a couple of other common
 * envelopes, before falling back to treating the response as a bare array.
 */
export function extractRows(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.rows)) return data.rows
  if (Array.isArray(data?.data)) return data.data
  return []
}

export function extractTotal(data, rows) {
  if (typeof data?.count === 'number') return data.count
  if (typeof data?.total === 'number') return data.total
  return rows.length
}
