<script setup>
import { computed, onMounted, ref } from 'vue'
import * as inventoryApi from '../../services/inventory/inventory.api'
import { fetchLessorOptions } from '../../services/vehicles/vehicles.api'
import { toUserMessage } from '../../utils/errorMessage'
import EmptyState from '../../components/common/EmptyState.vue'

const showStats = ref(true)

const lessorOptions = ref([{ title: 'All', value: null }])
const lessorFilter = ref(null) // null = all lessors
const search = ref('')
let searchDebounce

const loading = ref(true)
const error = ref(null)
const rows = ref([])
const totalVehicles = ref(0)

function sum(field) {
  return rows.value.reduce((acc, row) => acc + (Number(row[field]) || 0), 0)
}

// Port of the old app's `stockCount.vue` stat strip: every card is derived
// from the A-108 rows (so it follows the lessor/search filter), *not* from
// the fleet-wide A-109 stats the Home page shows. `count` in the A-108
// response is the total vehicle count for the current filter. `statuses`
// uses VehicleStatusBadge.vue's numeric vehicle-status enum.
//
// Deviations from the old app (deliberate fixes):
// - "Total" links to the vehicles list with no status filter (the old app
//   sent `statuses=0`, i.e. Available only).
// - "Servicing" counts under service + ongoing service + water wash, so the
//   number matches the 2,4,5 status set it links to (the old app counted
//   `underService` only).
const stats = computed(() => [
  { label: 'Total', count: totalVehicles.value, statuses: [] },
  { label: 'Available', count: sum('available'), statuses: [0] },
  { label: 'Booked', count: sum('booked'), statuses: [1] },
  {
    label: 'Servicing',
    count: sum('underService') + sum('ongoingService') + sum('waterWash'),
    statuses: [2, 4, 5],
  },
  { label: 'Returned', count: sum('returned'), statuses: [6] },
  { label: 'Sold', count: sum('sold'), statuses: [7] },
  { label: 'Not Working', count: sum('notWorking'), statuses: [3] },
  { label: 'Scrapped', count: sum('scrapped'), statuses: [8] },
])

function statLink(stat) {
  const query = {}
  if (stat.statuses.length) query.statuses = stat.statuses.join(',')
  if (lessorFilter.value !== null) query.lessors = String(lessorFilter.value)
  return { name: 'vehicles', query }
}

async function loadModelInventory() {
  loading.value = true
  error.value = null
  try {
    const result = await inventoryApi.fetchModelInventory({
      lessor: lessorFilter.value,
      searchQuery: search.value,
    })
    rows.value = result.rows
    totalVehicles.value = result.total
  } catch (err) {
    error.value = err
  } finally {
    loading.value = false
  }
}

function onSearchInput(value) {
  search.value = value ?? ''
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(loadModelInventory, 350)
}

async function loadLessorOptions() {
  try {
    lessorOptions.value = [{ title: 'All', value: null }, ...(await fetchLessorOptions())]
  } catch {
    // Non-critical — the lessor filter just falls back to "All" only.
  }
}

onMounted(() => {
  loadModelInventory()
  loadLessorOptions()
})
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-3">
      <h2 class="text-h5 font-weight-medium">Inventory</h2>
      <v-btn
        :icon="showStats ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        variant="text"
        color="primary"
        density="comfortable"
        :aria-label="showStats ? 'Hide stats' : 'Show stats'"
        @click="showStats = !showStats"
      />
    </div>

    <!-- Stat strip, derived from the A-108 rows below -->
    <v-expand-transition>
      <div v-if="showStats">
        <div v-if="loading && rows.length === 0" class="d-flex ga-3 mb-4" style="overflow-x: auto">
          <v-skeleton-loader v-for="n in 6" :key="n" type="card" width="150" height="100" />
        </div>
        <div v-else-if="!error" class="d-flex ga-3 mb-4 pb-1" style="overflow-x: auto">
          <v-card
            v-for="stat in stats"
            :key="stat.label"
            variant="outlined"
            rounded="lg"
            class="pa-4 flex-shrink-0 text-center"
            style="min-width: 150px"
            :to="statLink(stat)"
          >
            <div class="text-h5 font-weight-bold">{{ stat.count }}</div>
            <div class="text-body-2 text-medium-emphasis text-no-wrap">{{ stat.label }}</div>
          </v-card>
        </div>
      </div>
    </v-expand-transition>

    <!-- Lessor filter + model search (A-108) -->
    <div class="d-flex align-center flex-wrap ga-3 mb-3">
      <v-select
        v-model="lessorFilter"
        :items="lessorOptions"
        density="compact"
        variant="outlined"
        hide-details
        rounded="lg"
        style="max-width: 260px"
        @update:model-value="loadModelInventory"
      />
      <v-text-field
        :model-value="search"
        placeholder="Search model here"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        rounded="lg"
        class="flex-grow-1"
        style="min-width: 220px"
        @update:model-value="onSearchInput"
      />
    </div>

    <div class="text-body-2 text-medium-emphasis mb-3">{{ rows.length }} Models Found</div>

    <div v-if="loading && rows.length === 0" class="d-flex flex-column ga-2">
      <v-skeleton-loader v-for="n in 3" :key="n" type="table-row" />
    </div>
    <EmptyState
      v-else-if="error"
      icon="mdi-alert-circle-outline"
      title="Couldn't load model inventory"
      :message="toUserMessage(error)"
    >
      <v-btn class="mt-2" variant="tonal" color="primary" @click="loadModelInventory">Retry</v-btn>
    </EmptyState>
    <EmptyState v-else-if="rows.length === 0" icon="mdi-motorbike" title="No models found" />
    <v-card v-else>
      <v-table fixed-header class="inventory-table text-no-wrap" :class="{ 'opacity-60': loading }">
        <thead>
          <tr>
            <th>Name</th>
            <th>Available</th>
            <th>Booked</th>
            <th>Under Service</th>
            <th>Not Working</th>
            <th>Ongoing Service</th>
            <th>Water Wash</th>
            <th>Returned</th>
            <th>Sold</th>
            <th>Scrapped</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>
              <div class="d-flex align-center ga-3 py-2">
                <v-img
                  v-if="row.image"
                  :src="row.image"
                  width="48"
                  height="32"
                  class="flex-grow-0"
                />
                <v-icon v-else icon="mdi-motorbike" color="grey" />
                <span class="text-truncate" style="max-width: 160px" :title="row.name">
                  {{ row.name ?? '—' }}
                </span>
              </div>
            </td>
            <td>{{ row.available }}</td>
            <td>{{ row.booked }}</td>
            <td>{{ row.underService }}</td>
            <td>{{ row.notWorking }}</td>
            <td>{{ row.ongoingService }}</td>
            <td>{{ row.waterWash }}</td>
            <td>{{ row.returned }}</td>
            <td>{{ row.sold }}</td>
            <td>{{ row.scrapped }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </div>
</template>

<style scoped>
.inventory-table tbody tr:nth-child(odd) {
  background: rgba(var(--v-theme-on-surface), 0.04);
}
</style>
