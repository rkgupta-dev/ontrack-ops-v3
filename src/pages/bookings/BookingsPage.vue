<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useDisplay } from 'vuetify'
import { useBookingsStore, SORT_OPTIONS } from '../../stores/bookings.store'
import { useQueryFilters } from '../../composables/useQueryFilters'
import { exportRows } from '../../utils/export'
import { toUserMessage } from '../../utils/errorMessage'
import { BOOKING_HISTORY_FILTERS } from '../../utils/bookingStatus'
import EmptyState from '../../components/common/EmptyState.vue'
import FilterChecklist from '../../components/common/FilterChecklist.vue'
import BookingListCard from '../../components/bookings/BookingListCard.vue'

const store = useBookingsStore()
const {
  rows,
  total,
  page,
  limit,
  search,
  loading,
  error,
  statuses,
  models,
  locations,
  planTypes,
  sortDirection,
  modelOptions,
  locationOptions,
} = storeToRefs(store)

// Derived from utils/bookingStatus.js's BOOKING_HISTORY_FILTERS (minus
// "Failed", which keys on `paymentStatus` rather than a `status` value the
// `statuses` filter param can send) — the same curated 5-status list/
// wording ("Active" for status `1`, not BOOKING_STATUS_META's "Ongoing")
// that BookingListCard.vue's status badge now uses too, so the filter
// checkboxes and the badges they filter by always agree.
const STATUS_OPTIONS = BOOKING_HISTORY_FILTERS.filter((f) => f.body.status !== undefined).map(
  (f) => ({ title: f.label, value: f.body.status }),
)
// Lowercase `planType` string values as read off booking records elsewhere
// (BookingFeedCard.vue's `item.planType.toLowerCase()`) — not confirmed as
// what A-024's `plan_types` filter itself expects.
const BOOKING_TYPE_OPTIONS = [
  { title: 'Weekly', value: 'weekly' },
  { title: 'Monthly', value: 'monthly' },
]

const { readArray, readString, readInt, replaceQuery } = useQueryFilters()
const { mobile } = useDisplay()

const showSidebars = ref(true)
const mobileFiltersOpen = ref(false)
const searchInput = ref(readString('search', search.value))
let searchDebounce

function toggleStatus(value) {
  const next = statuses.value.includes(value)
    ? statuses.value.filter((v) => v !== value)
    : [...statuses.value, value]
  load({ page: 1, statuses: next })
}

// function toggleFilters() {
//   if (mobile.value) {
//     mobileFiltersOpen.value = true
//   } else {
//     showSidebars.value = !showSidebars.value
//   }
// }

function load({
  page: nextPage = page.value,
  search: nextSearch = search.value,
  statuses: nextStatuses = statuses.value,
  models: nextModels = models.value,
  locations: nextLocations = locations.value,
  planTypes: nextPlanTypes = planTypes.value,
  sortDirection: nextSort = sortDirection.value,
} = {}) {
  replaceQuery({
    page: nextPage > 1 ? nextPage : undefined,
    search: nextSearch,
    statuses: nextStatuses,
    models: nextModels,
    locations: nextLocations,
    planTypes: nextPlanTypes,
    sortDirection: nextSort !== SORT_OPTIONS[0].value ? nextSort : undefined,
  })
  return store.fetchPage({
    page: nextPage,
    search: nextSearch,
    statuses: nextStatuses,
    models: nextModels,
    locations: nextLocations,
    planTypes: nextPlanTypes,
    sortDirection: nextSort,
  })
}

function onSearchInput(value) {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => load({ page: 1, search: value }), 350)
}

const hasFilters = computed(
  () =>
    statuses.value.length ||
    models.value.length ||
    locations.value.length ||
    planTypes.value.length,
)

function clearFilters() {
  load({ page: 1, statuses: [], models: [], locations: [], planTypes: [] })
}

const rangeStart = computed(() => (total.value ? (page.value - 1) * limit.value + 1 : 0))
const rangeEnd = computed(() => Math.min(page.value * limit.value, total.value))
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

