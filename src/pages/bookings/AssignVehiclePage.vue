<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as bookingDetailApi from '../../services/bookings/bookingDetail.api'
import * as assignApi from '../../services/bookings/assignVehicle.api'
import { toUserMessage } from '../../utils/errorMessage'
import { todayIsoDate, addDaysIso } from '../../utils/date'
import EmptyState from '../../components/common/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const bookingId = route.params.bookingId

const loading = ref(true)
const loadError = ref(null)

const bookingData = ref(null)
const modelsList = ref([])
const vehiclesList = ref([])
const bookingLineItemData = ref([])

const selectedModel = ref(null)
const selectedVehicle = ref(null)
const kmReading = ref('')
const startDate = ref('')
const endDate = ref('')
const permanentAddress = ref('')
const comment = ref('')
const vehiclePreselected = ref(false)

const modelOptions = computed(() =>
  modelsList.value.map((d) => ({ title: d.modelData.name, value: d.modelData.id })),
)
const vehicleOptions = computed(() =>
  vehiclesList.value.map((d) => ({ title: d.registrationNumber, value: d.id })),
)

// --- Images ---
const IMAGE_FIELDS = [
  { key: 'riderPic', label: 'Rider Pic' },
  { key: 'dlPic', label: 'DL Pic' },
  { key: 'addressProofFrontPic', label: 'Address Proof Front' },
  { key: 'addressProofBackPic', label: 'Address Proof Back' },
  { key: 'idCardPic', label: 'ID Card (company)' },
  { key: 'odometerPic', label: 'Odometer' },
]
const images = ref({
  riderPic: null,
  dlPic: null,
  addressProofFrontPic: null,
  addressProofBackPic: null,
  idCardPic: null,
  odometerPic: null,
})
const previews = ref({})

function onImageChange(key, files) {
  const file = Array.isArray(files) ? files[0] : files
  images.value[key] = file ?? null
  if (previews.value[key]) URL.revokeObjectURL(previews.value[key])
  previews.value[key] = file ? URL.createObjectURL(file) : null
}

onBeforeUnmount(() => {
  Object.values(previews.value).forEach((url) => url && URL.revokeObjectURL(url))
})

const hasAllImages = computed(() => IMAGE_FIELDS.every((f) => images.value[f.key]))
const hasExistingLineItem = computed(() => bookingLineItemData.value?.length > 0)

const validate = computed(() => {
  const base = kmReading.value && selectedVehicle.value && selectedModel.value
  if (!base) return false
  if (hasAllImages.value && permanentAddress.value) return true
  return Boolean(hasExistingLineItem.value)
})

watch(startDate, () => {
  if (!startDate.value) return
  if (bookingData.value?.plan_type === 'WEEKLY') {
    endDate.value = addDaysIso(startDate.value, 7)
  } else {
    endDate.value = addDaysIso(startDate.value, 30)
  }
})

watch(selectedModel, async (modelId) => {
  if (!modelId) return
  try {
    vehiclesList.value = await assignApi.fetchAvailableVehicles(modelId)
  } catch {
    vehiclesList.value = []
  }
  await refreshLineItem()
})

async function refreshLineItem() {
  try {
    bookingLineItemData.value = await bookingDetailApi.fetchBookingLineItem(bookingData.value?.id)
  } catch {
    bookingLineItemData.value = []
  }
}

async function load() {
  loading.value = true
  loadError.value = null
  try {
    const booking = await bookingDetailApi.fetchBookingDetail(bookingId)
    if (!booking) throw new Error('Booking not found')
    bookingData.value = booking
    selectedModel.value = booking.model
    startDate.value = booking.startDate || todayIsoDate()
    endDate.value = booking.endDate || todayIsoDate()
    selectedVehicle.value = booking.vehicle
    vehiclePreselected.value = Boolean(booking.vehicle)

    modelsList.value = await assignApi.fetchModelsStock()
    if (selectedModel.value) {
      vehiclesList.value = await assignApi.fetchAvailableVehicles(selectedModel.value)
    }
    await refreshLineItem()
  } catch (error) {
    loadError.value = toUserMessage(error, 'Failed to load booking details.')
  } finally {
    loading.value = false
  }
}

onMounted(load)

// --- Confirm dialog ---
const confirmPrompt = ref(false)
const assigning = ref(false)
const assignMessage = ref(null)
const assignError = ref(null)
const showSuccessPrompt = ref(false)

function openConfirm() {
  assignMessage.value = null
  assignError.value = null
  showSuccessPrompt.value = false
  confirmPrompt.value = true
}

