import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatFullDate,
  formatRelativeTime,
  addDaysIso,
  toPaymentReceivedOn,
  isExpired,
  formatOrdinalDate,
} from '../../src/utils/date'

describe('isExpired', () => {
  it('returns true for a date in the past', () => {
    expect(isExpired('2000-01-01')).toBe(true)
  })

  it('returns false for a date in the future', () => {
    expect(isExpired('2999-01-01')).toBe(false)
  })

  it('returns false for a falsy or unparseable date', () => {
    expect(isExpired(null)).toBe(false)
    expect(isExpired('')).toBe(false)
    expect(isExpired('not-a-date')).toBe(false)
  })
})

describe('toPaymentReceivedOn', () => {
  it('subtracts 5h30m (IST -> UTC) within the same day', () => {
    expect(toPaymentReceivedOn('2026-09-07', '14:30')).toBe('2026-09-07 09:00')
  })

  it('rolls back to the previous day when the time is before 05:30', () => {
    expect(toPaymentReceivedOn('2026-09-07', '02:00')).toBe('2026-09-06 20:30')
  })
})

describe('addDaysIso', () => {
  it('adds days within the same month', () => {
    expect(addDaysIso('2026-09-01', 7)).toBe('2026-09-08')
  })

  it('rolls over into the next month', () => {
    expect(addDaysIso('2026-09-20', 30)).toBe('2026-10-20')
  })

  it('rolls over into the next year', () => {
    expect(addDaysIso('2026-12-20', 30)).toBe('2027-01-19')
  })
})

describe('formatFullDate', () => {
  it('formats with an ordinal day suffix and lowercase am/pm', () => {
    expect(formatFullDate('2026-09-07T07:58:17.000Z')).toMatch(
      /^September 7th 2026, \d{2}:\d{2} (am|pm)$/,
    )
  })

  it('handles 1st/2nd/3rd/11th-13th ordinal exceptions', () => {
    expect(formatFullDate('2026-01-01T00:00:00.000Z')).toMatch(/^January 1st /)
    expect(formatFullDate('2026-01-02T00:00:00.000Z')).toMatch(/^January 2nd /)
    expect(formatFullDate('2026-01-03T00:00:00.000Z')).toMatch(/^January 3rd /)
    expect(formatFullDate('2026-01-11T00:00:00.000Z')).toMatch(/^January 11th /)
    expect(formatFullDate('2026-01-12T00:00:00.000Z')).toMatch(/^January 12th /)
    expect(formatFullDate('2026-01-13T00:00:00.000Z')).toMatch(/^January 13th /)
  })

  it('returns the fallback for missing/invalid input', () => {
    expect(formatFullDate(null)).toBe('—')
    expect(formatFullDate('not-a-date')).toBe('—')
  })
})

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-07T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders "just now" for under a minute', () => {
    expect(formatRelativeTime('2026-09-07T11:59:45.000Z')).toBe('just now')
  })

  it('renders minutes/hours/days ago', () => {
    expect(formatRelativeTime('2026-09-07T11:35:00.000Z')).toBe('25 minutes ago')
    expect(formatRelativeTime('2026-09-07T09:00:00.000Z')).toBe('3 hours ago')
    expect(formatRelativeTime('2026-09-05T12:00:00.000Z')).toBe('2 days ago')
  })

  it('singularizes a count of 1', () => {
    expect(formatRelativeTime('2026-09-07T11:00:00.000Z')).toBe('1 hour ago')
  })

  it('returns the fallback for missing/invalid input', () => {
    expect(formatRelativeTime(null)).toBe('—')
    expect(formatRelativeTime('not-a-date')).toBe('—')
  })
})

describe('formatOrdinalDate', () => {
  it('renders ordinal day + short month + year for a plain date', () => {
    expect(formatOrdinalDate('2026-09-19')).toBe('19th Sep 2026')
    expect(formatOrdinalDate('2026-09-01')).toBe('1st Sep 2026')
    expect(formatOrdinalDate('2026-09-22')).toBe('22nd Sep 2026')
    expect(formatOrdinalDate('2026-09-23')).toBe('23rd Sep 2026')
    expect(formatOrdinalDate('2026-09-11')).toBe('11th Sep 2026')
  })

  it('returns the fallback for missing/invalid input', () => {
    expect(formatOrdinalDate(null)).toBe('—')
    expect(formatOrdinalDate('not-a-date')).toBe('—')
  })
})
