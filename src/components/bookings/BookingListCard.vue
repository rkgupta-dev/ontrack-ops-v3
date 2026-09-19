<script setup>
import { computed } from 'vue'
import { formatDateTime } from '../../utils/date'
import { getBookingListStatusMeta } from '../../utils/bookingStatus'

const props = defineProps({
  item: { type: Object, required: true },
})

const statusMeta = computed(() => getBookingListStatusMeta(props.item.statusCode))

// `plan_type` (snake_case, e.g. "WEEKLY") — confirmed live on A-024 rows
// (not in docs/api-reference.md's field list, which only enumerates a
// subset). Not `planType`/camelCase — that was a guess ported from
// BookingFeedCard.vue's `item.planType`, which reads the sibling A-046
// endpoint's own (differently-cased) field and doesn't apply here.
const planTypeLabel = computed(() => props.item.raw?.plan_type?.toUpperCase?.() ?? null)

const daysOldLabel = computed(() => {
  const value = props.item.raw?.createdAt
  if (!value) return null
  const created = new Date(value)
  if (Number.isNaN(created.getTime())) return null
  const days = Math.max(0, Math.floor((Date.now() - created.getTime()) / 86400000))
  return `${days} day${days === 1 ? '' : 's'} old`
})
</script>

<template>
  <v-card
    variant="outlined"
    rounded="lg"
    class="pa-4 booking-list-card"
    :to="
      item.bookingId ? { name: 'booking-detail', params: { bookingId: item.bookingId } } : undefined
    "
    :link="Boolean(item.bookingId)"
  >
    <v-row class="align-center">
      <v-col cols="2">
        <!-- Thumbnail -->
        <v-img
          :src="item.raw?.modelData?.image"
          width="78"
          height="78"
          contain
          class="flex-shrink-0"
        >
          <template #placeholder>
            <div
              class="d-flex align-center justify-center fill-height bg-grey-lighten-4 rounded-lg"
            >
              <v-icon icon="mdi-motorbike" color="grey" size="32" />
            </div>
          </template>
          <template #error>
            <div
              class="d-flex align-center justify-center fill-height bg-grey-lighten-4 rounded-lg"
            >
              <v-icon icon="mdi-motorbike" color="grey" size="32" />
            </div>
          </template>
        </v-img>
      </v-col>
      <v-col cols="10">
        <!-- Main content: Image on Left + Info & Chips on Right -->
        <div class="d-flex align-center ga-2">
          <!-- Center & Right Block -->
          <div
            class="d-flex flex-grow-1 flex-column flex-sm-row justify-space-between align-start ga-2 min-w-0"
          >
            <!-- Booking Info Column -->
            <div class="min-w-0">
              <!-- Badges -->
              <div class="d-flex ga-2 flex-wrap align-center">
                <v-chip size="x-small" :color="statusMeta.color" variant="tonal">
                  {{ statusMeta.label }}
                </v-chip>
                <v-chip
                  v-if="planTypeLabel"
                  size="x-small"
                  class="font-weight-medium px-2"
                  :color="planTypeLabel === 'WEEKLY' ? 'blue' : 'secondary'"
                  variant="tonal"
                >
                  {{ planTypeLabel }}
                </v-chip>
              </div>
              <div class="text-body-2 mt-1 text-medium-emphasis text-truncate">
                {{ item.bookingId ?? '—' }}
              </div>
              <div class="text-h6 font-weight-bold text-truncate leading-tight">
                {{ item.vehicleRegistration ?? '—' }}
              </div>

              <div class="text-body-2 text-medium-emphasis text-truncate">
                {{ item.model ?? '—' }}
              </div>
              <div class="text-subtitle-2 font-weight-bold text-truncate">
                {{ item.customer ?? '—' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Divider & Meta Footer -->
        <v-divider class="mt-4 mb-3" />
        <div class="text-caption text-medium-emphasis">
          {{ formatDateTime(item.raw?.createdAt) }}
          <template v-if="daysOldLabel"> | {{ daysOldLabel }}</template>
        </div>
      </v-col>
    </v-row>
  </v-card>
</template>

<style scoped>
.booking-list-card {
  text-decoration: none;
  color: inherit;
  border-color: rgba(0, 0, 0, 0.12);
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.booking-list-card:hover {
  border-color: rgba(0, 0, 0, 0.24);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.leading-tight {
  line-height: 1.25;
}

.mt-0-5 {
  margin-top: 2px;
}
</style>
