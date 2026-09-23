<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useRemindersStore, EXPIRY_OPTIONS } from '../../stores/reminders.store'
import { fetchExpiredVehicles } from '../../services/vehicles/vehicles.api'
import { useUiStore } from '../../stores/ui.store'
import { toUserMessage } from '../../utils/errorMessage'
import { formatDateOnly, isExpired } from '../../utils/date'
import { exportRows } from '../../utils/export'
import EmptyState from '../../components/common/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const store = useRemindersStore()
const uiStore = useUiStore()
const { expiryType, rows, total, hasMore, loading } = storeToRefs(store)

// Deep-link support: `?current_tab=permit_expiry` etc. (linked from the Home
// stat strip). The old app's camelCase `?currentTab=` is still accepted so
// old bookmarks keep working. The selected tab is written back to the URL.
const QUERY_TAB_MAP = {
  rc_expiry: 'rc',
  insurance_expiry: 'insurance',
  permit_expiry: 'permit',
  pucc_expiry: 'pucc',
}
const initialExpiryType =
  QUERY_TAB_MAP[route.query.current_tab ?? route.query.currentTab] ?? EXPIRY_OPTIONS[0].value

function syncTabToUrl(type) {
  const tab = Object.keys(QUERY_TAB_MAP).find((key) => QUERY_TAB_MAP[key] === type)
  if (tab && route.query.current_tab !== tab) {
    router.replace({ query: { current_tab: tab } })
  }
}

async function load(type) {
  syncTabToUrl(type)
  try {
    await store.load(type)
  } catch (error) {
    uiStore.notify(toUserMessage(error, "Couldn't load reminders."), { type: 'error' })
  }
}

async function loadMore() {
  try {
    await store.loadMore()
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not load more.'), { type: 'error' })
  }
}

const EXPIRY_FIELDS = [
  { type: 'rc', field: 'RCExpiry', short: 'RC' },
  { type: 'insurance', field: 'nextInsuranceDate', short: 'Insurance' },
  { type: 'permit', field: 'permitExpiry', short: 'Permit' },
  { type: 'pucc', field: 'puccExpiry', short: 'PUCC' },
]

const selectedField = computed(() => EXPIRY_FIELDS.find((doc) => doc.type === expiryType.value))

/** Whole days since `dateStr` (0 = today), or null for a missing/invalid date. */
function daysOverdue(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000))
}

function overdueText(dateStr) {
  const days = daysOverdue(dateStr)
  if (days === null) return ''
  if (days === 0) return 'Expired today'
  return `${days} day${days === 1 ? '' : 's'} overdue`
}

/** Other documents on the same vehicle that have also expired. */
function otherExpired(vehicle) {
  return EXPIRY_FIELDS.filter(
    (doc) => doc.type !== expiryType.value && isExpired(vehicle[doc.field]),
  )
}

function vehicleLink(vehicle) {
  // The vehicle-detail route is keyed by registration number, not db id.
  return vehicle.registrationNumber
    ? { name: 'vehicle-detail', params: { vehicleId: vehicle.registrationNumber } }
    : undefined
}

// The old app's "Export All" ignored the selected filter entirely — it
// read 4 separate data properties that defaulted to `false` and were
// never updated by the radio buttons, so every export requested
// rc/insurance/permit/pucc all "0" regardless of what was on screen.
// Fixed here to export the currently-selected expiry type, fetching the
// full matching set (not just what's paginated on screen) same as the
// old app intended.
const exporting = ref(false)

async function exportAll(format) {
  exporting.value = true
  try {
    const { rows: allRows } = await fetchExpiredVehicles({
      expiryType: expiryType.value,
      limit: 10000,
      offset: 0,
    })
    const data = allRows.map((v) => ({
      Registration: v.registrationNumber,
      Chassis: v.chassisNo,
      RCExpiry: v.RCExpiry,
      InsuranceExpiry: v.nextInsuranceDate,
      PermitExpiry: v.permitExpiry,
      PuccExpiry: v.puccExpiry,
    }))
    exportRows(data, format, 'expired_vehicles')
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Export failed.'), { type: 'error' })
  } finally {
    exporting.value = false
  }
}

onMounted(() => load(initialExpiryType))
</script>

