<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useDisplay } from 'vuetify'
import { useVehiclesStore, SORT_OPTIONS } from '../../stores/vehicles.store'
import { useQueryFilters } from '../../composables/useQueryFilters'
import { exportRows } from '../../utils/export'
import { toUserMessage } from '../../utils/errorMessage'
import EmptyState from '../../components/common/EmptyState.vue'
import FilterChecklist from '../../components/common/FilterChecklist.vue'
import VehicleListCard from '../../components/vehicles/VehicleListCard.vue'

const store = useVehiclesStore()
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
  lessors,
  locations,
  manufactureYears,
  sortDirection,
  modelOptions,
  lessorOptions,
  locationOptions,
} = storeToRefs(store)

const STATUS_OPTIONS = [
  { title: 'Available', value: 0 },
  { title: 'Booked', value: 1 },
  { title: 'Under Service', value: 2 },
  { title: 'Not Working', value: 3 },
  { title: 'Ongoing Service', value: 4 },
  { title: 'Water Wash', value: 5 },
  { title: 'Returned', value: 6 },
  { title: 'Sold', value: 7 },
  { title: 'Scrapped', value: 8 },
]
// The old app offered years 2015-2025 as a hardcoded list; generated from
// the current year instead so it doesn't need updating by hand each year.
const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => {
  const year = String(currentYear - i)
  return { title: year, value: year }
})

const { readArray, readString, readInt, replaceQuery } = useQueryFilters()
const { mobile } = useDisplay()

const showSidebars = ref(true)
const mobileFiltersOpen = ref(false)
const searchInput = ref(readString('search', search.value))
let searchDebounce

function toggleFilters() {
  if (mobile.value) {
    mobileFiltersOpen.value = true
  } else {
    showSidebars.value = !showSidebars.value
  }
}

