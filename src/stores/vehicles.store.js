import { defineStore } from 'pinia'
import * as vehiclesApi from '../services/vehicles/vehicles.api'
import { fetchLocations } from '../services/home/home.api'
import { firstPresent, lessorName } from '../utils/fields'

// A-158 row shape — CONFIRMED against the live backend 2026-09-07 (see
// docs/api-reference.md A-158 for the full field dump). Envelope is
// `{ count, rows }`. Each row embeds `modelData`/`lessorData` (the
// backend denormalizes these), so model/lessor read the real name off
// the nested objects rather than the bare id fields. `locationData` is
// NOT embedded on this endpoint (unlike A-165's single-vehicle read), so
// the location column is resolved client-side from a separate A-100
// lookup (see `locationsById` below) rather than shown as a bare id.
// `subStatus` is a real human-readable string ("Default" etc.); the
// numeric `status` code has no documented enum beyond what
// VehicleStatusBadge.vue already captures.
function toRow(record, locationsById) {
  return {
    id: firstPresent(record, ['id']),
    registrationNumber: record?.registrationNumber ?? null,
    model: record?.modelData?.name ?? null,
    lessor: lessorName(record?.lessorData),
    color: record?.color ?? null,
    location: locationsById.get(record?.location) ?? null,
    subStatus: record?.subStatus ?? null,
    statusCode: record?.status ?? null,
    raw: record,
  }
}

// Sort options — the old app's own labels were inverted (its "Newest"
// entry actually sorted ascending, i.e. oldest-first); fixed here rather
// than replicated. Values are plain strings, not `[field, direction]`
// arrays: a v-select can't match a selected value back to an option by
// reference equality, and each array here would be a fresh reference on
// every read of `sortOrder` from Pinia state — the dropdown would render
// but silently fail to show a matching selected label. `toApiSortOrder()`
// converts back to the array shape the real endpoint expects.
export const SORT_OPTIONS = [
  { title: 'Newest', value: 'DESC' },
  { title: 'Oldest', value: 'ASC' },
]
export function toApiSortOrder(direction) {
  return ['createdAt', direction]
}

export const useVehiclesStore = defineStore('vehicles', {
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
    lessors: [],
    locations: [],
    manufactureYears: [],
    sortDirection: SORT_OPTIONS[0].value,

    // Filter option lists
    modelOptions: [],
    lessorOptions: [],
    locationOptions: [],
    locationsById: new Map(),
    optionsLoaded: false,
  }),
  getters: {
    rows: (state) => state.rawRows.map((row) => toRow(row, state.locationsById)),
    pageCount: (state) => Math.max(1, Math.ceil(state.total / state.limit)),
  },
  actions: {
    async loadFilterOptions() {
      if (this.optionsLoaded) return
      try {
        const [models, lessors, locations] = await Promise.all([
          vehiclesApi.fetchModelOptions(),
          vehiclesApi.fetchLessorOptions(),
          fetchLocations(),
        ])
        this.modelOptions = models
        this.lessorOptions = lessors
        this.locationOptions = locations.map((loc) => ({ title: loc.name, value: loc.id }))
        this.locationsById = new Map(locations.map((loc) => [loc.id, loc.name]))
        this.optionsLoaded = true
      } catch {
        // Filters degrade gracefully — the list itself still works with
        // empty option lists, just nothing to pick from yet.
      }
    },

    /** A-158 — fetch a page of the vehicles list. */
    async fetchPage({
      page = this.page,
      search = this.search,
      statuses = this.statuses,
      models = this.models,
      lessors = this.lessors,
      locations = this.locations,
      manufactureYears = this.manufactureYears,
      sortDirection = this.sortDirection,
    } = {}) {
      this.loading = true
      this.error = null
      try {
        const { rows, total } = await vehiclesApi.fetchVehicles({
          page,
          limit: this.limit,
          searchQuery: search,
          statuses,
          models,
          lessors,
          locations,
          manufactureDate: manufactureYears,
          sortOrder: toApiSortOrder(sortDirection),
        })
        this.rawRows = rows
        this.total = total
        this.page = page
        this.search = search
        this.statuses = statuses
        this.models = models
        this.lessors = lessors
        this.locations = locations
        this.manufactureYears = manufactureYears
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
