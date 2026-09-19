<script setup>
import { onMounted, ref } from 'vue'
import * as customersApi from '../../../services/customers/customers.api'
import { toUserMessage } from '../../../utils/errorMessage'
import { formatDateTime } from '../../../utils/date'
import EmptyState from '../../common/EmptyState.vue'

const props = defineProps({
  customerId: { type: [String, Number], required: true },
})

const rows = ref([])
const total = ref(0)
const loading = ref(true)
const error = ref(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const result = await customersApi.fetchCustomerTrafficAttribution(props.customerId)
    rows.value = result.rows
    total.value = result.total
  } catch (err) {
    error.value = err
  } finally {
    loading.value = false
  }
}

// "conversion_pending" is the one status value confirmed live; any other
// value falls back to a humanized version of the raw string rather than
// guessing at further labels.
const STATUS_META = {
  conversion_pending: { label: 'Pending', color: 'warning' },
  attributed: { label: 'Attributed', color: 'success' },
}

function statusMeta(status) {
  if (!status) return { label: '—', color: 'secondary' }
  return (
    STATUS_META[status] ?? {
      label: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      color: 'secondary',
    }
  )
}

const ATTRIBUTION_COLORS = {
  last_touch: 'warning',
  first_touch: 'info',
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
    title="Couldn't load traffic attribution"
    :message="toUserMessage(error)"
  >
    <v-btn class="mt-2" variant="tonal" color="primary" @click="load">Retry</v-btn>
  </EmptyState>

  <EmptyState
    v-else-if="rows.length === 0"
    icon="mdi-chart-line"
    title="No attribution data found"
  />

  <div v-else>
    <div class="text-body-2 text-medium-emphasis mb-4">{{ total }} rows found</div>

    <v-card>
      <v-table>
        <thead>
          <tr>
            <th class="font-weight-bold">ID</th>
            <th class="font-weight-bold">Anonymous ID</th>
            <th class="font-weight-bold">Attribution</th>
            <th class="font-weight-bold">Status</th>
            <th class="font-weight-bold">Source</th>
            <th class="font-weight-bold">Medium</th>
            <th class="font-weight-bold">Campaign</th>
            <th class="font-weight-bold">Platform</th>
            <th class="font-weight-bold">Booking ID</th>
            <th class="font-weight-bold">Attributed</th>
            <th class="font-weight-bold">Created</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ row.id }}</td>
            <td class="text-no-wrap">{{ row.anonId }}</td>
            <td>
              <v-chip
                v-if="row.attributionType"
                size="small"
                variant="flat"
                :color="ATTRIBUTION_COLORS[row.attributionType] ?? 'secondary'"
              >
                {{ row.attributionType }}
              </v-chip>
              <span v-else>—</span>
            </td>
            <td>
              <v-chip size="small" variant="flat" :color="statusMeta(row.status).color">
                {{ statusMeta(row.status).label }}
              </v-chip>
            </td>
            <td>{{ row.source || '—' }}</td>
            <td>{{ row.medium || '—' }}</td>
            <td>{{ row.campaign || '—' }}</td>
            <td>{{ row.platform || '—' }}</td>
            <td>
              <router-link
                v-if="row.bookingId"
                :to="{ name: 'booking-detail', params: { bookingId: row.bookingId } }"
              >
                <v-chip size="small" variant="flat" color="success">{{ row.bookingId }}</v-chip>
              </router-link>
              <span v-else>—</span>
            </td>
            <td class="text-no-wrap">
              {{ row.attributedAt ? formatDateTime(row.attributedAt) : '—' }}
            </td>
            <td class="text-no-wrap">{{ formatDateTime(row.createdAt) }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </div>
</template>