async function confirmAssign() {
  assigning.value = true
  assignMessage.value = 'Getting Ready ...'
  assignError.value = null
  try {
    if (!hasExistingLineItem.value) {
      await assignApi.submitPreBookingData(bookingData.value.id, images.value, {
        kmReading: kmReading.value,
        comment: comment.value,
        permanentAddress: permanentAddress.value,
      })
      assignMessage.value = 'Pre Data has been set.'
    }
    await assignApi.assignVehicleToBooking(bookingData.value.id, {
      vehicleId: selectedVehicle.value,
      startDate: startDate.value,
      endDate: endDate.value,
    })
    showSuccessPrompt.value = true
  } catch (error) {
    assignError.value = toUserMessage(error, 'Something is wrong with the API.')
  } finally {
    assigning.value = false
  }
}
</script>

<template>
  <div v-if="loading" class="d-flex flex-column align-center py-10">
    <v-progress-circular indeterminate color="warning" class="mb-3" />
    <div class="text-warning">please wait...</div>
    <div class="text-medium-emphasis">creating booking itinerary</div>
  </div>

  <EmptyState
    v-else-if="loadError"
    icon="mdi-alert-circle-outline"
    title="Something went wrong"
    :message="loadError"
  >
    <v-btn class="mt-4" color="primary" @click="load">Retry</v-btn>
  </EmptyState>

  <div v-else>
    <h2 class="text-h6 font-weight-bold mb-4">Booking Itinerary</h2>

    <v-row>
      <v-col cols="12" sm="6">
        <v-select
          v-model="selectedModel"
          label="Model"
          :items="modelOptions"
          :disabled="vehiclePreselected"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select
          v-model="selectedVehicle"
          label="Vehicle"
          :items="vehicleOptions"
          :disabled="vehiclePreselected"
        />
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field v-model="kmReading" label="KM Reading" />
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field v-model="startDate" type="date" label="Start Date" />
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field v-model="endDate" type="date" label="End Date" />
      </v-col>
    </v-row>

    <v-divider class="my-4" />

    <div class="text-subtitle-1 font-weight-medium mb-3">Pre Image</div>
    <v-row>
      <v-col v-for="field in IMAGE_FIELDS" :key="field.key" cols="12" sm="6">
        <div class="text-caption text-medium-emphasis mb-1">{{ field.label }}</div>
        <v-img
          v-if="previews[field.key]"
          :src="previews[field.key]"
          height="140"
          rounded="lg"
          class="mb-1"
          cover
        />
        <v-file-input
          v-model="images[field.key]"
          accept="image/*"
          density="compact"
          prepend-icon=""
          prepend-inner-icon="mdi-camera-outline"
          :label="previews[field.key] ? 'Replace' : 'Upload'"
          @update:model-value="(f) => onImageChange(field.key, f)"
        />
      </v-col>
    </v-row>

    <v-textarea v-model="permanentAddress" label="Permanent Address" rows="2" class="mt-2" />
    <v-textarea v-model="comment" label="Comment" rows="2" />

    <v-btn
      size="large"
      block
      color="primary"
      :disabled="!validate"
      class="mt-4"
      @click="openConfirm"
    >
      Assign Vehicle
    </v-btn>

    <v-dialog v-model="confirmPrompt" max-width="420" persistent>
      <v-card class="pa-6 text-center">
        <template v-if="!showSuccessPrompt">
          <v-icon
            :icon="assignError ? 'mdi-alert-circle' : assignMessage ? undefined : 'mdi-help-circle'"
            :color="assignError ? 'error' : 'warning'"
            size="48"
            class="mb-4"
          />
          <v-progress-circular
            v-if="assignMessage && !assignError"
            indeterminate
            color="primary"
            size="48"
            class="mb-4"
          />
          <h3 v-if="!assignMessage" class="text-h6 font-weight-bold mb-2">Are you sure?</h3>
          <h3 v-else class="text-h6 mb-2" :class="assignError ? 'text-error' : ''">
            {{ assignError ?? assignMessage }}
          </h3>
          <p v-if="!assignMessage && !assignError" class="text-medium-emphasis mb-4">
            Do you want to proceed with assigning this booking?
          </p>
          <div class="d-flex justify-center ga-2 mt-4">
            <v-btn
              v-if="!assignMessage || assignError"
              variant="outlined"
              @click="confirmPrompt = false"
            >
              Cancel
            </v-btn>
            <v-btn
              color="primary"
              :loading="assigning"
              :disabled="assignMessage != null && !assignError"
              @click="confirmAssign"
            >
              Confirm
            </v-btn>
          </div>
        </template>

        <template v-else>
          <v-icon icon="mdi-check-circle" color="success" size="48" class="mb-4" />
          <h3 class="text-h6 font-weight-bold mb-2">Booking Assigned!</h3>
          <p class="text-medium-emphasis mb-4">You have successfully assigned this booking.</p>
          <v-btn color="success" rounded="pill" @click="router.push({ name: 'home' })">
            Back to List
          </v-btn>
        </template>
      </v-card>
    </v-dialog>
  </div>
</template>
