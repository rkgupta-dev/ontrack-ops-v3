/**
 * Formats a value as Indian Rupees — ported from the old app's global Vue 2
 * `currency` filter (`"₹" + parseFloat(value).toLocaleString()`; Vue 3 has
 * no filters, so this is a plain function used directly in templates).
 * Returns the fallback for null/undefined/non-numeric input.
 */
export function formatCurrency(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback
  const amount = parseFloat(value)
  if (Number.isNaN(amount)) return fallback
  return `₹${amount.toLocaleString()}`
}
