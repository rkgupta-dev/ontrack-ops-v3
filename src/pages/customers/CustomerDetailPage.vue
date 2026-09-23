<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as customersApi from '../../services/customers/customers.api'
import { toUserMessage } from '../../utils/errorMessage'
import { formatDateTime } from '../../utils/date'
import EmptyState from '../../components/common/EmptyState.vue'
import BookingHistoryTab from '../../components/customers/detail/BookingHistoryTab.vue'
import ExtensionHistoryTab from '../../components/customers/detail/ExtensionHistoryTab.vue'
import PointsHistoryTab from '../../components/customers/detail/PointsHistoryTab.vue'
import CollectionHistoryTab from '../../components/customers/detail/CollectionHistoryTab.vue'
import ActivitiesHistoryTab from '../../components/customers/detail/ActivitiesHistoryTab.vue'
import TrafficAttributionTab from '../../components/customers/detail/TrafficAttributionTab.vue'

const route = useRoute()
const router = useRouter()
const customerId = computed(() => route.params.customerId)

const customer = ref(null)
const loading = ref(true)
const error = ref(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    customer.value = await customersApi.fetchCustomerById(customerId.value)
  } catch (err) {
    error.value = err
  } finally {
    loading.value = false
  }
}

onMounted(load)

const displayName = computed(() => {
  const first = customer.value?.fName ?? ''
  const last = customer.value?.lName ?? ''
  return [first, last].filter(Boolean).join(' ').trim() || '—'
})

// CONFIRMED live 2026-09-18: `status === 1` renders as "Active" — see
// stores/customers.store.js for the same mapping (and its "Halt" caveat).
const isActive = computed(() => customer.value?.status === 1)

const verifications = computed(() => [
  { label: 'DL Number Verified', value: Boolean(customer.value?.DLnumberVerified) },
  { label: 'DL Verified', value: Boolean(customer.value?.DLVerified) },
  { label: 'Mobile Verified', value: Boolean(customer.value?.mobileVerified) },
  { label: 'Email Verified', value: Boolean(customer.value?.emailVerified) },
  { label: 'ID Verified', value: Boolean(customer.value?.IDVerified) },
])

const overviewFields = computed(() => {
  const c = customer.value
  if (!c) return []
  return [
    { label: 'ID', value: c.id },
    { label: 'First Name', value: c.fName },
    { label: 'Last Name', value: c.lName },
    { label: 'Gender', value: c.gender },
    { label: 'Sign-Up Type', value: c.signUpType },
    { label: 'Email', value: c.email },
    { label: 'Mobile', value: c.mobile },
    { label: 'Alternate Mobile', value: c.alternateNo },
    { label: 'Address', value: c.address },
    { label: 'City', value: c.city },
    { label: 'State', value: c.state },
    { label: 'Pincode', value: c.pinCode },
    { label: 'DL Number', value: c.DLnumber },
    { label: 'Referral Code', value: c.referalCode },
    { label: 'Customer Since', value: formatDateTime(c.createdAt) },
  ].filter((field) => field.value !== null && field.value !== undefined && field.value !== '')
})

const tabs = [
  { value: 'overview', label: 'Overview' },
  { value: 'bookings', label: 'Booking History' },
  { value: 'extensions', label: 'Extension History' },
  { value: 'points', label: 'Points History' },
  { value: 'collections', label: 'Collection History' },
  { value: 'activities', label: 'Activities History' },
  { value: 'traffic', label: 'Traffic Attribution' },
]
// Kept in the URL (`?tab=`) so a refresh (or a shared link) lands back on
// the same tab instead of always resetting to Overview.
const validTabValues = tabs.map((t) => t.value)
const activeTab = ref(
  typeof route.query.tab === 'string' && validTabValues.includes(route.query.tab)
    ? route.query.tab
    : 'overview',
)

