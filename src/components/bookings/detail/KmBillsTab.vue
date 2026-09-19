<script setup>
import { onMounted, ref } from 'vue'
import * as kmBillsApi from '../../../services/bookings/kmBills.api'
import { useUiStore } from '../../../stores/ui.store'
import { toUserMessage } from '../../../utils/errorMessage'
import { formatFullDate } from '../../../utils/date'
import EmptyState from '../../common/EmptyState.vue'

const props = defineProps({
  bookingId: { type: [String, Number], required: true },
})

const uiStore = useUiStore()
const bills = ref([])
const loading = ref(true)

const headers = [
  { title: 'Bill ID', key: 'id' },
  { title: 'Previous KM', key: 'previous_reading' },
  { title: 'Current KM', key: 'current_reading' },
  { title: 'Distance / Energy', key: 'consumed_value' },
  { title: 'Amount (₹)', key: 'amount' },
  { title: 'Status', key: 'status' },
  { title: 'Payment', key: 'payment_status' },
  { title: 'Billing Period', key: 'period', sortable: false },
  { title: 'Created At', key: 'createdAt' },
  { title: 'Action', key: 'actions', sortable: false },
]

async function load() {
  loading.value = true
  try {
    bills.value = await kmBillsApi.fetchKmBills(props.bookingId)
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not load KM bills.'), { type: 'error' })
  } finally {
    loading.value = false
  }
}

function statusColor(status) {
  if (status === 'created') return undefined
  if (status === 'pending') return 'warning'
  if (status === 'cancelled') return 'error'
  return 'primary'
}
function paymentColor(status) {
  if (status === 'paid') return 'success'
  if (status === 'unpaid') return 'error'
  return undefined
}

onMounted(load)
</script>

<template>
  <v-card>
    <v-data-table
      :headers="headers"
      :items="bills"
      :loading="loading"
      hide-default-footer
      class="single-line-table"
    >
      <template #[`item.createdAt`]="{ item }">
        {{ formatFullDate(item.createdAt) }}
      </template>

      <template #[`item.status`]="{ item }">
        <v-chip size="small" :color="statusColor(item.status)" variant="tonal">
          {{ item.status }}
        </v-chip>
      </template>

      <template #[`item.payment_status`]="{ item }">
        <v-chip size="small" :color="paymentColor(item.payment_status)" variant="tonal">
          {{ item.payment_status }}
        </v-chip>
      </template>

      <!-- Wrapped in nowrap to avoid 2 lines for the date range -->
      <template #[`item.period`]="{ item }">
        <span class="text-no-wrap">
          {{ formatFullDate(item.billing_from) }} – {{ formatFullDate(item.billing_to) }}
        </span>
      </template>

      <template #[`item.actions`]="{ item }">
        <v-btn
          rounded="lg"
          size="small"
          variant="tonal"
          color="primary"
          :href="`https://ontrack-outreach.web.app/km-bills/${item.id}`"
          target="_blank"
        >
          Details
        </v-btn>
      </template>

      <template #no-data>
        <EmptyState icon="mdi-receipt-text-outline" title="No bills found for this booking." />
      </template>
    </v-data-table>
  </v-card>
</template>

<style scoped>
/* Forces headers to be bold, dark, and never wrap to two lines */
:deep(.single-line-table th) {
  font-weight: 700 !important;
  white-space: nowrap !important;
}

/* Prevents table body cells from wrapping into double lines */
:deep(.single-line-table td) {
  white-space: nowrap !important;
}
</style>