function load({
  page: nextPage = page.value,
  search: nextSearch = search.value,
  statuses: nextStatuses = statuses.value,
  models: nextModels = models.value,
  lessors: nextLessors = lessors.value,
  locations: nextLocations = locations.value,
  manufactureYears: nextYears = manufactureYears.value,
  sortDirection: nextSort = sortDirection.value,
} = {}) {
  replaceQuery({
    page: nextPage > 1 ? nextPage : undefined,
    search: nextSearch,
    statuses: nextStatuses,
    models: nextModels,
    lessors: nextLessors,
    locations: nextLocations,
    manufactureYears: nextYears,
    sortDirection: nextSort !== SORT_OPTIONS[0].value ? nextSort : undefined,
  })
  return store.fetchPage({
    page: nextPage,
    search: nextSearch,
    statuses: nextStatuses,
    models: nextModels,
    lessors: nextLessors,
    locations: nextLocations,
    manufactureYears: nextYears,
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
    lessors.value.length ||
    locations.value.length ||
    manufactureYears.value.length,
)

function clearFilters() {
  load({
    page: 1,
    statuses: [],
    models: [],
    lessors: [],
    locations: [],
    manufactureYears: [],
  })
}

function toggleStatus(value) {
  const next = statuses.value.includes(value)
    ? statuses.value.filter((s) => s !== value)
    : [...statuses.value, value]
  load({ page: 1, statuses: next })
}

const rangeStart = computed(() => (total.value ? (page.value - 1) * limit.value + 1 : 0))
const rangeEnd = computed(() => Math.min(page.value * limit.value, total.value))
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

// Exports whatever's on the current page — the old app instead
// accumulated every page loaded so far via infinite scroll and exported
// that; this app's list is server-paginated instead, so "export" here
// means the current page's rows, matching what's visibly on screen.
function exportCurrentPage(format) {
  const data = rows.value.map((row) => ({
    RegistrationNumber: row.registrationNumber,
    ModelName: row.model,
    LessorName: row.lessor,
    Location: row.location,
    Status: row.subStatus,
    Color: row.color,
  }))
  exportRows(data, format, 'vehicles')
}

onMounted(() => {
  store.loadFilterOptions()
  load({
    page: readInt('page', 1),
    search: readString('search', ''),
    statuses: readArray('statuses', { numeric: true }),
    models: readArray('models', { numeric: true }),
    lessors: readArray('lessors', { numeric: true }),
    locations: readArray('locations', { numeric: true }),
    manufactureYears: readArray('manufactureYears'),
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
        <FilterChecklist
          title="MFG Year"
          :items="YEAR_OPTIONS"
          :model-value="manufactureYears"
          :initial-visible="5"
          @update:model-value="(value) => load({ page: 1, manufactureYears: value })"
          @clear="load({ page: 1, manufactureYears: [] })"
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
          <!-- <v-btn
            variant="tonal"
            size="small"
            prepend-icon="mdi-bell-alert-outline"
            :to="{ name: 'vehicle-reminders' }"
          >
            Reminders
          </v-btn> -->
          <!-- <v-btn
            variant="tonal"
            size="small"
            prepend-icon="mdi-map-marker-radius-outline"
            :to="{ name: 'vehicle-gps-tracker' }"
          >
            GPS Tracker
          </v-btn> -->
          <v-btn color="primary" variant="flat" rounded="lg" @click="toggleFilters">Filters</v-btn>
          <v-menu>
            <template #activator="{ props: menuProps }">
              <v-btn
                color="grey-darken-3"
                variant="flat"
                append-icon="mdi-chevron-down"
                v-bind="menuProps"
                rounded="lg"
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
          placeholder="Search vehicle number or model name or chassis number."
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
            <template v-else-if="!loading">No vehicles found</template>
          </div>
          <div>
            <v-btn
              v-if="hasFilters"
              variant="text"
              size="small"
              color="primary"
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
        title="Couldn't load vehicles"
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
          message="No vehicles match your search."
        />

        <div v-else class="d-flex flex-column ga-3">
          <VehicleListCard
            v-for="item in rows"
            :key="item.id ?? item.registrationNumber"
            :item="item"
          />
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
          title="Lessor"
          :items="lessorOptions"
          :model-value="lessors"
          @update:model-value="(value) => load({ page: 1, lessors: value })"
          @clear="load({ page: 1, lessors: [] })"
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
            title="MFG Year"
            :items="YEAR_OPTIONS"
            :model-value="manufactureYears"
            :initial-visible="5"
            @update:model-value="(value) => load({ page: 1, manufactureYears: value })"
            @clear="load({ page: 1, manufactureYears: [] })"
          />
          <FilterChecklist
            title="Location"
            :items="locationOptions"
            :model-value="locations"
            @update:model-value="(value) => load({ page: 1, locations: value })"
            @clear="load({ page: 1, locations: [] })"
          />
          <FilterChecklist
            title="Status"
            :items="STATUS_OPTIONS"
            :model-value="statuses"
            @update:model-value="(value) => load({ page: 1, statuses: value })"
            @clear="load({ page: 1, statuses: [] })"
          />
          <FilterChecklist
            title="Lessor"
            :items="lessorOptions"
            :model-value="lessors"
            @update:model-value="(value) => load({ page: 1, lessors: value })"
            @clear="load({ page: 1, lessors: [] })"
          />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn v-if="hasFilters" rounded="lg" variant="text" @click="clearFilters"
          >Clear all filters</v-btn
        >
        <v-spacer />
        <v-btn color="primary" rounded="lg" variant="flat" @click="mobileFiltersOpen = false"
          >Done</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* Sticky at every width — the toolbar (sort/Filters/Export/search) renders
   at all screen sizes and should stay pinned while the card list scrolls
   underneath it there too, not just on desktop. The sidebar `v-col`s this
   class also sits on are already hidden below the `md` breakpoint via
   `v-if="showSidebars && !mobile"`, so they're simply absent from the DOM
   on small screens — nothing extra needed to keep this rule from doing
   anything unwanted there. */
.sticky-top {
  position: sticky;
  top: 0px;
  z-index: 2;
  padding-top: 4px;
}

/* Mobile-only quick Status row under the search field — a horizontally
   scrollable strip rather than wrapping, since the full Status list (9
   options) would otherwise eat several lines of vertical space right
   above the card list on a phone-width screen. The full Status filter
   (with the rest) is still reachable via the "Filters" bottom sheet. */
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
