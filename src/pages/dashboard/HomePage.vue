<script setup>
import { computed, onMounted, ref } from 'vue'
import * as homeApi from '../../services/home/home.api'
import * as inventoryApi from '../../services/inventory/inventory.api'
import { toUserMessage } from '../../utils/errorMessage'
import EmptyState from '../../components/common/EmptyState.vue'
import BookingFeedCard from '../../components/home/BookingFeedCard.vue'

const statsLoading = ref(true)
const statsError = ref(null)
const stats = ref([])

const feedLoading = ref(true)
const feedError = ref(null)
const feedRows = ref([])

const locations = ref([])

const deliveryFilter = ref('all') // 'all' | 'pickup' | 'delivery'
const locationFilter = ref(null) // null = all locations

function toFeedItem(record) {
  const first = record?.customerData?.fName ?? ''
  const last = record?.customerData?.lName ?? ''
  const customerName = [first, last].filter(Boolean).join(' ').trim() || null
  return {
    id: record.id,
    bookingId: record.bookingId,
    registrationNumber: record.vehicleData?.registrationNumber ?? null,
    modelName: record.modelData?.name ?? null,
    modelImage: record.modelData?.image300 || record.modelData?.image || null,
    customerName,
    planType: record.plan_type,
    // A-046: 0 = pickup, 1 = delivery — confirmed from real payload.
    deliveryType: record.deliveryType,
    locationId: record.location ?? record.locationData?.id ?? null,
    createdAt: record.createdAt,
    medium: record.medium || record.source,
  }
}

const feedItems = computed(() => feedRows.value.map(toFeedItem))

const filteredFeedItems = computed(() =>
  feedItems.value.filter((item) => {
    if (deliveryFilter.value === 'pickup' && item.deliveryType !== 0) return false
    if (deliveryFilter.value === 'delivery' && item.deliveryType !== 1) return false
    if (locationFilter.value !== null && item.locationId !== locationFilter.value) return false
    return true
  }),
)

const locationOptions = computed(() => [
  { title: 'All', value: null },
  ...locations.value.map((location) => ({ title: location.name, value: location.id })),
])

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
// A-109's document-expiry entries (confirmed `filter_tag` values) open the
// matching tab on the Expiry Reminder page, like the old app's Home page.
const EXPIRY_FILTER_TAGS = ['rc_expiry', 'insurance_expiry', 'permit_expiry', 'pucc_expiry']

function statLink(stat) {
  if (EXPIRY_FILTER_TAGS.includes(stat.filter_tag)) {
    return { name: 'vehicle-reminders', query: { current_tab: stat.filter_tag } }
  }
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

async function loadFeed() {
  feedLoading.value = true
  feedError.value = null
  try {
    feedRows.value = await homeApi.fetchHomeBookingsFeed()
  } catch (error) {
    feedError.value = error
  } finally {
    feedLoading.value = false
  }
}

async function loadLocations() {
  try {
    locations.value = await homeApi.fetchLocations()
  } catch {
    // Non-critical — the location filter just falls back to "All" only.
    locations.value = []
  }
}

onMounted(() => {
  loadStats()
  loadFeed()
  loadLocations()
})
</script>

<template>
  <div>
    <!-- Fleet inventory stat strip (A-109) -->
    <div v-if="statsLoading" class="d-flex ga-3 mb-6" style="overflow-x: auto">
      <v-skeleton-loader
        v-for="n in 8"
        :key="n"
        type="text, text"
        width="160"
        height="90"
        class="flex-shrink-0 border rounded-lg"
        style="min-width: 160px"
      />
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

    <!-- Delivery-type filter + location filter -->
    <div class="d-flex align-center flex-wrap ga-3 mb-4">
      <v-btn-toggle
        v-model="deliveryFilter"
        mandatory
        rounded="lg"
        color="primary"
        density="comfortable"
      >
        <v-btn value="all" variant="outlined">All</v-btn>
        <v-btn value="pickup" variant="outlined">Pickup</v-btn>
        <v-btn value="delivery" variant="outlined">Delivery</v-btn>
      </v-btn-toggle>
      <v-spacer />
      <v-select
        v-model="locationFilter"
        :items="locationOptions"
        density="compact"
        variant="outlined"
        hide-details
        rounded="lg"
        style="max-width: 160px"
      />
    </div>

    <div class="text-body-2 text-medium-emphasis mb-4">
      {{ filteredFeedItems.length }} bookings found
    </div>

    <!-- Today's bookings feed (A-046) -->
    <!-- Shaped like BookingFeedCard.vue: chips + text lines left, image
         right, divider + date footer. -->
    <div v-if="feedLoading" class="d-flex flex-column ga-3" aria-busy="true">
      <v-card v-for="n in 3" :key="n" variant="outlined" rounded="lg" class="pa-4">
        <div class="d-flex justify-space-between align-center ga-3">
          <v-skeleton-loader
            type="chip, heading, text@2"
            class="flex-grow-1 min-w-0 bg-transparent"
          />
          <v-skeleton-loader
            type="image"
            :width="$vuetify.display.xs ? 96 : 130"
            :height="$vuetify.display.xs ? 76 : 100"
            class="flex-shrink-0 rounded-lg overflow-hidden"
          />
        </div>
        <v-divider />
        <v-skeleton-loader type="text" width="50%" class="bg-transparent" />
      </v-card>
    </div>
    <EmptyState
      v-else-if="feedError"
      icon="mdi-alert-circle-outline"
      title="Couldn't load bookings"
      :message="toUserMessage(feedError)"
    >
      <v-btn class="mt-2" variant="tonal" color="primary" @click="loadFeed">Retry</v-btn>
    </EmptyState>
    <EmptyState
      v-else-if="filteredFeedItems.length === 0"
      icon="mdi-calendar-blank-outline"
      title="No bookings found"
      message="Try a different filter."
    />
    <div v-else class="d-flex flex-column ga-3">
      <BookingFeedCard v-for="item in filteredFeedItems" :key="item.id" :item="item" />
    </div>
  </div>
</template>
