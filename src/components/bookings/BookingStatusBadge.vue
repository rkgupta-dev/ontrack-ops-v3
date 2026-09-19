<script setup>
import { computed } from 'vue'
import { getBookingStatusMeta } from '../../utils/bookingStatus'

const props = defineProps({
  status: { type: Number, default: null },
  paymentStatus: { type: Number, default: null },
  size: { type: String, default: 'small' },
})

const meta = computed(() => getBookingStatusMeta(props.status, props.paymentStatus))
</script>

<template>
  <v-chip :size="size" :color="meta.color" variant="tonal">{{ meta.label }}</v-chip>
</template>
