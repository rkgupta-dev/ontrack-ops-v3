<script setup>
import { onMounted, ref } from 'vue'
import * as bookingDetailApi from '../../../services/bookings/bookingDetail.api'
import { formatFullDate } from '../../../utils/date'
import EmptyState from '../../common/EmptyState.vue'

const props = defineProps({
  bookingId: { type: [String, Number], required: true },
  // The string booking id (e.g. "L26I0141411") — distinct from the numeric
  // `bookingId` above, needed only for the "Edit Images" route link since
  // every /bookings/:bookingId/... route (this one included) keys off the
  // string id, not the numeric DB id this tab otherwise uses.
  bookingCode: { type: String, required: true },
})

const loading = ref(true)
const lineItem = ref(null)

const PRE_IMAGES = [
  { key: 'preImage1', label: 'Rider Pic' },
  { key: 'preImage2', label: 'DL Image' },
  { key: 'preImage3', label: 'Address Proof' },
  { key: 'preImage5', label: 'Address Proof Back' },
  { key: 'preImage4', label: 'Company ID' },
  { key: 'preImage6', label: 'Odometer' },
]
const POST_IMAGES = [
  { key: 'postImage1', label: 'Post Image 1' },
  { key: 'postImage2', label: 'Post Image 2' },
]

async function load() {
  loading.value = true
  try {
    lineItem.value = await bookingDetailApi.fetchBookingLineItem(props.bookingId)
  } catch {
    lineItem.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div v-if="loading" class="d-flex justify-center py-6">
    <v-progress-circular indeterminate color="primary" />
  </div>
  <EmptyState
    v-else-if="!lineItem"
    icon="mdi-image-off-outline"
    title="No pre-booking data found"
  />
  <div v-else>
    <div>
      KM Reading: <strong>{{ lineItem.preKm ?? '—' }}</strong>
    </div>
    <div class="font-italic">Comment: {{ lineItem.preComment ?? '—' }}</div>
    <div class="text-caption text-medium-emphasis">{{ formatFullDate(lineItem.createdAt) }}</div>
    <v-divider class="my-4" />

    <div class="d-flex justify-space-between align-center mb-3">
      <div class="text-subtitle-1 font-weight-medium">Pre Booking Images</div>
      <v-btn
        size="small"
        variant="tonal"
        rounded="lg"
        color="primary"
        :to="{ name: 'booking-pre-booking-data', params: { bookingId: bookingCode } }"
      >
        Edit Images
      </v-btn>
    </div>
    <v-row>
      <v-col v-for="img in PRE_IMAGES" :key="img.key" cols="6" md="4">
        <div class="text-caption text-medium-emphasis mb-1">{{ img.label }}</div>
        <a v-if="lineItem[img.key]" :href="lineItem[img.key]" target="_blank">
          <v-img :src="lineItem[img.key]" height="160" rounded="lg" cover />
        </a>
        <span v-else class="text-medium-emphasis">NA</span>
      </v-col>
    </v-row>

    <v-divider class="my-4" />
    <div class="text-subtitle-1 font-weight-medium mb-3">Post Booking Images</div>
    <v-row>
      <v-col v-for="img in POST_IMAGES" :key="img.key" cols="6" md="4">
        <div class="text-caption text-medium-emphasis mb-1">{{ img.label }}</div>
        <a v-if="lineItem[img.key]" :href="lineItem[img.key]" target="_blank">
          <v-img :src="lineItem[img.key]" height="160" rounded="lg" cover />
        </a>
        <span v-else class="text-medium-emphasis">NA</span>
      </v-col>
    </v-row>
  </div>
</template>
