<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import * as reportApi from '../../services/reports/vehicleReport.api'
import { fetchLessorOptions } from '../../services/vehicles/vehicles.api'
import { toUserMessage } from '../../utils/errorMessage'
import { ageMatrix, ageStockRows, modelStockRows } from '../../utils/vehicleReport'
import EmptyState from '../../components/common/EmptyState.vue'
import StockBarList from '../../components/reports/StockBarList.vue'

// Port of the old app's Inventory Utilisation Report (`views/vehicles/
// stats.vue` + its three `views/reports/*` chart components). Same four
// endpoints and lessor filter; the charts are redrawn rather than ported:
// - "By model" (A-111): one stacked booked/in-stock bar per model, sorted
//   by fleet size, with utilisation beside it — replaces the old grouped
//   In Stock/Rented/Total bars (Total was just the sum of the other two).
// - "By age" (A-156): aggregated across models into one bar per vehicle
//   age — replaces the old 16-series stacked chart, which was unreadable.
// - "Age mix" (A-157): a model × age heatmap table — replaces the old
//   9-colour stacked bar chart.
// The old page also fetched A-166 (operations/vehicle/report) on every
// lessor change, but only for a table that was commented out — not ported.

const lessorOptions = ref([{ title: 'All Lessors', value: null }])
const lessorFilter = ref(null)

function createSection(fetcher) {
  const section = reactive({ loading: true, error: null, data: null })
  // Only the latest request may write — a slow response for a previously
  // selected lessor must not overwrite the current one.
  let latest = 0
  section.load = async () => {
    const requestId = ++latest
    section.loading = true
    section.error = null
    try {
      const data = await fetcher({ lessor: lessorFilter.value })
      if (requestId === latest) section.data = data
    } catch (err) {
      if (requestId === latest) section.error = err
    } finally {
      if (requestId === latest) section.loading = false
    }
  }
  return section
}

const summary = createSection(reportApi.fetchReportSummary)
const byModel = createSection(reportApi.fetchCountByModel)
const byAge = createSection(reportApi.fetchAvailabilityByAge)
const ageMix = createSection(reportApi.fetchCountByAge)
const sections = [summary, byModel, byAge, ageMix]

const modelRows = computed(() => modelStockRows(byModel.data))
const ageRows = computed(() => ageStockRows(byAge.data))
const matrix = computed(() => ageMatrix(ageMix.data))

function loadAll() {
  sections.forEach((section) => section.load())
}

function cardYear(createdAt) {
  const year = createdAt ? new Date(createdAt).getFullYear() : NaN
  return Number.isFinite(year) ? year : null
}

// Sequential blue ramp for the heatmap, lightest = fewest. Shaded on a
// square-root scale so the few very large new-model cells (200+) don't
// wash every other cell out to the lightest step.
const HEAT_STEPS = [
  '#cde2fb',
  '#b7d3f6',
  '#9ec5f4',
  '#86b6ef',
  '#5598e7',
  '#2a78d6',
  '#1c5cab',
  '#0d366b',
]

function heatStep(count) {
  const ratio = Math.sqrt(count / Math.max(1, matrix.value.max))
  return Math.min(HEAT_STEPS.length - 1, Math.floor(ratio * HEAT_STEPS.length))
}

function heatStyle(count) {
  if (!count) return null
  const step = heatStep(count)
  return { background: HEAT_STEPS[step], color: step >= 4 ? '#fff' : '#0b0b0b' }
}

async function loadLessorOptions() {
  try {
    lessorOptions.value = [{ title: 'All Lessors', value: null }, ...(await fetchLessorOptions())]
  } catch {
    // Non-critical — the filter just falls back to "All Lessors" only.
  }
}

