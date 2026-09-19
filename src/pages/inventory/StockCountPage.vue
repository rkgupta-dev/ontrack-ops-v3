<script setup>
import { onMounted, ref } from 'vue'
import * as inventoryApi from '../../services/inventory/inventory.api'
import { fetchLessorOptions } from '../../services/vehicles/vehicles.api'
import { toUserMessage } from '../../utils/errorMessage'
import EmptyState from '../../components/common/EmptyState.vue'

const statsLoading = ref(true)
const statsError = ref(null)
const stats = ref([])

const lessorOptions = ref([{ title: 'All Lessors', value: null }])
const lessorFilter = ref(null) // null = all lessors
const search = ref('')
let searchDebounce

const modelInventoryLoading = ref(true)
const modelInventoryError = ref(null)
const modelInventoryRows = ref([])
const modelInventoryTotal = ref(0)

// "Asset Under Management" rolls up every status a vehicle can be in while
// still part of the active fleet — everything up to (but not including)
// Returned/Sold/Scrapped, matching VehicleStatusBadge.vue's numeric enum
// (0 Available … 5 Water Wash) — so it's the one stat card that maps to a
// *set* of vehicle statuses rather than a single one, and needs its own
// hardcoded list here rather than the per-stat `status` field the other
// cards (Available, Booked, Under Service, ...) use below.
const ASSET_UNDER_MANAGEMENT_STATUSES = [0, 1, 2, 3, 4, 5]

// A-109's per-stat `status` field (docs/api-reference.md) — ASSUMPTION:
// the same numeric enum VehicleStatusBadge.vue already documents for the
// vehicles list, since both describe the same vehicle-status domain;
// not independently confirmed for this specific endpoint. The `Total`
// entry has no single status, so it (and anything else without one)
// simply isn't linked.
function statLink(stat) {
  if (stat.label === 'Asset Under Management') {
    return { name: 'vehicles', query: { statuses: ASSET_UNDER_MANAGEMENT_STATUSES.join(',') } }
  }
  if (stat.status !== undefined && stat.status !== null) {
    return { name: 'vehicles', query: { statuses: String(stat.status) } }
  }
  return null
}

async function loadStats() {
  statsLoading.value = true
  statsError.value = null
  try {
    stats.value = await inventoryApi.fetchInventoryStats()
  } catch (error) {
    statsError.value = error
  } finally {
    statsLoading.value = false
  }
}

async function loadModelInventory() {
  modelInventoryLoading.value = true
  modelInventoryError.value = null
  try {
    const result = await inventoryApi.fetchModelInventory({
      lessor: lessorFilter.value,
      searchQuery: search.value,
    })
    modelInventoryRows.value = result.rows
    modelInventoryTotal.value = result.total
  } catch (error) {
    modelInventoryError.value = error
  } finally {
    modelInventoryLoading.value = false
  }
}

function onLessorFilterChange() {
  loadModelInventory()
}

function onSearchInput(value) {
  search.value = value
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(loadModelInventory, 350)
}

async function loadLessorOptions() {
  try {
    lessorOptions.value = [{ title: 'All Lessors', value: null }, ...(await fetchLessorOptions())]
  } catch {
    // Non-critical — the lessor filter just falls back to "All" only.
  }
}

onMounted(() => {
  loadStats()
  loadModelInventory()
  loadLessorOptions()
})
</script>

<template>
  <div>
    <h2 class="text-h5 font-weight-medium mb-3">Inventory</h2>

    <!-- Fleet inventory stat strip (A-109) -->
    <div v-if="statsLoading" class="d-flex ga-3 mb-6" style="overflow-x: auto">
      <v-skeleton-loader v-for="n in 6" :key="n" type="card" width="160" height="90" />
    </div>
    <EmptyState
      v-else-if="statsError"
      icon="mdi-alert-circle-outline"
      title="Couldn't load fleet stats"
      :message="toUserMessage(statsError)"
      class="mb-6"
    >
      <v-btn class="mt-2" variant="tonal" color="primary" @click="loadStats">Retry</v-btn>
    </EmptyState>
    <div v-else class="d-flex ga-3 mb-6 pb-1" style="overflow-x: auto">
      <v-card
        v-for="stat in stats"
        :key="stat.label"
        variant="outlined"
        rounded="lg"
        class="pa-4 flex-shrink-0"
        style="min-width: 160px"
        :to="statLink(stat)"
        :link="Boolean(statLink(stat))"
      >
        <div class="d-flex align-baseline ga-2">
          <span class="text-h5 font-weight-bold">{{ stat.count }}</span>
          <span v-if="stat.percentage !== undefined" class="text-caption text-success">
            {{ stat.percentage }}%
          </span>
        </div>
        <div class="text-caption font-weight-medium text-medium-emphasis text-no-wrap">
          {{ stat.label }}
        </div>
      </v-card>
    </div>

    <!-- Lessor filter + model search (A-108) -->
    <div class="d-flex align-center flex-wrap ga-3 mb-3">
      <v-select
        v-model="lessorFilter"
        :items="lessorOptions"
        density="compact"
        variant="outlined"
        hide-details
        rounded="lg"
        style="max-width: 220px"
        @update:model-value="onLessorFilterChange"
      />
      <v-text-field
        :model-value="search"
        placeholder="Search model here"
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

    <div class="text-body-2 text-medium-emphasis mb-3">{{ modelInventoryTotal }} Models Found</div>

    <div v-if="modelInventoryLoading" class="d-flex flex-column ga-2">
      <v-skeleton-loader v-for="n in 3" :key="n" type="table-row" />
    </div>
    <EmptyState
      v-else-if="modelInventoryError"
      icon="mdi-alert-circle-outline"
      title="Couldn't load model inventory"
      :message="toUserMessage(modelInventoryError)"
    >
      <v-btn class="mt-2" variant="tonal" color="primary" @click="loadModelInventory">Retry</v-btn>
    </EmptyState>
    <EmptyState
      v-else-if="modelInventoryRows.length === 0"
      icon="mdi-motorbike"
      title="No models found"
    />
    <v-table v-else fixed-header>
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
        <tr v-for="row in modelInventoryRows" :key="row.id">
          <td>
            <div class="d-flex align-center ga-2 py-2">
              <v-avatar size="28" rounded="lg" color="grey-lighten-3">
                <v-img v-if="row.image" :src="row.image" cover />
                <v-icon v-else icon="mdi-motorbike" size="16" color="grey" />
              </v-avatar>
              <span>{{ row.name ?? '—' }}</span>
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
  </div>
</template>
