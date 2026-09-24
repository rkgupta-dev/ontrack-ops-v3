<script setup>
import { computed, onMounted, ref } from 'vue'
import * as attributionApi from '../../services/reports/trafficAttribution.api'
import { useQueryFilters } from '../../composables/useQueryFilters'
import { toUserMessage } from '../../utils/errorMessage'
import { formatDateOnly } from '../../utils/date'
import { exportCsvLines } from '../../utils/export'
import { DATE_RANGE_PRESETS, customRange, presetRange, toLocalIsoDate } from '../../utils/dateRange'
import {
  GROUPS,
  buildReportCsvRows,
  formatPercent,
  trendColor,
} from '../../utils/trafficAttribution'
import EmptyState from '../../components/common/EmptyState.vue'
import AttributionRows from '../../components/reports/AttributionRows.vue'

// Port of the old app's `views/TrafficAttribution.vue` (By Traffic, A-016)
// and its `TrafficAttributionByValue.vue` child (By Value, A-017), merged
// into one page. Same `?metric=traffic|value` query param as the old app;
// the date range, and By Value's sort, are now in the URL too.

const { readString, replaceQuery } = useQueryFilters()

const MODE_OPTIONS = [
  { title: 'By Traffic', value: 'traffic' },
  { title: 'By Value', value: 'value' },
]
const SORT_BY_OPTIONS = [
  { title: 'Traffic', value: 'count' },
  { title: 'Signed Up', value: 'signedUp' },
  { title: 'Converted', value: 'converted' },
]
const SORT_ORDER_OPTIONS = [
  { title: 'Descending', value: 'desc' },
  { title: 'Ascending', value: 'asc' },
]
const TOP_N = 5

function pick(value, options, fallback) {
  return options.some((o) => o.value === value) ? value : fallback
}

const mode = ref(pick(readString('metric'), MODE_OPTIONS, 'traffic'))
const preset = ref(pick(readString('range'), DATE_RANGE_PRESETS, 'today'))
const sortBy = ref(pick(readString('sortBy'), SORT_BY_OPTIONS, 'count'))
const sortOrder = ref(pick(readString('sortOrder'), SORT_ORDER_OPTIONS, 'desc'))

const todayIso = toLocalIsoDate(new Date())
const customFrom = ref(readString('from', todayIso))
const customTo = ref(readString('to', todayIso))

const range = computed(() =>
  preset.value === 'custom'
    ? customRange(customFrom.value, customTo.value)
    : presetRange(preset.value),
)
const rangeLabel = computed(() => {
  if (!range.value) return 'Pick a valid date range'
  const from = formatDateOnly(range.value.start)
  const to = formatDateOnly(range.value.end)
  return from === to ? from : `${from} – ${to}`
})

const stats = ref(null)
const loading = ref(false)
const error = ref(null)
let requestSeq = 0

function syncQuery() {
  replaceQuery({
    metric: mode.value === 'traffic' ? '' : mode.value,
    range: preset.value === 'today' ? '' : preset.value,
    from: preset.value === 'custom' ? customFrom.value : '',
    to: preset.value === 'custom' ? customTo.value : '',
    sortBy: mode.value === 'value' && sortBy.value !== 'count' ? sortBy.value : '',
    sortOrder: mode.value === 'value' && sortOrder.value !== 'desc' ? sortOrder.value : '',
  })
}