watch(activeTab, (value) => {
  router.replace({ query: { ...route.query, tab: value } })
})
</script>

<template>
  <div v-if="loading" class="pa-6">
    <v-skeleton-loader type="list-item-two-line, article" />
  </div>

  <EmptyState
    v-else-if="error"
    icon="mdi-alert-circle-outline"
    title="Couldn't load this customer"
    :message="toUserMessage(error)"
  >
    <v-btn class="mt-2" variant="tonal" color="primary" @click="load">Retry</v-btn>
  </EmptyState>

  <EmptyState v-else-if="!customer" icon="mdi-account-off-outline" title="Customer not found" />

  <div v-else>
    <div class="text-body-2 text-medium-emphasis mb-1">Customer / {{ customer.id }}</div>
    <h2 class="font-weight-bold mb-2">{{ displayName }}</h2>
    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <v-chip
        v-if="customer.aqStatus !== null && customer.aqStatus !== undefined"
        color="primary"
        size="x-small"
        variant="flat"
        label
      >
        {{ customer.aqStatus }}
        <v-icon icon="mdi-star" size="12" class="ml-1" />
      </v-chip>
      <a v-if="customer.mobile" :href="`tel:${customer.mobile}`" class="text-body-1">
        {{ customer.mobile }}
      </a>
      <a v-if="customer.email" :href="`mailto:${customer.email}`" class="text-body-1">
        {{ customer.email }}
      </a>
      <v-chip label :color="isActive ? 'success' : 'secondary'" size="x-small" variant="flat">
        {{ isActive ? 'Active' : 'Halt' }}
      </v-chip>
    </div>
    <div class="text-body-2 text-medium-emphasis mb-6">Source: {{ customer.source || 'N/A' }}</div>

    <v-card class="mb-6">
      <v-tabs
        v-model="activeTab"
        slider-transition="grow"
        fixed-tabs
        show-arrows
        density="comfortable"
        bg-color="#E3E2FA"
        center-active
      >
        <v-tab v-for="tab in tabs" :key="tab.value" :value="tab.value">{{ tab.label }}</v-tab>
      </v-tabs>
    </v-card>

    <!-- <v-divider class="mb-6" /> -->

    <v-window v-model="activeTab">
      <v-window-item value="overview">
        <v-card variant="outlined" rounded="lg" class="pa-4 mb-6">
          <v-row dense>
            <v-col v-for="item in verifications" :key="item.label" cols="6" sm="4">
              <div class="d-flex align-center ga-2">
                <v-switch
                  :model-value="item.value"
                  color="primary"
                  density="compact"
                  hide-details
                  readonly
                />
                <span>{{ item.label }}</span>
              </div>
            </v-col>
          </v-row>
        </v-card>

        <h2 class="text-h6 font-weight-bold mb-3">Overview</h2>
        <v-card variant="outlined" rounded="lg">
          <template v-for="(field, index) in overviewFields" :key="field.label">
            <div class="pa-4">
              <span class="font-weight-bold">{{ field.label }}:</span> {{ field.value }}
            </div>
            <v-divider v-if="index < overviewFields.length - 1" />
          </template>
        </v-card>
      </v-window-item>

      <v-window-item value="bookings">
        <BookingHistoryTab :customer-id="customer.id" />
      </v-window-item>

      <v-window-item value="extensions">
        <ExtensionHistoryTab :customer-id="customer.id" />
      </v-window-item>

      <v-window-item value="points">
        <PointsHistoryTab :customer-id="customer.id" />
      </v-window-item>

      <v-window-item value="collections">
        <CollectionHistoryTab :customer-id="customer.id" />
      </v-window-item>

      <v-window-item value="activities">
        <ActivitiesHistoryTab :customer-id="customer.id" />
      </v-window-item>

      <v-window-item value="traffic">
        <TrafficAttributionTab :customer-id="customer.id" />
      </v-window-item>
    </v-window>
  </div>
</template>
