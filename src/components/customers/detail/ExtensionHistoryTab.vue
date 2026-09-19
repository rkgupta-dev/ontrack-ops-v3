<script setup>
import { onMounted, ref } from 'vue'
import * as extensionsApi from '../../../services/bookings/extensions.api'
import { toUserMessage } from '../../../utils/errorMessage'
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
    const result = await extensionsApi.fetchExtensions({
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
    const result = await extensionsApi.fetchExtensions({
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

onMounted(load)
</script>

<template>
  <div v-if="loading" class="pa-6">
    <v-skeleton-loader type="table-row@5" />
  </div>

  <EmptyState
    v-else-if="error"
    icon="mdi-alert-circle-outline"
    title="Couldn't load extension history"
    :message="toUserMessage(error)"
  >
    <v-btn class="mt-2" variant="tonal" color="primary" @click="load">Retry</v-btn>
  </EmptyState>

  <EmptyState
    v-else-if="rows.length === 0"
    icon="mdi-calendar-refresh-outline"
    title="No extensions found"
  />

  <div v-else>
    <v-card>
      <v-table>
        <thead>
          <tr>
            <th class="font-weight-bold">Booking</th>
            <th class="font-weight-bold">Extend ID</th>
            <th class="font-weight-bold">Amount</th>
            <th class="font-weight-bold">Payment ID</th>
            <th class="font-weight-bold">Status</th>
            <th class="font-weight-bold">New ED</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ row.bookingId }}</td>
            <td>{{ row.extendId }}</td>
            <td>{{ row.amount }}</td>
            <td>{{ row.paymentId }}</td>
            <td>{{ row.paymentStatus }}</td>
            <td class="text-no-wrap">{{ row.newEndDate }}</td>
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
