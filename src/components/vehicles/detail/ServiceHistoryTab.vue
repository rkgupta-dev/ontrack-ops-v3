<script setup>
import { onMounted, ref } from 'vue'
import * as vehicleDetailApi from '../../../services/vehicles/vehicleDetail.api'
import { formatFullDate } from '../../../utils/date'
import EmptyState from '../../common/EmptyState.vue'

const props = defineProps({
  vehicleId: { type: [String, Number], required: true },
})

const loading = ref(true)
const rows = ref([])

onMounted(async () => {
  try {
    rows.value = await vehicleDetailApi.fetchServiceHistory(props.vehicleId)
  } catch {
    // A vehicle with no service history yet 404s rather than returning an
    // empty array — treated the same as "no rows" rather than an error.
    rows.value = []
  } finally {
    loading.value = false
  }
})

// The old app makes each row a full-page redirect to a separate services
// app (`services-ontrack.web.app`) — replicated as an external link rather
// than a route, since that app isn't part of this migration.
function serviceUrl(serviceId) {
  return `https://services-ontrack.web.app/services/${serviceId}`
}
</script>

<template>
  <div v-if="loading" class="d-flex justify-center py-6">
    <v-progress-circular indeterminate color="primary" />
  </div>
  <EmptyState v-else-if="rows.length === 0" icon="mdi-wrench-outline" title="No service history" />
  <div v-else>
    <v-card
      v-for="(row, index) in rows"
      :key="index"
      variant="outlined"
      class="mb-3 pa-4"
      link
      :href="serviceUrl(row.serviceId)"
      target="_blank"
    >
      <div class="font-weight-medium">#{{ row.serviceId }}</div>
      <v-row class="mt-1">
        <v-col cols="6">
          <div class="text-caption text-medium-emphasis">Raised on</div>
          <div class="font-weight-medium">{{ formatFullDate(row.date) }}</div>
        </v-col>
        <v-col cols="6">
          <div class="text-caption text-medium-emphasis">Type</div>
          <div class="font-weight-medium">{{ row.serviceTypeData?.name ?? 'Not Provided' }}</div>
        </v-col>
      </v-row>
    </v-card>
  </div>
</template>
