<script setup>
import { formatFullDate, formatRelativeTime } from '../../utils/date'

const props = defineProps({
  item: { type: Object, required: true },
})

const deliveryMeta = {
  0: { label: 'Pickup', color: 'success' },
  1: { label: 'Delivery', color: 'primary' },
}

const planTypeColors = {
  monthly: 'grey-darken-2',
  weekly: 'primary',
  daily: 'warning',
}

const meta = deliveryMeta[props.item.deliveryType] ?? null
const planTypeColor = planTypeColors[props.item.planType?.toLowerCase?.()] ?? 'secondary'
</script>

<template>
  <v-card
    variant="outlined"
    rounded="lg"
    class="pa-4"
    :to="
      item.bookingId ? { name: 'booking-detail', params: { bookingId: item.bookingId } } : undefined
    "
    :link="Boolean(item.bookingId)"
  >
    <div class="d-flex justify-space-between align-center ga-3">
      <div class="flex-grow-1 min-w-0">
        <div class="d-flex ga-2 mb-2 flex-wrap">
          <v-chip v-if="meta" size="small" :color="meta.color" variant="flat">
            {{ meta.label }}
          </v-chip>
          <v-chip v-if="item.planType" size="small" :color="planTypeColor" variant="flat">
            {{ item.planType.toUpperCase() }}
          </v-chip>
        </div>
        <div class="text-subtitle-1 font-weight-bold">{{ item.registrationNumber ?? '—' }}</div>
        <div class="text-caption text-medium-emphasis">{{ item.bookingId ?? '—' }}</div>
        <div class="text-body-2 mt-1">{{ item.customerName ?? '—' }}</div>
        <div class="text-body-2 text-medium-emphasis">{{ item.modelName ?? '—' }}</div>
      </div>

      <v-img
        v-if="item.modelImage"
        :src="item.modelImage"
        :alt="item.modelName ?? 'Vehicle'"
        width="130"
        max-width="130"
        height="100"
        cover
        rounded="lg"
        class="flex-shrink-0"
      >
        <template #placeholder>
          <div class="d-flex align-center justify-center fill-height bg-grey-lighten-3">
            <v-progress-circular indeterminate size="20" color="grey-darken-1" />
          </div>
        </template>
        <template #error>
          <div class="d-flex align-center justify-center fill-height bg-grey-lighten-3">
            <v-icon icon="mdi-motorbike" color="grey" />
          </div>
        </template>
      </v-img>
    </div>
    <v-divider class="my-3" />
    <div class="text-caption text-medium-emphasis">
      {{ formatFullDate(item.createdAt) }} | {{ formatRelativeTime(item.createdAt) }}
      <template v-if="item.medium"> | {{ item.medium }}</template>
    </div>
  </v-card>
</template>