function exportCurrentPage(format) {
  const data = rows.value.map((row) => ({
    BookingId: row.id,
    Customer: row.customer,
    VehicleRegistration: row.vehicleRegistration,
    Model: row.model,
    Status: row.statusCode,
    StartDate: row.startDate,
    EndDate: row.endDate,
  }))
  exportRows(data, format, 'bookings')
}

onMounted(() => {
  store.loadFilterOptions()
  load({
    page: readInt('page', 1),
    search: readString('search', ''),
    statuses: readArray('statuses', { numeric: true }),
    models: readArray('models', { numeric: true }),
    locations: readArray('locations', { numeric: true }),
    planTypes: readArray('planTypes'),
    sortDirection: readString('sortDirection', SORT_OPTIONS[0].value),
  })
})
</script>

<template>
  <v-row>
    <v-col v-if="showSidebars && !mobile" cols="12" md="3">
      <div class="d-flex flex-column ga-5 sticky-top">
        <FilterChecklist
          title="Model"
          :items="modelOptions"
          :model-value="models"
          @update:model-value="(value) => load({ page: 1, models: value })"
          @clear="load({ page: 1, models: [] })"
        />
      </div>
    </v-col>

    <v-col cols="12" :md="showSidebars ? 6 : 12">
      <div class="sticky-top bg-white">
        <div class="d-flex align-center flex-wrap ga-2 mb-3">
          <v-select
            :model-value="sortDirection"
            :items="SORT_OPTIONS"
            density="compact"
            hide-details
            variant="outlined"
            rounded="lg"
            style="max-width: 180px"
            @update:model-value="(value) => load({ page: 1, sortDirection: value })"
          />

          <v-spacer />
          <v-btn
            :to="{ name: 'booking-create' }"
            color="primary"
            variant="flat"
            append-icon="mdi-plus"
            rounded="lg"
          >
            Add
          </v-btn>

          <!-- <v-btn color="primary" variant="flat" @click="toggleFilters">Filters</v-btn> -->
          <v-menu>
            <template #activator="{ props: menuProps }">
              <v-btn
                color="grey-darken-3"
                variant="flat"
                rounded="lg"
                append-icon="mdi-chevron-down"
                v-bind="menuProps"
              >
                Export
              </v-btn>
            </template>
            <v-list density="compact">
              <v-list-item
                title="Export CSV"
                prepend-icon="mdi-download"
                @click="exportCurrentPage('csv')"
              />
              <v-list-item
                title="Export JSON"
                prepend-icon="mdi-download"
                @click="exportCurrentPage('json')"
              />
            </v-list>
          </v-menu>
        </div>

        <v-text-field
          v-model="searchInput"
          placeholder="Search customer name, number or model or booking id."
          variant="outlined"
          density="comfortable"
          hide-details
          clearable
          class="mb-3"
          rounded="lg"
          @update:model-value="onSearchInput"
        />

        <div v-if="mobile" class="d-flex ga-4 mb-2 status-scroll-row">
          <v-checkbox
            v-for="opt in STATUS_OPTIONS"
            :key="opt.value"
            :label="opt.title"
            :model-value="statuses.includes(opt.value)"
            density="compact"
            hide-details
            class="flex-shrink-0 status-checkbox"
            @update:model-value="toggleStatus(opt.value)"
          />
        </div>

        <div class="d-flex align-center justify-space-between mb-3">
          <div class="text-body-2 text-medium-emphasis">
            <template v-if="total">Showing {{ rangeStart }}-{{ rangeEnd }} of {{ total }}</template>
            <template v-else-if="!loading">No bookings found</template>
          </div>
          <div>
            <v-btn
              v-if="hasFilters"
              variant="text"
              size="small"
              color="primary"
              rounded="lg"
              @click="clearFilters"
            >
              Clear filters
            </v-btn>
          </div>
        </div>
      </div>

      <EmptyState
        v-if="error"
        icon="mdi-alert-circle-outline"
        title="Couldn't load bookings"
        :message="toUserMessage(error)"
      >
        <v-btn class="mt-4" variant="tonal" color="primary" @click="load()">Retry</v-btn>
      </EmptyState>

      <template v-else>
        <div v-if="loading && !rows.length" class="d-flex flex-column ga-3">
          <v-skeleton-loader v-for="n in 4" :key="n" type="card" />
        </div>

        <EmptyState
          v-else-if="!rows.length"
          icon="mdi-database-search-outline"
          title="Nothing here yet"
          message="No bookings match your search."
        />

        <div v-else class="d-flex flex-column ga-3">
          <BookingListCard v-for="item in rows" :key="item.id ?? item.bookingId" :item="item" />
        </div>

        <div v-if="total > limit" class="d-flex justify-center mt-4">
          <v-pagination
            :model-value="page"
            :length="pageCount"
            :total-visible="7"
            density="comfortable"
            @update:model-value="(value) => load({ page: value })"
          />
        </div>
      </template>
    </v-col>

    <v-col v-if="showSidebars && !mobile" cols="12" md="3">
      <div class="d-flex flex-column ga-5 sticky-top">
        <FilterChecklist
          title="Status"
          :items="STATUS_OPTIONS"
          :model-value="statuses"
          @update:model-value="(value) => load({ page: 1, statuses: value })"
          @clear="load({ page: 1, statuses: [] })"
        />
        <FilterChecklist
          title="Booking Type"
          :items="BOOKING_TYPE_OPTIONS"
          :model-value="planTypes"
          @update:model-value="(value) => load({ page: 1, planTypes: value })"
          @clear="load({ page: 1, planTypes: [] })"
        />
        <FilterChecklist
          title="Location"
          :items="locationOptions"
          :model-value="locations"
          @update:model-value="(value) => load({ page: 1, locations: value })"
          @clear="load({ page: 1, locations: [] })"
        />
      </div>
    </v-col>
  </v-row>

  <v-dialog v-model="mobileFiltersOpen" fullscreen scrollable transition="dialog-bottom-transition">
    <v-card>
      <v-toolbar color="surface">
        <v-toolbar-title>Filters</v-toolbar-title>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" @click="mobileFiltersOpen = false" />
      </v-toolbar>
      <v-card-text>
        <div class="d-flex flex-column ga-5">
          <FilterChecklist
            title="Model"
            :items="modelOptions"
            :model-value="models"
            @update:model-value="(value) => load({ page: 1, models: value })"
            @clear="load({ page: 1, models: [] })"
          />
          <FilterChecklist
            title="Status"
            :items="STATUS_OPTIONS"
            :model-value="statuses"
            @update:model-value="(value) => load({ page: 1, statuses: value })"
            @clear="load({ page: 1, statuses: [] })"
          />
          <FilterChecklist
            title="Booking Type"
            :items="BOOKING_TYPE_OPTIONS"
            :model-value="planTypes"
            @update:model-value="(value) => load({ page: 1, planTypes: value })"
            @clear="load({ page: 1, planTypes: [] })"
          />
          <FilterChecklist
            title="Location"
            :items="locationOptions"
            :model-value="locations"
            @update:model-value="(value) => load({ page: 1, locations: value })"
            @clear="load({ page: 1, locations: [] })"
          />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn v-if="hasFilters" variant="text" @click="clearFilters">Clear all filters</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="flat" @click="mobileFiltersOpen = false">Done</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* Sticky at every width — see VehiclesPage.vue's identical rule for why
   this doesn't need a breakpoint guard (the sidebar `v-col`s it also sits
   on are already hidden below `md` via `v-if="showSidebars && !mobile"`). */
.sticky-top {
  position: sticky;
  top: 0px;
  z-index: 2;
  padding-top: 4px;
}

/* Mobile-only quick Status row under the search field — same reasoning as
   VehiclesPage.vue's identical rule: a horizontally scrollable strip
   rather than wrapping, so it doesn't eat several lines of vertical space
   right above the card list on a phone-width screen. The full Status
   filter is still reachable via the "Filters" bottom sheet. */
.status-scroll-row {
  overflow-x: auto;
  scrollbar-width: none;
}

.status-scroll-row::-webkit-scrollbar {
  display: none;
}

.status-checkbox :deep(.v-label) {
  white-space: nowrap;
}
</style>
