import { defineStore } from 'pinia'
import * as customersApi from '../services/customers/customers.api'
import { firstPresent } from '../utils/fields'

// A-058 row shape — CONFIRMED against the live backend 2026-09-18 (real
// payload dump, see docs/api-reference.md A-058). Every field this store
// reads below is real, not guessed.
//
// `status` — CONFIRMED live: `1` renders as "Active" in the reference UI.
// `0` for "Halt" is an ASSUMPTION (only an active row has been observed
// so far, verify the Halt value with a real halted customer).
const STATUS_VALUES = {
  active: 1,
  halt: 0, // ASSUMPTION — verify with backend
}

function fullName(record) {
  const first = record?.fName ?? ''
  const last = record?.lName ?? ''
  const combined = [first, last].filter(Boolean).join(' ').trim()
  return combined || null
}

function toRow(record) {
  return {
    id: firstPresent(record, ['id']),
    name: fullName(record),
    phone: firstPresent(record, ['mobile']),
    email: firstPresent(record, ['email']),
    createdAt: record?.createdAt ?? null,
    source: record?.source ?? null,
    active: record?.status === STATUS_VALUES.active,
    blacklisted: Boolean(record?.blacklist),
    absconding: Boolean(record?.absconding),
    statusCode: record?.status ?? null,
    raw: record,
  }
}

export const useCustomersStore = defineStore('customers', {
  state: () => ({
    rawRows: [],
    total: 0,
    page: 1,
    limit: 10,
    search: '',
    status: 'active', // 'active' | 'halt'
    loading: false,
    loadingMore: false,
    error: null,
  }),
  getters: {
    rows: (state) => state.rawRows.map(toRow),
    hasMore: (state) => state.rawRows.length < state.total,
  },
  actions: {
    /** A-058 — (re)load from page 1, e.g. on mount or when search/status changes. */
    async fetchPage({ search = this.search, status = this.status } = {}) {
      this.loading = true
      this.error = null
      try {
        const { rows, total } = await customersApi.fetchCustomers({
          page: 1,
          limit: this.limit,
          searchTerm: search,
          status: STATUS_VALUES[status],
        })
        this.rawRows = rows
        this.total = total
        this.page = 1
        this.search = search
        this.status = status
      } catch (error) {
        this.error = error
        throw error
      } finally {
        this.loading = false
      }
    },

    /** A-058 — append the next page (infinite scroll). */
    async loadMore() {
      if (this.loadingMore || !this.hasMore) return
      this.loadingMore = true
      try {
        const nextPage = this.page + 1
        const { rows, total } = await customersApi.fetchCustomers({
          page: nextPage,
          limit: this.limit,
          searchTerm: this.search,
          status: STATUS_VALUES[this.status],
        })
        this.rawRows = [...this.rawRows, ...rows]
        this.total = total
        this.page = nextPage
      } catch (error) {
        this.error = error
        throw error
      } finally {
        this.loadingMore = false
      }
    },
  },
})
