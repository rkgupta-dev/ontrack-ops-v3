<script setup>
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useRemindersStore, EXPIRY_OPTIONS } from '../../stores/reminders.store'
import { fetchExpiredVehicles } from '../../services/vehicles/vehicles.api'
import { useUiStore } from '../../stores/ui.store'
import { toUserMessage } from '../../utils/errorMessage'
import { isExpired } from '../../utils/date'
import { exportRows } from '../../utils/export'
import EmptyState from '../../components/common/EmptyState.vue'

const route = useRoute()
const store = useRemindersStore()
const uiStore = useUiStore()
const { expiryType, rows, total, hasMore, loading } = storeToRefs(store)

// Deep-link support, matching the old app's `?currentTab=rc_expiry` etc.
// (used by its Home-page "Expiry Reminders" quick-link, not yet ported).
const QUERY_TAB_MAP = {
  rc_expiry: 'rc',
  insurance_expiry: 'insurance',
  permit_expiry: 'permit',
  pucc_expiry: 'pucc',
}
const initialExpiryType = QUERY_TAB_MAP[route.query.currentTab] ?? undefined

async function load(type) {
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

// The old app's "Export All" ignored the selected filter entirely — it
// read 4 separate data properties that defaulted to `false` and were
// never updated by the radio buttons, so every export requested
// rc/insurance/permit/pucc all "0" regardless of what was on screen.
// Fixed here to export the currently-selected expiry type, fetching the
// full matching set (not just what's paginated on screen) same as the
// old app intended.
async function exportAll(format) {
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
  }
}

onMounted(() => load(initialExpiryType))
</script>

<template>
  <v-card elevation="2">
    <v-card-title class="d-flex flex-wrap align-center ga-3 py-4">
      <v-icon icon="mdi-bell-alert-outline" class="mr-2" />
      <span>Reminders</span>
      <v-chip v-if="total" size="small" variant="tonal">{{ total }}</v-chip>
      <v-spacer />
      <v-btn size="small" variant="tonal" prepend-icon="mdi-download" @click="exportAll('csv')">
        Export CSV
      </v-btn>
      <v-btn size="small" variant="tonal" prepend-icon="mdi-download" @click="exportAll('json')">
        Export JSON
      </v-btn>
    </v-card-title>
    <v-divider />

    <div class="pa-4">
      <v-btn-toggle
        :model-value="expiryType"
        color="primary"
        density="compact"
        mandatory
        @update:model-value="load"
      >
        <v-btn v-for="option in EXPIRY_OPTIONS" :key="option.value" :value="option.value">
          {{ option.title }}
        </v-btn>
      </v-btn-toggle>
    </div>
    <v-divider />

    <div v-if="loading && rows.length === 0" class="d-flex justify-center py-10">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <EmptyState
      v-else-if="rows.length === 0"
      icon="mdi-check-circle-outline"
      title="No vehicles found for selected expiry conditions."
    />

    <template v-else>
      <v-list lines="two">
        <template v-for="(vehicle, index) in rows" :key="index">
          <v-list-item
            :title="vehicle.registrationNumber"
            :subtitle="`Chassis: ${vehicle.chassisNo}`"
          >
            <template #append>
              <div class="d-flex ga-1 flex-wrap justify-end" style="max-width: 260px">
                <v-chip
                  v-if="isExpired(vehicle.RCExpiry)"
                  size="small"
                  color="warning"
                  variant="tonal"
                >
                  RC Expired
                </v-chip>
                <v-chip
                  v-if="isExpired(vehicle.nextInsuranceDate)"
                  size="small"
                  color="warning"
                  variant="tonal"
                >
                  Insurance Expired
                </v-chip>
                <v-chip
                  v-if="isExpired(vehicle.permitExpiry)"
                  size="small"
                  color="warning"
                  variant="tonal"
                >
                  Permit Expired
                </v-chip>
                <v-chip
                  v-if="isExpired(vehicle.puccExpiry)"
                  size="small"
                  color="warning"
                  variant="tonal"
                >
                  PUCC Expired
                </v-chip>
              </div>
            </template>
          </v-list-item>
          <v-divider v-if="index < rows.length - 1" />
        </template>
      </v-list>

      <div v-if="hasMore" class="text-center py-4">
        <v-btn variant="tonal" color="primary" :loading="loading" @click="loadMore"
          >Load More</v-btn
        >
      </div>
    </template>
  </v-card>
</template>
