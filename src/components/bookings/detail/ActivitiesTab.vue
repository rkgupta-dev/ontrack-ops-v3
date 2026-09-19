<script setup>
import { onMounted, ref } from 'vue'
import * as agentActivitiesApi from '../../../services/bookings/agentActivities.api'
import { formatFullDate } from '../../../utils/date'
import EmptyState from '../../common/EmptyState.vue'

const props = defineProps({
  bookingId: { type: [String, Number], required: true },
})

const rows = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const result = await agentActivitiesApi.fetchAgentActivities({
      bookingId: props.bookingId,
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

onMounted(() => {
  page.value = 1
  rows.value = []
  load()
})
</script>

<template>
  <div>
    <div class="text-caption text-medium-emphasis mb-3">
      {{ rows.length }} / {{ total }} entries
    </div>

    <v-card v-for="(activity, index) in rows" :key="index" variant="outlined" class="mb-3 pa-4">
      <v-chip size="small" color="warning" variant="tonal" class="mb-2">{{ activity.type }}</v-chip>
      <div>{{ activity.description }}</div>
      <div class="text-caption text-medium-emphasis mt-1">
        {{ activity.userAgentData?.name ?? 'Unknown' }}, {{ formatFullDate(activity.createdAt) }}
      </div>
    </v-card>

    <EmptyState v-if="rows.length === 0 && !loading" icon="mdi-history" title="No entries found" />

    <div v-if="total > rows.length" class="text-center mt-2">
      <v-btn variant="text" color="primary" :loading="loading" @click="load">Load More</v-btn>
    </div>
  </div>
</template>
