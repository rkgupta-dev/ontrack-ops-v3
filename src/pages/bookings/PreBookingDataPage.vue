<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import * as bookingDetailApi from '../../services/bookings/bookingDetail.api'
import { updatePreBookingData } from '../../services/bookings/preBookingData.api'
import { useUiStore } from '../../stores/ui.store'
import { toUserMessage } from '../../utils/errorMessage'
import EmptyState from '../../components/common/EmptyState.vue'

const route = useRoute()
const uiStore = useUiStore()
const bookingId = route.params.bookingId

const loading = ref(true)
const loadError = ref(null)
const bookingData = ref(null)
const lineItem = ref(null)

const km = ref('')
const permanentAddress = ref('')
const comment = ref('')

// key -> { file, preview } for newly-chosen images; existing images come
// from lineItem[key] until replaced.
const IMAGE_SLOTS = [
  { key: 'preImage1', field: 'image1', label: 'Rider Pic' },
  { key: 'preImage2', field: 'image2', label: 'DL Image' },
  { key: 'preImage3', field: 'image3', label: 'Address Proof' },
  { key: 'preImage4', field: 'image4', label: 'Company Id' },
  { key: 'preImage5', field: 'image5', label: 'Address Proof Back' },
]
const newImages = ref({})
const fileInputs = ref({})

async function load() {
  loading.value = true
  loadError.value = null
  try {
    bookingData.value = await bookingDetailApi.fetchBookingDetail(bookingId)
    if (bookingData.value) {
      lineItem.value = await bookingDetailApi.fetchBookingLineItem(bookingData.value.id)
      km.value = lineItem.value?.preKm ?? ''
      comment.value = lineItem.value?.preComment ?? ''
      permanentAddress.value = lineItem.value?.permanentAddress ?? ''
    }
  } catch (error) {
    loadError.value = error
    uiStore.notify(toUserMessage(error, "Couldn't load this booking."), { type: 'error' })
  } finally {
    loading.value = false
  }
}
onMounted(load)

function previewFor(slot) {
  return newImages.value[slot.key]?.preview || lineItem.value?.[slot.key] || null
}

function chooseImage(slot) {
  fileInputs.value[slot.key]?.click()
}

function onFileSelected(event, slot) {
  const file = event.target.files[0]
  if (!file) return
  newImages.value = {
    ...newImages.value,
    [slot.key]: { file, preview: URL.createObjectURL(file) },
  }
}

const canSubmit = computed(() => {
  if (!km.value || !permanentAddress.value || !comment.value) return false
  return IMAGE_SLOTS.every((slot) => previewFor(slot))
})

const submitting = ref(false)
async function submitForm() {
  submitting.value = true
  try {
    const images = {
      riderPic: newImages.value.preImage1?.file,
      dlPic: newImages.value.preImage2?.file,
      addressProofFrontPic: newImages.value.preImage3?.file,
      idCardPic: newImages.value.preImage4?.file,
      addressProofBackPic: newImages.value.preImage5?.file,
    }
    await updatePreBookingData(bookingData.value.id, images, {
      kmReading: km.value,
      comment: comment.value,
      permanentAddress: permanentAddress.value,
    })
    uiStore.notify('Update success', { type: 'success' })
    newImages.value = {}
    await load()
  } catch {
    uiStore.notify('Update failed.', { type: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div v-if="loading" class="d-flex justify-center py-10">
    <v-progress-circular indeterminate color="primary" />
  </div>

  <EmptyState
    v-else-if="loadError || !bookingData"
    icon="mdi-alert-circle-outline"
    title="Couldn't load this booking"
    :message="toUserMessage(loadError)"
  >
    <v-btn class="mt-4" variant="tonal" color="primary" @click="load">Retry</v-btn>
  </EmptyState>

  <div v-else>
    <h2 class="text-h5 mb-4">Pre Booking Data</h2>

    <v-card class="pa-4 mb-4">
      <v-row>
        <v-col cols="12" md="6">
          <v-text-field v-model="km" label="KM Reading" hide-details />
        </v-col>
        <v-col cols="6" md="3">
          <v-text-field
            :model-value="bookingData.startDate"
            label="Start Date"
            readonly
            hide-details
          />
        </v-col>
        <v-col cols="6" md="3">
          <v-text-field :model-value="bookingData.endDate" label="End Date" readonly hide-details />
        </v-col>
      </v-row>
    </v-card>

    <v-row>
      <v-col v-for="slot in IMAGE_SLOTS" :key="slot.key" cols="12" md="4">
        <div class="text-caption text-medium-emphasis mb-1">{{ slot.label }}</div>
        <template v-if="previewFor(slot)">
          <v-img :src="previewFor(slot)" height="150" rounded="lg" cover />
        </template>
        <v-card v-else class="py-8 text-center" variant="outlined">NA</v-card>
        <v-btn variant="text" color="primary" size="small" class="mt-1" @click="chooseImage(slot)">
          {{ previewFor(slot) ? 'Replace' : 'Choose' }}
        </v-btn>
        <input
          :ref="(el) => (fileInputs[slot.key] = el)"
          type="file"
          accept="image/*"
          style="display: none"
          @change="(e) => onFileSelected(e, slot)"
        />
      </v-col>
    </v-row>

    <v-card class="pa-4 mt-4">
      <v-textarea
        v-model="permanentAddress"
        label="Permanent Address"
        variant="outlined"
        rounded="lg"
      />
      <v-textarea v-model="comment" label="Comment" variant="outlined" rounded="lg" />
      <v-btn
        block
        size="large"
        color="primary"
        variant="flat"
        rounded="lg"
        :disabled="!canSubmit"
        :loading="submitting"
        @click="submitForm"
      >
        Update
      </v-btn>
    </v-card>
  </div>
</template>
