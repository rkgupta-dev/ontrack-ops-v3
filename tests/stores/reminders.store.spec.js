import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRemindersStore } from '../../src/stores/reminders.store'
import * as vehiclesApi from '../../src/services/vehicles/vehicles.api'

vi.mock('../../src/services/vehicles/vehicles.api')

describe('reminders store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('load() replaces rows and requests offset 0', async () => {
    vehiclesApi.fetchExpiredVehicles.mockResolvedValue({
      rows: [{ registrationNumber: 'KA01' }],
      total: 150,
    })
    const store = useRemindersStore()

    await store.load('rc')

    expect(vehiclesApi.fetchExpiredVehicles).toHaveBeenCalledWith({
      expiryType: 'rc',
      limit: 100,
      offset: 0,
    })
    expect(store.rows).toHaveLength(1)
    expect(store.hasMore).toBe(true)
  })

  it("loadMore() appends to the accumulated rows and advances the offset, fixing the old app's bug (it replaced rows and never advanced the offset, so Load More re-fetched the same page forever)", async () => {
    vehiclesApi.fetchExpiredVehicles
      .mockResolvedValueOnce({
        rows: [{ registrationNumber: 'KA01' }],
        total: 3,
      })
      .mockResolvedValueOnce({
        rows: [{ registrationNumber: 'KA02' }],
        total: 3,
      })
    const store = useRemindersStore()
    store.limit = 1

    await store.load('rc')
    expect(store.rows.map((r) => r.registrationNumber)).toEqual(['KA01'])

    await store.loadMore()

    expect(vehiclesApi.fetchExpiredVehicles).toHaveBeenLastCalledWith({
      expiryType: 'rc',
      limit: 1,
      offset: 1,
    })
    expect(store.rows.map((r) => r.registrationNumber)).toEqual(['KA01', 'KA02'])
    expect(store.offset).toBe(2)
  })
})
