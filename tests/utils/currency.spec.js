import { describe, it, expect } from 'vitest'
import { formatCurrency } from '../../src/utils/currency'

describe('formatCurrency', () => {
  it('formats a number with the rupee symbol and grouping', () => {
    expect(formatCurrency(4799)).toBe('₹4,799')
  })

  it('parses a numeric string', () => {
    expect(formatCurrency('5999')).toBe('₹5,999')
  })

  it('returns the fallback for null/undefined/empty input', () => {
    expect(formatCurrency(null)).toBe('—')
    expect(formatCurrency(undefined)).toBe('—')
    expect(formatCurrency('')).toBe('—')
  })

  it('returns the fallback for non-numeric input', () => {
    expect(formatCurrency('not-a-number')).toBe('—')
  })

  it('formats zero as ₹0, not the fallback', () => {
    expect(formatCurrency(0)).toBe('₹0')
  })
})
