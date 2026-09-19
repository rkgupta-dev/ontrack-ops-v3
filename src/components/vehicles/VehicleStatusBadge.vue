<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: Number, default: null },
  size: { type: String, default: 'x-small' },
})

/**
 * Single source of truth for vehicle status → label/color (a *different*
 * status domain than BookingStatusBadge.vue's — this is vehicle status,
 * not booking status, and the two numeric codes mean different things
 * despite overlapping values). Originally ported from `modifyBooking.vue`'s
 * `getStatusVariant()`; extended with 7 (Sold) / 8 (Scrapped) after finding
 * `vehicleDetails.vue`'s own `badgeText()`/`badgeClass()` — the fuller of
 * the two old-app copies — while building the Vehicle Detail page. Not a
 * documented backend enum — same ASSUMPTION caveat as BookingStatusBadge.vue.
 */
const STATUS_META = {
  0: { label: 'Available', color: 'primary' },
  1: { label: 'Booked', color: 'success' },
  2: { label: 'Under Service', color: 'warning' },
  3: { label: 'Not Working', color: 'error' },
  4: { label: 'Ongoing Under Service', color: 'primary' },
  5: { label: 'Water Wash', color: 'primary' },
  6: { label: 'Returned', color: 'primary' },
  7: { label: 'Sold', color: 'warning' },
  8: { label: 'Scrapped', color: 'warning' },
  10: { label: 'Cancelled', color: 'primary' },
}

const meta = computed(() => STATUS_META[props.status] ?? { label: 'Unknown', color: 'secondary' })
</script>

<template>
  <v-chip :size="size" :color="meta.color" variant="tonal">{{ meta.label }}</v-chip>
</template>
