/**
 * Reads the first present value out of a record for a list of candidate
 * field names — shared by any store rendering a list endpoint whose row
 * shape isn't documented in docs/api-reference.md (see each store for the
 * specific ASSUMPTION note on why those candidates were picked).
 *
 * Supports dot-paths (e.g. `'customer.name'`) for a nested candidate.
 */
export function firstPresent(record, fields, fallback = null) {
  for (const field of fields) {
    const value = field
      .split('.')
      .reduce((obj, key) => (obj === null || obj === undefined ? undefined : obj[key]), record)
    if (value !== undefined && value !== null && value !== '') return value
  }
  return fallback
}

/**
 * Display name for a lessor record. A-089 (lessor list) returns some
 * lessors with `name: null` (e.g. id 40), so a record that exists but has
 * no name reads "Unknown". No record at all → `fallback`.
 */
export function lessorName(lessor, fallback = null) {
  if (!lessor) return fallback
  return (typeof lessor.name === 'string' && lessor.name.trim()) || 'Unknown'
}
