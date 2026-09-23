/**
 * Pure reshaping of the Inventory Utilisation Report responses (A-111,
 * A-156, A-157) into what VehicleStatsPage.vue renders. All three
 * responses are objects keyed by model name.
 */

function toCount(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** booked / (booked + inStock) as a 0–100 number, or null with no vehicles. */
export function utilisation(booked, inStock) {
  const total = booked + inStock
  return total > 0 ? (booked / total) * 100 : null
}

/**
 * A-111 → one row per model, `{ key, label, booked, inStock, total,
 * utilisation }`, largest fleet first. `total` is recomputed as
 * booked + inStock so the bar always adds up to the number beside it.
 */
export function modelStockRows(countByModel) {
  return Object.entries(countByModel ?? {})
    .map(([model, values]) => {
      const booked = toCount(values?.booked)
      const inStock = toCount(values?.inStock)
      return {
        key: model,
        label: model,
        booked,
        inStock,
        total: booked + inStock,
        utilisation: utilisation(booked, inStock),
      }
    })
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
}

/**
 * A-156 → the same row shape, but aggregated across models into one row
 * per vehicle age (in years), youngest first.
 */
export function ageStockRows(chartData) {
  const byAge = new Map()
  for (const model of Object.values(chartData ?? {})) {
    for (const [field, target] of [
      ['available', 'inStock'],
      ['booked', 'booked'],
    ]) {
      for (const [age, count] of Object.entries(model?.[field]?.byAge ?? {})) {
        const row = byAge.get(Number(age)) ?? { inStock: 0, booked: 0 }
        row[target] += toCount(count)
        byAge.set(Number(age), row)
      }
    }
  }
  return [...byAge.entries()]
    .filter(([age]) => Number.isFinite(age))
    .sort(([a], [b]) => a - b)
    .map(([age, { booked, inStock }]) => ({
      key: String(age),
      label: age === 1 ? '1 year' : `${age} years`,
      booked,
      inStock,
      total: booked + inStock,
      utilisation: utilisation(booked, inStock),
    }))
}

/**
 * A-157 → a model × age matrix: `ages` (every age present, ascending),
 * `rows` (`{ model, counts: { [age]: n }, total }`, largest fleet first)
 * and `max` (largest single cell, for shading).
 */
export function ageMatrix(countByAge) {
  const ages = new Set()
  let max = 0
  const rows = Object.entries(countByAge ?? {}).map(([model, byAge]) => {
    const counts = {}
    let total = 0
    for (const [age, count] of Object.entries(byAge ?? {})) {
      const n = toCount(count)
      if (!Number.isFinite(Number(age)) || n === 0) continue
      ages.add(Number(age))
      counts[Number(age)] = n
      total += n
      max = Math.max(max, n)
    }
    return { model, counts, total }
  })
  rows.sort((a, b) => b.total - a.total || a.model.localeCompare(b.model))
  return { ages: [...ages].sort((a, b) => a - b), rows, max }
}
