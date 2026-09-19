import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useVehiclesStore } from '../../src/stores/vehicles.store'
import * as vehiclesApi from '../../src/services/vehicles/vehicles.api'
import * as homeApi from '../../src/services/home/home.api'

vi.mock('../../src/services/vehicles/vehicles.api')
vi.mock('../../src/services/home/home.api')

describe('vehicles store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('fetchPage loads a page of rows and maps the confirmed A-158 row shape', async () => {
    vehiclesApi.fetchVehicles.mockResolvedValue({
      rows: [
        {
          id: 2581,
          registrationNumber: 'KA53AC9470',
          color: 'PRL IGNS BLK+BLK',
          subStatus: 'Default',
          status: 0,
          modelData: { name: 'Honda Dio 2026' },
          lessorData: { name: 'VPR Ventures' },
        },
      ],
      total: 1,
    })
    const store = useVehiclesStore()

    await store.fetchPage({ page: 1, search: '' })

    expect(store.rows[0]).toMatchObject({
      id: 2581,
      registrationNumber: 'KA53AC9470',
      model: 'Honda Dio 2026',
      lessor: 'VPR Ventures',
      color: 'PRL IGNS BLK+BLK',
      subStatus: 'Default',
      statusCode: 0,
    })
    expect(store.total).toBe(1)
  })

  it('passes page/search through to the API and updates state on success', async () => {
    vehiclesApi.fetchVehicles.mockResolvedValue({ rows: [], total: 0 })
    const store = useVehiclesStore()

    await store.fetchPage({ page: 2, search: 'KA-01' })

    expect(vehiclesApi.fetchVehicles).toHaveBeenCalledWith({
      page: 2,
      limit: store.limit,
      searchQuery: 'KA-01',
      statuses: [],
      models: [],
      lessors: [],
      locations: [],
      manufactureDate: [],
      sortOrder: ['createdAt', store.sortDirection],
    })
    expect(store.page).toBe(2)
  })

  it('surfaces the error and leaves loading false on failure', async () => {
    vehiclesApi.fetchVehicles.mockRejectedValue(new Error('network error'))
    const store = useVehiclesStore()

    await expect(store.fetchPage()).rejects.toThrow('network error')

    expect(store.error).toBeInstanceOf(Error)
    expect(store.loading).toBe(false)
  })

  it('passes filter/sort state through to the API', async () => {
    vehiclesApi.fetchVehicles.mockResolvedValue({ rows: [], total: 0 })
    const store = useVehiclesStore()

    await store.fetchPage({
      page: 1,
      statuses: [0, 1],
      models: [44],
      sortDirection: 'ASC',
    })

    expect(vehiclesApi.fetchVehicles).toHaveBeenCalledWith(
      expect.objectContaining({
        statuses: [0, 1],
        models: [44],
        sortOrder: ['createdAt', 'ASC'],
      }),
    )
    expect(store.statuses).toEqual([0, 1])
  })

  it('loadFilterOptions populates option lists and resolves location names', async () => {
    vehiclesApi.fetchModelOptions.mockResolvedValue([{ title: 'Honda Dio', value: 44 }])
    vehiclesApi.fetchLessorOptions.mockResolvedValue([{ title: 'VPR Ventures', value: 11 }])
    homeApi.fetchLocations.mockResolvedValue([{ id: 1, name: 'Kormangala' }])
    const store = useVehiclesStore()

    await store.loadFilterOptions()

    expect(store.modelOptions).toEqual([{ title: 'Honda Dio', value: 44 }])
    expect(store.locationsById.get(1)).toBe('Kormangala')
    expect(store.optionsLoaded).toBe(true)
  })
})
