import { defineStore } from 'pinia'
import * as bookingsApi from '../services/bookings/bookings.api'
import { fetchModelOptions } from '../services/vehicles/vehicles.api'
import { fetchLocations } from '../services/home/home.api'
import { firstPresent } from '../utils/fields'

// Sort options — same reasoning/shape as vehicles.store.js's SORT_OPTIONS
// (not imported from there to avoid a cross-domain store dependency for
// ten lines of identical, generic "sort by createdAt" plumbing).
export const SORT_OPTIONS = [
  { title: 'Newest', value: 'DESC' },
  { title: 'Oldest', value: 'ASC' },
]
export function toApiSortOrder(direction) {
  return ['createdAt', direction]
}

// A-024 row shape — CONFIRMED against the live backend 2026-09-07 (see
// docs/api-reference.md A-024 for the full field dump). Envelope is
// `{ count, rows }`. Each row embeds `customerData`/`vehicleData`/
// `modelData` (the backend denormalizes these for the list endpoint), so
// the customer/vehicle columns read the *real* name/registration off the
// nested objects rather than the bare `customer`/`vehicle` id fields. The
// numeric `status` code has no documented enum — shown as-is.
function fullName(record) {
  const first = record?.fName ?? ''
  const last = record?.lName ?? ''
  const combined = [first, last].filter(Boolean).join(' ').trim()
  return combined || null
}

function toRow(record) {
  return {
    id: firstPresent(record, ['id', 'bookingId']),
    // The route/detail-fetch param — A-046's `bookingId` filter matches
    // this string field specifically, not the numeric `id` above.
    bookingId: record?.bookingId ?? null,
    customer: fullName(record?.customerData),
    vehicleRegistration: record?.vehicleData?.registrationNumber ?? null,
    model: record?.modelData?.name ?? null,
    statusCode: record?.status ?? null,
    startDate: record?.startDate ?? null,
    endDate: record?.endDate ?? null,
    raw: record,
  }
}

export const useBookingsStore = defineStore('bookings', {
  state: () => ({
    rawRows: [],
    total: 0,
    page: 1,
    limit: 25,
    search: '',
    loading: false,
    error: null,

    // Filters
    statuses: [],
    models: [],
    locations: [],
    planTypes: [],
    sortDirection: SORT_OPTIONS[0].value,

    // Filter option lists
    modelOptions: [],
    locationOptions: [],
    optionsLoaded: false,
  }),
  getters: {
    rows: (state) => state.rawRows.map(toRow),
    pageCount: (state) => Math.max(1, Math.ceil(state.total / state.limit)),
  },
  actions: {
    async loadFilterOptions() {
      if (this.optionsLoaded) return
      try {
        const [models, locations] = await Promise.all([fetchModelOptions(), fetchLocations()])
        this.modelOptions = models
        this.locationOptions = locations.map((loc) => ({ title: loc.name, value: loc.id }))
        this.optionsLoaded = true
      } catch {
        // Filters degrade gracefully — the list itself still works with
        // empty option lists, just nothing to pick from yet.
      }
    },

    /** A-024 — fetch a page of the bookings list. */
    async fetchPage({
      page = this.page,
      search = this.search,
      statuses = this.statuses,
      models = this.models,
      locations = this.locations,
      planTypes = this.planTypes,
      sortDirection = this.sortDirection,
    } = {}) {
      this.loading = true
      this.error = null
      try {
        const { rows, total } = await bookingsApi.fetchBookings({
          page,
          limit: this.limit,
          searchQuery: search,
          statuses,
          models,
          locations,
          planTypes,
          sortOrder: toApiSortOrder(sortDirection),
        })
        this.rawRows = rows
        this.total = total
        this.page = page
        this.search = search
        this.statuses = statuses
        this.models = models
        this.locations = locations
        this.planTypes = planTypes
        this.sortDirection = sortDirection
      } catch (error) {
        this.error = error
        throw error
      } finally {
        this.loading = false
      }
    },
  },
})
