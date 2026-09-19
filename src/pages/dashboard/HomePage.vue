<script setup>
import { computed, onMounted, ref } from 'vue'
import * as homeApi from '../../services/home/home.api'
import { toUserMessage } from '../../utils/errorMessage'
import EmptyState from '../../components/common/EmptyState.vue'
import BookingFeedCard from '../../components/home/BookingFeedCard.vue'

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
  loadFeed()
  loadLocations()
})
</script>

<template>
  <div>
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
    <div v-if="feedLoading" class="d-flex flex-column ga-3">
      <v-skeleton-loader v-for="n in 3" :key="n" type="card" height="140" />
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
