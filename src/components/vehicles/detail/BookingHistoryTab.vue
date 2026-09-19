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
    rows.value = await vehicleDetailApi.fetchVehicleBookingHistory(props.vehicleId)
  } catch {
    rows.value = []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading" class="d-flex justify-center py-6">
    <v-progress-circular indeterminate color="primary" />
  </div>
  <EmptyState
    v-else-if="rows.length === 0"
    icon="mdi-calendar-blank-outline"
    title="No booking history"
  />
  <div v-else>
    <v-card
      v-for="(row, index) in rows"
      :key="index"
      variant="outlined"
      class="mb-3 pa-4"
      link
      :to="{ name: 'booking-detail', params: { bookingId: row.bookingId } }"
    >
      <div class="font-weight-medium mb-2">{{ row.bookingId }}</div>
      <v-row>
        <v-col cols="6">
          <div class="text-caption text-medium-emphasis">Name</div>
          <div class="font-weight-medium">
            {{ row.customerData?.fName }} {{ row.customerData?.lName }}
          </div>
        </v-col>
        <v-col cols="6">
          <div class="text-caption text-medium-emphasis">Mobile</div>
          <div class="font-weight-medium">{{ row.customerData?.mobile ?? '—' }}</div>
        </v-col>
        <v-col cols="12" md="6">
          <div class="text-caption text-medium-emphasis">Email</div>
          <div class="font-weight-medium">{{ row.customerData?.email ?? '—' }}</div>
        </v-col>
        <v-col cols="6" md="3">
          <div class="text-caption text-medium-emphasis">Start Date</div>
          <div class="font-weight-medium">{{ formatFullDate(row.startDate) }}</div>
        </v-col>
        <v-col cols="6" md="3">
          <div class="text-caption text-medium-emphasis">End Date</div>
          <div class="font-weight-medium">{{ formatFullDate(row.endDate) }}</div>
        </v-col>
      </v-row>
    </v-card>
  </div>
</template>
