<script setup>
import { onMounted, ref } from 'vue'
import * as collectionsApi from '../../../services/bookings/collections.api'
import { formatCurrency } from '../../../utils/currency'
import { formatFullDate } from '../../../utils/date'
import EmptyState from '../../common/EmptyState.vue'

const props = defineProps({
  vehicleId: { type: [String, Number], required: true },
})

const loading = ref(true)
const rows = ref([])
const total = ref(0)
const page = ref(1)

// Read-only: the old app's shared collectionList.vue component always
// posts its "Add Collection" action against `bookingId` even when it's
// being used in vehicle-only scope (as it is here) — so the add form would
// silently send an undefined booking id if ported alongside this view.
// Not replicated; this tab is list-only.
async function load() {
  loading.value = true
  try {
    const result = await collectionsApi.fetchCollections({
      vehicleId: props.vehicleId,
      page: page.value,
    })
    rows.value = [...rows.value, ...result.rows]
    total.value = result.total
    page.value += 1
  } catch {
    // leave rows as-is — an empty/failed page still renders the empty state
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <div>
    <div v-if="loading && rows.length === 0" class="d-flex justify-center py-6">
      <v-progress-circular indeterminate color="primary" />
    </div>
    <EmptyState
      v-else-if="rows.length === 0"
      icon="mdi-cash-multiple"
      title="No collections found"
    />
    <template v-else>
      <v-card v-for="(row, index) in rows" :key="index" variant="outlined" class="mb-3 pa-4">
        <div class="d-flex justify-space-between">
          <span class="font-weight-medium">{{ row.bookingId ?? '—' }}</span>
          <span class="font-weight-medium">{{ formatCurrency(row.amount) }}</span>
        </div>
        <div class="text-caption text-medium-emphasis">
          {{ row.source ?? '—' }} · {{ formatFullDate(row.createdAt) }}
        </div>
        <div v-if="row.comment" class="text-caption mt-1">{{ row.comment }}</div>
      </v-card>
      <div v-if="total > rows.length" class="text-center mt-2">
        <v-btn variant="text" color="primary" :loading="loading" @click="load">Load More</v-btn>
      </div>
    </template>
  </div>
</template>
