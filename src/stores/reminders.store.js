import { defineStore } from 'pinia'
import * as vehiclesApi from '../services/vehicles/vehicles.api'

export const EXPIRY_OPTIONS = [
  { title: 'RC Expired', value: 'rc' },
  { title: 'Insurance Expired', value: 'insurance' },
  { title: 'Permit Expired', value: 'permit' },
  { title: 'PUCC Expired', value: 'pucc' },
]

/**
 * Reminders page (expired-document vehicles) state.
 *
 * Fixes a real bug from the old app's `reminders.vue::getVehicles()`:
 * it replaced `this.vehicles` with each response instead of appending
 * (`this.vehicles = data.data || []`), and unconditionally set
 * `this.offset = this.limit` on every call instead of accumulating it —
 * so "Load More" always re-requested and re-displayed the exact same
 * second page forever, discarding the first page and never reaching a
 * third. Fixed here: `rows` accumulates across pages, `offset` advances
 * by `limit` each time.
 */
export const useRemindersStore = defineStore('reminders', {
  state: () => ({
    expiryType: EXPIRY_OPTIONS[0].value,
    limit: 100,
    offset: 0,
    rows: [],
    total: 0,
    loading: false,
    error: null,
  }),
  getters: {
    hasMore: (state) => state.rows.length < state.total,
  },
  actions: {
    /** A-159 — fetch the first page for a (possibly new) expiry type. */
    async load(expiryType = this.expiryType) {
      this.loading = true
      this.error = null
      try {
        const { rows, total } = await vehiclesApi.fetchExpiredVehicles({
          expiryType,
          limit: this.limit,
          offset: 0,
        })
        this.expiryType = expiryType
        this.rows = rows
        this.total = total
        this.offset = this.limit
      } catch (error) {
        this.error = error
        throw error
      } finally {
        this.loading = false
      }
    },

    /** Appends the next page for the current expiry type. */
    async loadMore() {
      this.loading = true
      try {
        const { rows, total } = await vehiclesApi.fetchExpiredVehicles({
          expiryType: this.expiryType,
          limit: this.limit,
          offset: this.offset,
        })
        this.rows = [...this.rows, ...rows]
        this.total = total
        this.offset += this.limit
      } catch (error) {
        this.error = error
        throw error
      } finally {
        this.loading = false
      }
    },
  },
})
