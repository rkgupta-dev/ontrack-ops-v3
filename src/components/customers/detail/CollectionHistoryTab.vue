<script setup>
import { onMounted, ref } from 'vue'
import * as collectionsApi from '../../../services/bookings/collections.api'
import { toUserMessage } from '../../../utils/errorMessage'
import { formatDateTime } from '../../../utils/date'
import EmptyState from '../../common/EmptyState.vue'

const props = defineProps({
  customerId: { type: [String, Number], required: true },
})

const rows = ref([])
const total = ref(0)
const page = ref(1)
const limit = 10
const loading = ref(true)
const loadingMore = ref(false)
const error = ref(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const result = await collectionsApi.fetchCollections({
      customerId: props.customerId,
      page: 1,
      limit,
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
    const result = await collectionsApi.fetchCollections({
      customerId: props.customerId,
      page: nextPage,
      limit,
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

// Per user instruction: the receipt download always lives at this fixed
// glacier host + the row's own `id` — not a field the API returns.
function receiptUrl(row) {
  return `https://glacier.on-track.in/api/collection/payment-receipt/${row.id}`
}

onMounted(load)
</script>

<template>
  <div v-if="loading" class="pa-6">
    <v-skeleton-loader type="table-row@5" />
  </div>

  <EmptyState
    v-else-if="error"
    icon="mdi-alert-circle-outline"
    title="Couldn't load collection history"
    :message="toUserMessage(error)"
  >
    <v-btn class="mt-2" variant="tonal" color="primary" @click="load">Retry</v-btn>
  </EmptyState>

  <EmptyState v-else-if="rows.length === 0" icon="mdi-cash-multiple" title="No collections found" />

  <div v-else>
    <v-card>
      <v-table>
        <thead>
          <tr>
            <th class="font-weight-bold">Booking</th>
            <th class="font-weight-bold">Scheme</th>
            <th class="font-weight-bold">Amount</th>
            <th class="font-weight-bold">Source</th>
            <th class="font-weight-bold">Type</th>
            <th class="font-weight-bold">Paid on</th>
            <th class="font-weight-bold">ID</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>
              <router-link
                v-if="row.bookingId"
                :to="{ name: 'booking-detail', params: { bookingId: row.bookingId } }"
              >
                {{ row.bookingId }}
              </router-link>
              <span v-else>—</span>
            </td>
            <td>{{ row.type }}</td>
            <td>{{ row.amount }}</td>
            <td>{{ row.source }}</td>
            <td>{{ row.transactionType }}</td>
            <td class="text-no-wrap">{{ formatDateTime(row.paymentReceivedOn) }}</td>
            <td>
              <v-btn
                :href="receiptUrl(row)"
                target="_blank"
                rel="noopener"
                size="small"
                variant="tonal"
                append-icon="mdi-download"
                rounded="lg"
              >
                Receipt
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-btn
      v-if="rows.length < total"
      variant="tonal"
      color="primary"
      class="mt-3"
      :loading="loadingMore"
      @click="loadMore"
    >
      Load More
    </v-btn>
  </div>
</template>
