<script setup>
import { computed, onMounted, ref } from 'vue'
import * as endBookingApi from '../../../services/bookings/endBooking.api'
import { useUiStore } from '../../../stores/ui.store'
import { toUserMessage } from '../../../utils/errorMessage'
import { formatCurrency } from '../../../utils/currency'

const props = defineProps({
  bookingId: { type: Number, required: true },
})
const emit = defineEmits(['next'])

const uiStore = useUiStore()
const pending = ref([])
const loading = ref(true)
const error = ref(null)

const canProceed = computed(() => pending.value.length === 0)

async function load() {
  loading.value = true
  try {
    pending.value = await endBookingApi.fetchPendingKmBills(props.bookingId)
    error.value = null
  } catch (err) {
    error.value = toUserMessage(err, 'Unable to fetch pending bills.')
  } finally {
    loading.value = false
  }
}
onMounted(load)

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-IN') : '—'
}

async function createBill() {
  try {
    await endBookingApi.createPendingKmBill(props.bookingId)
    uiStore.notify('Bill created successfully!', { type: 'success' })
    await load()
  } catch {
    uiStore.notify('Failed to create bill.', { type: 'error' })
  }
}
</script>

<template>
  <div>
    <v-alert v-if="loading" type="info" variant="tonal" density="compact" class="mb-3">
      Loading pending bills…
    </v-alert>
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{
      error
    }}</v-alert>

    <v-card
      v-for="(item, index) in pending"
      :key="index"
      variant="outlined"
      class="mb-3"
      :style="{
        borderColor: `rgb(var(--v-theme-${item.type === 'unpaid' ? 'error' : 'warning'}))`,
      }"
    >
      <v-card-title :class="item.type === 'unpaid' ? 'bg-error' : 'bg-warning'" class="text-body-1">
        {{ item.type === 'unpaid' ? 'Unpaid Bill' : 'Unbilled Usage' }}
      </v-card-title>
      <v-card-text v-if="item.type === 'unpaid'">
        <div class="d-flex justify-space-between py-1">
          <span>Bill ID</span><span>{{ item.bill.id }}</span>
        </div>
        <div class="d-flex justify-space-between py-1">
          <span>Period</span
          ><span
            >{{ formatDate(item.bill.billing_from) }} → {{ formatDate(item.bill.billing_to) }}</span
          >
        </div>
        <div class="d-flex justify-space-between py-1">
          <span>Amount</span><span>{{ formatCurrency(item.bill.amount) }}</span>
        </div>
        <v-btn
          class="mt-3"
          size="small"
          color="primary"
          :href="`https://ontrack-outreach.web.app/km-bills/${item.bill.id}`"
          target="_blank"
        >
          Settle
        </v-btn>
      </v-card-text>
      <v-card-text v-else>
        <div class="d-flex justify-space-between py-1">
          <span>Period</span
          ><span>{{ formatDate(item.period.from) }} → {{ formatDate(item.period.to) }}</span>
        </div>
        <div class="d-flex justify-space-between py-1">
          <span>Total KM</span><span>{{ item.usage.totalKm }}</span>
        </div>
        <div class="d-flex justify-space-between py-1">
          <span>Billed For</span><span>{{ item.usage.billed_for }}</span>
        </div>
        <div class="d-flex justify-space-between py-1">
          <span>Amount</span><span>{{ formatCurrency(item.usage.amount) }}</span>
        </div>
        <v-btn class="mt-3" size="small" color="primary" @click="createBill">Create Bill</v-btn>
      </v-card-text>
    </v-card>

    <v-card v-if="canProceed && !loading" variant="outlined" class="pa-4 text-center mb-3">
      <div class="text-h6">No pending KM Bill.</div>
    </v-card>

    <div class="text-right mt-4">
      <v-btn
        :color="canProceed ? 'success' : undefined"
        :disabled="!canProceed"
        variant="flat"
        rounded="lg"
        @click="emit('next')"
      >
        Next
      </v-btn>
    </div>
  </div>
</template>
