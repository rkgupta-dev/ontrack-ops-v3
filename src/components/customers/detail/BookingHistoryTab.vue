<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as customersApi from '../../../services/customers/customers.api'
import { toUserMessage } from '../../../utils/errorMessage'
import { formatDateTime } from '../../../utils/date'
import { BOOKING_HISTORY_FILTERS } from '../../../utils/bookingStatus'
import BookingStatusBadge from '../../bookings/BookingStatusBadge.vue'
import EmptyState from '../../common/EmptyState.vue'

const props = defineProps({
  customerId: { type: [String, Number], required: true },
})

const rows = ref([])
const total = ref(0)
const page = ref(1)
const limit = 10
const search = ref('')
// Defaults to "Ongoing" to match the reference UI — one of
// BOOKING_HISTORY_FILTERS[].key, or null for "all".
const activeFilter = ref('ongoing')
const loading = ref(true)
const loadingMore = ref(false)
const error = ref(null)

function currentFilterBody() {
  return BOOKING_HISTORY_FILTERS.find((f) => f.key === activeFilter.value)?.body ?? null
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const result = await customersApi.fetchCustomerBookings({
      customerId: props.customerId,
      page: 1,
      limit,
      searchTerm: search.value,
      statusFilter: currentFilterBody(),
    })
    rows.value = result.rows
    total.value = result.total
    page.value = 1
  } catch (err) {
    error.value = err
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || rows.value.length >= total.value) return
  loadingMore.value = true
  try {
    const nextPage = page.value + 1
    const result = await customersApi.fetchCustomerBookings({
      customerId: props.customerId,
      page: nextPage,
      limit,
      searchTerm: search.value,
      statusFilter: currentFilterBody(),
    })
    rows.value = [...rows.value, ...result.rows]
    total.value = result.total
    page.value = nextPage
  } catch (err) {
    error.value = err
  } finally {
    loadingMore.value = false
  }
}

let searchDebounce
function onSearchInput(value) {
  search.value = value
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(load, 350)
}

function onFilterClick(key) {
  activeFilter.value = activeFilter.value === key ? null : key
  load()
}

function fullName(record) {
  const first = record?.fName ?? ''
  const last = record?.lName ?? ''
  return [first, last].filter(Boolean).join(' ').trim() || null
}

const sentinel = ref(null)
const observer = new IntersectionObserver((entries) => {
  if (entries[0]?.isIntersecting) loadMore()
})
watch(sentinel, (el, previousEl) => {
  if (previousEl) observer.unobserve(previousEl)
  if (el) observer.observe(el)
})

onMounted(load)
onBeforeUnmount(() => observer.disconnect())
</script>

<template>
  <div class="d-flex align-center flex-wrap ga-3 mb-4">
    <v-text-field
      :model-value="search"
      density="compact"
      placeholder="Search by Booking ID"
      hide-details
      clearable
      @update:model-value="onSearchInput"
    />
    <v-spacer />
    <v-btn
      color="primary"
      variant="flat"
      rounded="lg"
      prepend-icon="mdi-plus"
      :to="{ name: 'booking-create' }"
    >
      Add Booking
    </v-btn>
  </div>

  <div class="d-flex flex-wrap ga-2 mb-4 pill-scroll">
    <v-btn
      v-for="filter in BOOKING_HISTORY_FILTERS"
      :key="filter.key"
      :variant="activeFilter === filter.key ? 'flat' : 'outlined'"
      :color="activeFilter === filter.key ? 'primary' : undefined"
      rounded="pill"
      density="comfortable"
      @click="onFilterClick(filter.key)"
    >
      {{ filter.label }}
    </v-btn>
  </div>

  <div class="text-body-2 text-medium-emphasis mb-4">
    {{ rows.length }} / {{ total }} rows loaded
  </div>

  <div v-if="loading" class="d-flex flex-column ga-3">
    <v-skeleton-loader v-for="n in 3" :key="n" type="card" height="110" />
  </div>

  <EmptyState
    v-else-if="error"
    icon="mdi-alert-circle-outline"
    title="Couldn't load booking history"
    :message="toUserMessage(error)"
  >
    <v-btn class="mt-2" variant="tonal" color="primary" @click="load">Retry</v-btn>
  </EmptyState>

  <EmptyState
    v-else-if="rows.length === 0"
    icon="mdi-calendar-blank-outline"
    title="No bookings found"
    message="Try a different search or filter."
  />

  <div v-else class="d-flex flex-column ga-3">
    <v-card
      v-for="row in rows"
      :key="row.id"
      variant="outlined"
      rounded="lg"
      class="pa-4"
      :to="{ name: 'booking-detail', params: { bookingId: row.bookingId } }"
      link
    >
      <div class="d-flex justify-space-between ga-3">
        <div class="min-w-0">
          <div class="text-subtitle-1 font-weight-bold">
            {{ row.vehicleData?.registrationNumber ?? '—' }}
          </div>
          <div class="text-caption text-medium-emphasis">{{ row.bookingId }}</div>
          <div class="text-body-2 font-weight-medium mt-1">{{ fullName(row.customerData) }}</div>
          <div v-if="row.amount !== undefined" class="text-body-2 text-medium-emphasis">
            Amount: {{ row.amount }}
          </div>
          <div class="text-caption text-medium-emphasis mt-1">
            {{ formatDateTime(row.createdAt) }}
          </div>
        </div>
        <div class="text-right flex-shrink-0">
          <BookingStatusBadge :status="row.status" :payment-status="row.paymentStatus" />
          <div v-if="row.source" class="text-caption text-medium-emphasis mt-1">
            Source: {{ row.source }}
          </div>
        </div>
      </div>
    </v-card>

    <div ref="sentinel" class="py-4 text-center">
      <v-progress-circular v-if="loadingMore" indeterminate color="primary" size="24" />
    </div>
  </div>
</template>
