import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCustomersStore } from '../../src/stores/customers.store'
import * as customersApi from '../../src/services/customers/customers.api'

vi.mock('../../src/services/customers/customers.api')

describe('customers store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('fetchPage loads page 1 and maps the confirmed A-058 row shape', async () => {
    customersApi.fetchCustomers.mockResolvedValue({
      rows: [
        {
          id: 1,
          fName: 'Ann',
          lName: 'Lee',
          mobile: '9990001111',
          email: 'ann@example.com',
          createdAt: '2026-09-18T06:35:48.000Z',
          source: 'direct',
          blacklist: true,
          absconding: false,
          status: 1,
        },
      ],
      total: 1,
    })
    const store = useCustomersStore()

    await store.fetchPage()

    expect(store.rows[0]).toMatchObject({
      id: 1,
      name: 'Ann Lee',
      phone: '9990001111',
      email: 'ann@example.com',
      source: 'direct',
      active: true,
      blacklisted: true,
      absconding: false,
    })
    expect(store.total).toBe(1)
    expect(store.loading).toBe(false)
  })

  it('passes search/status through to the API (status mapped to its numeric value) and resets to page 1', async () => {
    customersApi.fetchCustomers.mockResolvedValue({ rows: [], total: 0 })
    const store = useCustomersStore()

    await store.fetchPage({ search: 'ann', status: 'halt' })

    expect(customersApi.fetchCustomers).toHaveBeenCalledWith({
      page: 1,
      limit: store.limit,
      searchTerm: 'ann',
      status: 0,
    })
    expect(store.page).toBe(1)
    expect(store.search).toBe('ann')
    expect(store.status).toBe('halt')
  })

  it('surfaces the error and leaves loading false on failure', async () => {
    customersApi.fetchCustomers.mockRejectedValue(new Error('network error'))
    const store = useCustomersStore()

    await expect(store.fetchPage()).rejects.toThrow('network error')

    expect(store.error).toBeInstanceOf(Error)
    expect(store.loading).toBe(false)
  })

  it('loadMore appends the next page instead of replacing rows', async () => {
    customersApi.fetchCustomers
      .mockResolvedValueOnce({ rows: [{ id: 1, fName: 'Ann' }], total: 2 })
      .mockResolvedValueOnce({ rows: [{ id: 2, fName: 'Bea' }], total: 2 })
    const store = useCustomersStore()

    await store.fetchPage()
    await store.loadMore()

    expect(customersApi.fetchCustomers).toHaveBeenLastCalledWith({
      page: 2,
      limit: store.limit,
      searchTerm: '',
      status: 1,
    })
    expect(store.rows.map((r) => r.id)).toEqual([1, 2])
    expect(store.hasMore).toBe(false)
  })

  it('loadMore is a no-op once every row has been loaded', async () => {
    customersApi.fetchCustomers.mockResolvedValue({ rows: [{ id: 1, fName: 'Ann' }], total: 1 })
    const store = useCustomersStore()

    await store.fetchPage()
    await store.loadMore()

    expect(customersApi.fetchCustomers).toHaveBeenCalledOnce()
    expect(store.rows).toHaveLength(1)
  })
})