<template>
  <div class="reminders-page">
    <!-- Header: count + export -->
    <div class="d-flex align-center ga-3 mb-4">
      <div class="flex-grow-1" style="min-width: 0">
        <div class="text-h6 text-sm-h5 font-weight-bold">
          {{ total }} {{ total === 1 ? 'vehicle' : 'vehicles' }}
        </div>
        <div class="text-body-2 text-medium-emphasis text-truncate">
          with {{ selectedField?.short }} expired
        </div>
      </div>
      <v-btn
        color="success"
        variant="flat"
        rounded="lg"
        class="text-none flex-shrink-0"
        prepend-icon="mdi-download"
        :loading="exporting"
        :disabled="total === 0"
        @click="exportAll('csv')"
      >
        Export All
      </v-btn>
    </div>

    <!-- Expiry filter: one full-width segmented row; icons hidden on phones -->
    <v-btn-toggle
      :model-value="expiryType"
      color="primary"
      variant="outlined"
      divided
      mandatory
      rounded="lg"
      density="comfortable"
      class="expiry-toggle mb-5"
      @update:model-value="load"
    >
      <v-btn v-for="doc in EXPIRY_FIELDS" :key="doc.type" :value="doc.type" class="text-none">
        <v-icon :icon="doc.icon" start class="d-none d-sm-inline-flex" />
        {{ doc.short }}
      </v-btn>
    </v-btn-toggle>

    <!-- List -->
    <div v-if="loading && rows.length === 0" class="d-flex flex-column ga-2">
      <v-skeleton-loader v-for="n in 5" :key="n" type="list-item-two-line" class="rounded-lg" />
    </div>

    <v-card v-else-if="rows.length === 0" variant="outlined" rounded="lg">
      <EmptyState
        icon="mdi-check-circle-outline"
        title="All clear"
        :message="`No vehicles with ${selectedField?.short} expired.`"
      />
    </v-card>

    <template v-else>
      <v-card variant="outlined" rounded="lg">
        <template v-for="(vehicle, index) in rows" :key="vehicle.registrationNumber ?? index">
          <v-list-item :to="vehicleLink(vehicle)" class="py-3 px-4">
            <div class="d-flex flex-column flex-sm-row align-sm-center ga-2 ga-sm-4">
              <!-- Vehicle -->
              <div class="d-flex align-center ga-3 flex-grow-1" style="min-width: 0">
                <div style="min-width: 0">
                  <div class="text-subtitle-1 font-weight-bold text-truncate">
                    {{ vehicle.registrationNumber || '—' }}
                  </div>
                  <div class="text-caption text-medium-emphasis text-truncate">
                    Chassis: {{ vehicle.chassisNo || '—' }}
                  </div>
                </div>
              </div>

              <!-- Selected document's expiry -->
              <div class="expiry-info text-sm-right flex-shrink-0">
                <div class="text-body-2">
                  <span class="text-medium-emphasis">{{ selectedField?.short }}:</span>
                  {{ formatDateOnly(vehicle[selectedField?.field]) }}
                </div>
                <div
                  v-if="overdueText(vehicle[selectedField?.field])"
                  class="text-caption text-error font-weight-medium"
                >
                  {{ overdueText(vehicle[selectedField?.field]) }}
                </div>
              </div>
            </div>

            <!-- Other expired documents on the same vehicle -->
            <div v-if="otherExpired(vehicle).length" class="d-flex flex-wrap ga-1 mt-2 other-docs">
              <span class="text-caption text-medium-emphasis mr-1 align-self-center">
                Also expired:
              </span>
              <v-chip
                v-for="doc in otherExpired(vehicle)"
                :key="doc.type"
                size="x-small"
                color="warning"
                variant="tonal"
                label
              >
                {{ doc.short }}
              </v-chip>
            </div>
          </v-list-item>
          <v-divider v-if="index < rows.length - 1" />
        </template>
      </v-card>

      <div class="d-flex flex-column align-center ga-2 py-4">
        <div class="text-caption text-medium-emphasis">
          Showing {{ rows.length }} of {{ total }}
        </div>
        <v-btn
          v-if="hasMore"
          variant="tonal"
          color="primary"
          rounded="lg"
          class="text-none"
          :loading="loading"
          @click="loadMore"
        >
          Load More
        </v-btn>
      </div>
    </template>
  </div>
</template>

<style scoped>
.reminders-page {
  max-width: 1100px;
}

.expiry-toggle {
  display: flex;
  width: 100%;
  max-width: 600px;
}

.expiry-toggle :deep(.v-btn) {
  flex: 1 1 0;
  min-width: 0;
}

/* Phones: tighter padding so all four fit on one row. */
@media (max-width: 599px) {
  .expiry-toggle :deep(.v-btn) {
    padding-inline: 4px;
    font-size: 0.8125rem;
  }
}

/* Line up with the registration text, past the 40px avatar + gap. */
.other-docs {
  padding-left: 52px;
}
</style>