async function load() {
  syncQuery()
  if (!range.value) return
  const seq = ++requestSeq
  loading.value = true
  error.value = null
  const params = { startDate: range.value.start.getTime(), endDate: range.value.end.getTime() }
  try {
    const data =
      mode.value === 'value'
        ? await attributionApi.fetchTrafficAttributionByValue({
            ...params,
            sortBy: sortBy.value,
            sortOrder: sortOrder.value,
          })
        : await attributionApi.fetchTrafficAttribution(params)
    if (seq === requestSeq) stats.value = data
  } catch (err) {
    if (seq === requestSeq) error.value = err
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

function setMode(value) {
  mode.value = value
  stats.value = null
  load()
}

// Custom dates reload as soon as both form a valid range; a reversed or
// half-cleared pair just waits instead of firing a bad request.
function setCustomDate(which, value) {
  if (which === 'from') customFrom.value = value ?? ''
  else customTo.value = value ?? ''
  if (range.value) load()
}

const filtersActive = computed(
  () => preset.value !== 'today' || sortBy.value !== 'count' || sortOrder.value !== 'desc',
)

function clearFilters() {
  preset.value = 'today'
  customFrom.value = todayIso
  customTo.value = todayIso
  sortBy.value = 'count'
  sortOrder.value = 'desc'
  load()
}

function setPreset(value) {
  // Seed the custom inputs with whatever range was showing.
  if (value === 'custom' && range.value) {
    customFrom.value = toLocalIsoDate(range.value.start)
    customTo.value = toLocalIsoDate(range.value.end)
  }
  preset.value = value
  load()
}

// --- Derived view data ---
const totals = computed(() => stats.value?.totals ?? [])
const trafficTotal = computed(() => Number(totals.value[0]?.count) || 0)
const hasData = computed(() => trafficTotal.value > 0)

function shareOfTraffic(total) {
  if (total.label === 'Traffic' || !trafficTotal.value) return null
  return formatPercent((Number(total.count) / trafficTotal.value) * 100)
}

const groups = computed(() => GROUPS.map((g) => ({ ...g, items: stats.value?.[g.key] ?? [] })))

const volumeTables = computed(() => [
  {
    title: 'Platform Performance',
    column: 'Platform',
    icon: 'mdi-devices',
    items: stats.value?.byPlatform ?? [],
  },
  {
    title: 'Attribution Strategy',
    column: 'Attribution Type',
    icon: 'mdi-gesture-tap',
    items: stats.value?.byAttributionType ?? [],
  },
])

// --- View All dialog ---
const viewAllOpen = ref(false)
const viewAllGroup = ref(null)
function openViewAll(group) {
  viewAllGroup.value = group
  viewAllOpen.value = true
}

function downloadCsv() {
  const suffix = range.value
    ? `${toLocalIsoDate(range.value.start)}_${toLocalIsoDate(range.value.end)}`
    : 'report'
  const base = mode.value === 'value' ? 'traffic_attribution_by_value' : 'traffic_attribution'
  exportCsvLines(buildReportCsvRows(stats.value, mode.value), `${base}_${suffix}`)
}

onMounted(load)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-start ga-2 mb-4">
      <div class="flex-grow-1" style="min-width: 0">
        <h1 class="text-h6 text-sm-h5 font-weight-bold">Traffic Attribution</h1>
        <div class="text-body-2 text-medium-emphasis">
          {{ rangeLabel }}
          <span v-if="hasData" class="d-none d-sm-inline">
            · vs the previous period of the same length
          </span>
        </div>
      </div>
      <v-btn
        v-if="filtersActive"
        variant="text"
        color="primary"
        rounded="lg"
        class="text-none flex-shrink-0 px-2"
        prepend-icon="mdi-filter-remove-outline"
        @click="clearFilters"
      >
        <span class="d-none d-sm-inline">Clear filters</span>
        <span class="d-sm-none">Clear</span>
      </v-btn>
      <v-btn
        color="primary"
        variant="flat"
        rounded="lg"
        prepend-icon="mdi-download"
        class="text-none flex-shrink-0"
        :disabled="!hasData"
        @click="downloadCsv"
      >
        CSV
      </v-btn>
    </div>

    <!-- Filters: mode, date preset, and (for Custom) From + To side by side -->
    <div class="controls mb-5" :class="{ 'controls--custom': preset === 'custom' }">
      <v-btn-toggle
        :model-value="mode"
        color="primary"
        variant="outlined"
        divided
        mandatory
        rounded="lg"
        density="compact"
        class="controls__mode"
        @update:model-value="setMode"
      >
        <v-btn
          v-for="opt in MODE_OPTIONS"
          :key="opt.value"
          :value="opt.value"
          class="text-none"
          size="large"
        >
          {{ opt.title }}
        </v-btn>
      </v-btn-toggle>

      <v-select
        :model-value="preset"
        :items="DATE_RANGE_PRESETS"
        prepend-inner-icon="mdi-calendar"
        density="compact"
        variant="outlined"
        rounded="lg"
        hide-details
        class="controls__preset"
        @update:model-value="setPreset"
      />

      <template v-if="preset === 'custom'">
        <v-text-field
          :model-value="customFrom"
          type="date"
          label="From"
          :max="customTo || todayIso"
          density="compact"
          variant="outlined"
          rounded="lg"
          hide-details
          @update:model-value="(v) => setCustomDate('from', v)"
        />
        <v-text-field
          :model-value="customTo"
          type="date"
          label="To"
          :min="customFrom"
          :max="todayIso"
          density="compact"
          variant="outlined"
          rounded="lg"
          hide-details
          @update:model-value="(v) => setCustomDate('to', v)"
        />
      </template>
    </div>

    <!-- Loading / error -->
    <div v-if="loading && !stats" class="d-flex flex-column ga-4">
      <v-row>
        <v-col v-for="n in 3" :key="n" cols="12" sm="4">
          <v-skeleton-loader type="article" class="rounded-lg" />
        </v-col>
      </v-row>
      <v-skeleton-loader type="list-item-three-line@3" class="rounded-lg" />
    </div>

    <v-card v-else-if="error" variant="outlined" rounded="lg">
      <EmptyState
        icon="mdi-alert-circle-outline"
        title="Couldn't load traffic attribution"
        :message="toUserMessage(error)"
      >
        <v-btn class="mt-2" variant="tonal" color="primary" @click="load">Retry</v-btn>
      </EmptyState>
    </v-card>

    <template v-else-if="stats">
      <!-- Totals -->
      <v-row class="mb-2" :class="{ 'is-refreshing': loading }">
        <v-col v-for="total in totals" :key="total.label" cols="12" sm="4">
          <v-card variant="outlined" rounded="lg" class="pa-4 h-100">
            <div class="text-body-2 text-medium-emphasis">{{ total.label }}</div>
            <div class="d-flex align-end justify-space-between ga-2 mt-1">
              <div class="text-h4 font-weight-bold">{{ total.count }}</div>
              <v-tooltip location="top">
                <template #activator="{ props: tip }">
                  <v-chip
                    v-bind="tip"
                    :color="trendColor(total.trend)"
                    size="small"
                    variant="tonal"
                    label
                    :prepend-icon="total.trend === 'up' ? 'mdi-arrow-up' : 'mdi-arrow-down'"
                  >
                    {{ formatPercent(total.changePercent, { signed: true }) }}
                  </v-chip>
                </template>
                Previous period: {{ total.previousCount ?? 0 }}
              </v-tooltip>
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
              <template v-if="shareOfTraffic(total)">
                {{ shareOfTraffic(total) }} of traffic ·
              </template>
              was {{ total.previousCount ?? 0 }}
            </div>
          </v-card>
        </v-col>
      </v-row>

      <EmptyState
        v-if="!hasData"
        icon="mdi-chart-timeline-variant"
        title="No traffic in this period"
        message="Try a wider date range."
      />

      <div v-else :class="{ 'is-refreshing': loading }">
        <!-- By Value sort -->
        <div v-if="mode === 'value'" class="sort-row mb-4">
          <span class="text-body-2 text-medium-emphasis">Sort by</span>
          <v-select
            v-model="sortBy"
            :items="SORT_BY_OPTIONS"
            density="compact"
            variant="outlined"
            rounded="lg"
            hide-details
            @update:model-value="load"
          />
          <v-select
            v-model="sortOrder"
            :items="SORT_ORDER_OPTIONS"
            density="compact"
            variant="outlined"
            rounded="lg"
            hide-details
            @update:model-value="load"
          />
        </div>

        <v-row>
          <v-col v-for="group in groups" :key="group.key" cols="12" md="6">
            <v-card variant="outlined" rounded="lg" class="pa-4 h-100 d-flex flex-column">
              <div class="d-flex align-center justify-space-between mb-3">
                <div class="text-subtitle-1 font-weight-bold">{{ group.title }}</div>
                <div
                  v-if="mode === 'traffic'"
                  class="text-caption text-medium-emphasis text-no-wrap"
                >
                  Traffic / <span class="text-primary">Signed up</span> /
                  <span class="text-success">Converted</span>
                </div>
              </div>
              <AttributionRows
                :items="group.items.slice(0, TOP_N)"
                :mode="mode"
                :column="group.column"
                :max-count="trafficTotal || 1"
              />
              <v-spacer />
              <div v-if="group.items.length > TOP_N" class="mt-3">
                <v-btn
                  variant="text"
                  color="primary"
                  size="small"
                  class="text-none px-1"
                  @click="openViewAll(group)"
                >
                  View all {{ group.items.length }}
                </v-btn>
              </div>
            </v-card>
          </v-col>

          <v-col v-for="table in volumeTables" :key="table.title" cols="12" md="6">
            <v-card variant="outlined" rounded="lg" class="pa-4 h-100">
              <div class="text-subtitle-1 font-weight-bold mb-2">{{ table.title }}</div>
              <v-table density="compact">
                <thead>
                  <tr>
                    <th class="font-weight-bold">{{ table.column }}</th>
                    <th class="text-right font-weight-bold">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in table.items" :key="item.label">
                    <td>
                      <v-icon :icon="table.icon" size="16" class="text-medium-emphasis mr-2" />
                      <span class="text-capitalize font-weight-medium">
                        {{ item.label.replace(/_/g, ' ') }}
                      </span>
                    </td>
                    <td class="text-right font-weight-bold text-no-wrap">
                      {{ item.count }}
                      <v-icon
                        v-if="item.trend"
                        :icon="item.trend === 'up' ? 'mdi-arrow-up' : 'mdi-arrow-down'"
                        :color="trendColor(item.trend)"
                        size="16"
                        :title="`Previous period: ${item.previousCount ?? 0}`"
                      />
                    </td>
                  </tr>
                  <tr v-if="!table.items.length">
                    <td colspan="2" class="text-medium-emphasis">No data.</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card>
          </v-col>
        </v-row>
      </div>
    </template>

    <v-dialog v-model="viewAllOpen" max-width="720" scrollable>
      <v-card v-if="viewAllGroup" rounded="lg">
        <v-card-title class="d-flex align-center pt-4">
          <span class="text-h6">{{ viewAllGroup.title }}</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="viewAllOpen = false" />
        </v-card-title>
        <v-divider />
        <v-card-text>
          <AttributionRows
            :items="viewAllGroup.items"
            :mode="mode"
            :column="viewAllGroup.column"
            :max-count="trafficTotal || 1"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
/* Phones: mode toggle and preset each take a full row; Custom's From/To
   share one row. From md up everything sits on a single line. */
.controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-items: center;
}

.controls__mode,
.controls__preset {
  grid-column: 1 / -1;
}

.controls__mode {
  width: 100%;
}

.controls__mode :deep(.v-btn) {
  flex: 1 1 0;
  min-width: 0;
}

@media (min-width: 600px) {
  .controls__mode,
  .controls__preset {
    grid-column: auto;
  }
}

@media (min-width: 960px) {
  .controls {
    grid-template-columns: 260px 200px;
  }

  .controls--custom {
    grid-template-columns: 260px 200px 180px 180px;
  }
}

.sort-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

@media (min-width: 600px) {
  .sort-row {
    grid-template-columns: auto 170px 170px;
    justify-content: end;
  }
}

.is-refreshing {
  opacity: 0.6;
  transition: opacity 0.15s;
}
</style>
