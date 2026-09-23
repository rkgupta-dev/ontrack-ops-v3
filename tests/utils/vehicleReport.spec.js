import { describe, it, expect } from 'vitest'
import { ageMatrix, ageStockRows, modelStockRows, utilisation } from '../../src/utils/vehicleReport'

describe('utilisation', () => {
  it('is booked share of the fleet', () => {
    expect(utilisation(3, 1)).toBe(75)
  })

  it('is null with no vehicles', () => {
    expect(utilisation(0, 0)).toBeNull()
  })
})

describe('modelStockRows', () => {
  it('maps and sorts by fleet size, largest first', () => {
    const rows = modelStockRows({
      'TVS Jupiter': { inStock: 4, booked: 0, total: 4 },
      'Honda Dio': { inStock: 71, booked: 108, total: 179 },
    })
    expect(rows.map((r) => r.label)).toEqual(['Honda Dio', 'TVS Jupiter'])
    expect(rows[0]).toMatchObject({ booked: 108, inStock: 71, total: 179 })
    expect(rows[1].utilisation).toBe(0)
  })

  it('handles an empty or missing response', () => {
    expect(modelStockRows(undefined)).toEqual([])
  })
})

describe('ageStockRows', () => {
  it('aggregates available/booked across models per age, youngest first', () => {
    const rows = ageStockRows({
      A: {
        available: { total: 3, byAge: { 10: 2, 1: 1 } },
        booked: { total: 1, byAge: { 1: 1 } },
      },
      B: { available: { total: 0, byAge: {} }, booked: { total: 2, byAge: { 1: 2 } } },
    })
    expect(rows).toEqual([
      { key: '1', label: '1 year', booked: 3, inStock: 1, total: 4, utilisation: 75 },
      { key: '10', label: '10 years', booked: 0, inStock: 2, total: 2, utilisation: 0 },
    ])
  })
})

describe('ageMatrix', () => {
  it('collects every age, row totals and the max cell', () => {
    const matrix = ageMatrix({
      'Honda Aviator': { 10: 2 },
      'Honda Activa EV': { 0: 206, 1: 25 },
    })
    expect(matrix.ages).toEqual([0, 1, 10])
    expect(matrix.max).toBe(206)
    expect(matrix.rows[0]).toEqual({
      model: 'Honda Activa EV',
      counts: { 0: 206, 1: 25 },
      total: 231,
    })
  })
})
