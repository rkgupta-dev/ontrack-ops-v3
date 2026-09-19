<script setup>
import { onMounted, ref } from 'vue'
import * as endBookingApi from '../../../services/bookings/endBooking.api'
import EmptyState from '../../common/EmptyState.vue'

const props = defineProps({
  bookingId: { type: [String, Number], required: true },
})

const loading = ref(true)
const violations = ref([])

onMounted(async () => {
  try {
    violations.value = await endBookingApi.fetchTrafficViolations(props.bookingId)
  } catch {
    violations.value = []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <div v-if="loading" class="text-medium-emphasis py-4">Loading..</div>
    <template v-else>
      <v-card v-for="(v, index) in violations" :key="index" variant="outlined" class="mb-3 pa-3">
        <div><strong>Offence</strong> {{ v.offence }}</div>
        <div><strong>Point Name</strong> {{ v.pointName }}</div>
        <div><strong>Notice Date</strong> {{ v.noticeDate }}</div>
        <div><strong>Violation Date</strong> {{ v.noticeDate }} at {{ v.violationTime }}</div>
        <div class="text-h6 mt-1"><strong>Fine Amount</strong> {{ v.fineAmount }}</div>
      </v-card>
      <EmptyState
        v-if="violations.length === 0"
        icon="mdi-alert-outline"
        title="No records available as of now."
      />
    </template>
  </div>
</template>
