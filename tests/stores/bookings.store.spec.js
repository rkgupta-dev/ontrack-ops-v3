import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBookingsStore } from '../../src/stores/bookings.store'
import * as bookingsApi from '../../src/services/bookings/bookings.api'

vi.mock('../../src/services/bookings/bookings.api')

describe('bookings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('fetchPage loads a page of rows and maps the confirmed A-024 row shape', async () => {
    bookingsApi.fetchBookings.mockResolvedValue({
      rows: [
        {
          id: 124403,
          bookingId: 'TEST-WEEKLY-KM-20260901',
          status: 1,
          startDate: '2026-08-24',
          endDate: '2026-09-21',
          customerData: { fName: 'Ann', lName: 'Lee' },
          vehicleData: { registrationNumber: 'KA01AU1808' },
          modelData: { name: 'Honda Activa EV' },
        },
      ],
      total: 1,
    })
    const store = useBookingsStore()

    await store.fetchPage({ page: 1, search: '' })

    expect(store.rows[0]).toMatchObject({
      id: 124403,
      customer: 'Ann Lee',
      vehicleRegistration: 'KA01AU1808',
      model: 'Honda Activa EV',
      statusCode: 1,
      startDate: '2026-08-24',
      endDate: '2026-09-21',
    })
    expect(store.total).toBe(1)
  })

  it('passes page/search through to the API and updates state on success', async () => {
    bookingsApi.fetchBookings.mockResolvedValue({ rows: [], total: 0 })
    const store = useBookingsStore()

    await store.fetchPage({ page: 3, search: 'B-1' })

    expect(bookingsApi.fetchBookings).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 3,
        limit: store.limit,
        searchQuery: 'B-1',
      }),
    )
    expect(store.page).toBe(3)
  })

  it('surfaces the error and leaves loading false on failure', async () => {
    bookingsApi.fetchBookings.mockRejectedValue(new Error('network error'))
    const store = useBookingsStore()

    await expect(store.fetchPage()).rejects.toThrow('network error')

    expect(store.error).toBeInstanceOf(Error)
    expect(store.loading).toBe(false)
  })
})