onMounted(() => {
  loadAll()
  loadLessorOptions()
})
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
      <div class="text-h6 text-sm-h5 font-weight-bold">Inventory Utilisation Report</div>
      <v-select
        v-model="lessorFilter"
        :items="lessorOptions"
        density="compact"
        variant="outlined"
        hide-details
        rounded="lg"
        style="max-width: 260px; min-width: 200px"
        @update:model-value="loadAll"
      />
    </div>

    <!-- Headline cards (A-167) -->
    <div v-if="summary.loading && !summary.data" class="summary-grid mb-4">
      <v-skeleton-loader v-for="n in 6" :key="n" type="article" height="110" />
    </div>
    <v-alert
      v-else-if="summary.error"
      type="error"
      variant="tonal"
      rounded="lg"
      density="compact"
      class="mb-4"
      :text="toUserMessage(summary.error)"
    >
      <template #append>
        <v-btn variant="text" size="small" @click="summary.load">Retry</v-btn>
      </template>
    </v-alert>
    <div v-else class="summary-grid mb-4" :class="{ 'opacity-60': summary.loading }">
      <v-card v-for="card in summary.data" :key="card.label" class="pa-4">
        <div class="text-body-2 text-medium-emphasis mb-1">{{ card.label }}</div>
        <div v-if="card.modelName" class="text-subtitle-1 font-weight-bold">
          {{ card.modelName }}
        </div>
        <div
          v-if="card.percentage"
          :class="card.modelName ? 'text-body-1' : 'text-h5 font-weight-bold'"
        >
          {{ card.percentage }}
        </div>
        <div class="text-caption text-medium-emphasis">
          <span v-if="card.count != null">{{ card.count }} vehicles</span>
          <span v-if="card.count != null && cardYear(card.createdAt)"> · </span>
          <span v-if="cardYear(card.createdAt)">Model added {{ cardYear(card.createdAt) }}</span>
        </div>
      </v-card>
    </div>

    <v-row>
      <!-- Stock vs booked by model (A-111) -->
      <v-col cols="12" lg="7">
        <v-card class="pa-4 h-100">
          <div class="text-subtitle-1 font-weight-medium">Utilisation by model</div>
          <div class="text-body-2 text-medium-emphasis mb-4">
            Booked vs in-stock vehicles, largest fleet first. Right column: utilisation · fleet
            size.
          </div>
          <v-skeleton-loader v-if="byModel.loading && !byModel.data" type="list-item@8" />
          <EmptyState
            v-else-if="byModel.error"
            icon="mdi-alert-circle-outline"
            title="Couldn't load model counts"
            :message="toUserMessage(byModel.error)"
          >
            <v-btn class="mt-2" variant="tonal" color="primary" @click="byModel.load">Retry</v-btn>
          </EmptyState>
          <EmptyState v-else-if="modelRows.length === 0" icon="mdi-motorbike" title="No vehicles" />
          <StockBarList v-else :rows="modelRows" :class="{ 'opacity-60': byModel.loading }" />
        </v-card>
      </v-col>

      <!-- Stock vs booked by vehicle age (A-156) -->
      <v-col cols="12" lg="5">
        <v-card class="pa-4 h-100">
          <div class="text-subtitle-1 font-weight-medium">Utilisation by vehicle age</div>
          <div class="text-body-2 text-medium-emphasis mb-4">
            Booked vs in-stock vehicles across all models, grouped by age in years.
          </div>
          <v-skeleton-loader v-if="byAge.loading && !byAge.data" type="list-item@6" />
          <EmptyState
            v-else-if="byAge.error"
            icon="mdi-alert-circle-outline"
            title="Couldn't load age breakdown"
            :message="toUserMessage(byAge.error)"
          >
            <v-btn class="mt-2" variant="tonal" color="primary" @click="byAge.load">Retry</v-btn>
          </EmptyState>
          <EmptyState v-else-if="ageRows.length === 0" icon="mdi-motorbike" title="No vehicles" />
          <StockBarList v-else :rows="ageRows" :class="{ 'opacity-60': byAge.loading }" />
        </v-card>
      </v-col>

      <!-- Fleet age mix per model (A-157) -->
      <v-col cols="12">
        <v-card class="pa-4">
          <div class="d-flex align-start justify-space-between flex-wrap ga-3 mb-4">
            <div>
              <div class="text-subtitle-1 font-weight-medium">Fleet age by model</div>
              <div class="text-body-2 text-medium-emphasis">
                Number of vehicles of each model by age in years (all statuses).
              </div>
            </div>
            <div class="d-flex align-center ga-2 text-caption text-medium-emphasis">
              Fewer
              <span class="d-flex">
                <span
                  v-for="color in HEAT_STEPS"
                  :key="color"
                  class="heat-key"
                  :style="{ background: color }"
                />
              </span>
              More
            </div>
          </div>
          <v-skeleton-loader v-if="ageMix.loading && !ageMix.data" type="table-tbody" />
          <EmptyState
            v-else-if="ageMix.error"
            icon="mdi-alert-circle-outline"
            title="Couldn't load fleet age"
            :message="toUserMessage(ageMix.error)"
          >
            <v-btn class="mt-2" variant="tonal" color="primary" @click="ageMix.load">Retry</v-btn>
          </EmptyState>
          <EmptyState
            v-else-if="matrix.rows.length === 0"
            icon="mdi-motorbike"
            title="No vehicles"
          />
          <v-table
            v-else
            density="compact"
            class="heat-table text-no-wrap"
            :class="{ 'opacity-60': ageMix.loading }"
          >
            <thead>
              <tr>
                <th class="font-weight-bold">Model</th>
                <th v-for="age in matrix.ages" :key="age" class="font-weight-bold text-center">
                  {{ age }}y
                </th>
                <th class="font-weight-bold text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in matrix.rows" :key="row.model">
                <td>{{ row.model }}</td>
                <td
                  v-for="age in matrix.ages"
                  :key="age"
                  class="heat-cell text-center"
                  :style="heatStyle(row.counts[age])"
                  :title="row.counts[age] ? `${row.model}, ${age}y: ${row.counts[age]}` : undefined"
                >
                  {{ row.counts[age] || '' }}
                </td>
                <td class="text-right font-weight-medium">{{ row.total }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px;
}
.heat-key {
  width: 14px;
  height: 10px;
}
.heat-table td,
.heat-table th {
  font-variant-numeric: tabular-nums;
}
.heat-cell {
  min-width: 44px;
  border: 2px solid rgb(var(--v-theme-surface)) !important;
  border-radius: 4px;
}
</style>
