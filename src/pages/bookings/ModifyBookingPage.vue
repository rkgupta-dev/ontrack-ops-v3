<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import * as bookingDetailApi from '../../services/bookings/bookingDetail.api'
import * as assignApi from '../../services/bookings/assignVehicle.api'
import * as modifyApi from '../../services/bookings/modifyBooking.api'
import { useUiStore } from '../../stores/ui.store'
import { toUserMessage } from '../../utils/errorMessage'
import { toPaymentReceivedOn } from '../../utils/date'
import VehicleStatusBadge from '../../components/vehicles/VehicleStatusBadge.vue'
import EmptyState from '../../components/common/EmptyState.vue'

const route = useRoute()
const uiStore = useUiStore()
const bookingId = route.params.bookingId

const loading = ref(true)
const booking = ref(null)
const tab = ref('extend')
const modelsList = ref([])

const startDate = ref('')
const endDate = ref('')
const model = ref(null)
const vehicleId = ref(null)
const selectedRegn = ref('')

async function load() {
  loading.value = true
  try {
    const data = await bookingDetailApi.fetchBookingDetail(bookingId)
    if (!data) throw new Error('Booking not found')
    booking.value = data
    startDate.value = data.startDate ?? ''
    endDate.value = data.endDate ?? ''
    model.value = data.model
    vehicleId.value = data.vehicle
    selectedRegn.value = data.vehicleData?.registrationNumber ?? ''
    modelsList.value = await assignApi.fetchModelsStock()
  } catch (error) {
    uiStore.notify(toUserMessage(error, "Couldn't load this booking."), { type: 'error' })
  } finally {
    loading.value = false
  }
}
onMounted(load)

const modelOptions = computed(() =>
  modelsList.value.map((d) => ({ title: d.modelData.name, value: d.modelData.id })),
)

// --- Vehicle picker (Exchange tab) ---
const vehiclesList = ref([])
const vehiclePickerDialog = ref(false)
const searchVehicle = ref('')

watch(model, async (modelId) => {
  if (!modelId) return
  try {
    vehiclesList.value = await modifyApi.fetchExchangeableVehicles(modelId)
  } catch {
    vehiclesList.value = []
  }
  // Changing model invalidates the previously-selected vehicle.
  vehicleId.value = null
  selectedRegn.value = ''
})

const filteredVehicles = computed(() => {
  const query = searchVehicle.value.replace(/\s+/g, '').toLowerCase()
  const list = vehiclesList.value.filter((v) =>
    v.registrationNumber.replace(/\s+/g, '').toLowerCase().includes(query),
  )
  return [...list].sort((a, b) => (a.status ?? 0) - (b.status ?? 0))
})

function selectVehicle(v) {
  vehicleId.value = v.id
  selectedRegn.value = v.registrationNumber
  vehiclePickerDialog.value = false
}

const canProceed = computed(() =>
  tab.value === 'extend' ? Boolean(endDate.value) : Boolean(model.value && selectedRegn.value),
)

const deliveryLabel = computed(() => (booking.value?.deliveryType === 1 ? 'Delivery' : "I'll Pick"))

// --- Payment/details dialog ---
const detailsDialog = ref(false)
const transactionType = ref('credit')
const amount = ref('')
const refundedAmount = ref('')
const source = ref('')
const paymentId = ref('')
const reason = ref('')
const comment = ref('')
const paymentReceivedDate = ref('')
const paymentReceivedTime = ref('')
const exchangeVehicleImage = ref(null)
const exchangeImageUrl = ref('')
const exchangeImagePreview = ref('')
const uploadingImage = ref(false)

const SOURCE_OPTIONS = [
  { title: 'Razorpay', value: 'razorpay' },
  { title: 'Cashfree', value: 'cashfree' },
  { title: 'Cash', value: 'cash' },
  { title: 'QR Code', value: 'qrcode' },
  { title: 'POS', value: 'pos' },
  { title: 'Points', value: 'points' },
  { title: 'Token of Apology (TOA)', value: 'toa' },
  { title: 'Others', value: 'others' },
]
const REASON_OPTIONS = [
  'Color Issue',
  'Wiring Issue',
  'Engine Issue',
  'Mileage',
  'Vehicle Wobbling',
  'Self Start Issue',
  'Noise Issue',
  'Engine problems',
  'Transmission issues',
  'Brake problems',
  'Chain and sprocket wear',
  'Battery issues',
  'Lighting problems',
  'Ignition system issues',
  'Tire punctures and wear',
  'Suspension problems',
  'Fuel system issues',
  'Carburetor problems',
  'Frame damage',
  'Loose or damaged body parts',
  'Routine maintenance issues',
  'Corrosion',
  'Poor handling',
  'Lack of stability',
  'Exposure to the elements',
  'Dust and debris',
  'Rider error',
  'Theft',
].map((v) => ({ title: v, value: v }))
REASON_OPTIONS.push({ title: 'Its my wish', value: 'Agent Call' })

watch(source, (value) => {
  if (['cash', 'points', 'toa'].includes(value)) {
    paymentId.value = `${Date.now()}`
  } else {
    paymentId.value = ''
  }
})

function nowIsoParts() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  }
}

function openDetailsDialog() {
  transactionType.value = 'credit'
  amount.value = ''
  refundedAmount.value = ''
  source.value = ''
  paymentId.value = ''
  reason.value = ''
  comment.value = ''
  exchangeVehicleImage.value = null
  exchangeImageUrl.value = ''
  exchangeImagePreview.value = ''
  const now = nowIsoParts()
  paymentReceivedDate.value = now.date
  paymentReceivedTime.value = now.time
  detailsDialog.value = true
}

async function onExchangeImageChange(files) {
  const file = Array.isArray(files) ? files[0] : files
  exchangeVehicleImage.value = file ?? null
  exchangeImageUrl.value = ''
  if (!file) {
    exchangeImagePreview.value = ''
    return
  }
  exchangeImagePreview.value = URL.createObjectURL(file)
  uploadingImage.value = true
  try {
    exchangeImageUrl.value = await modifyApi.uploadExchangeVehicleImage(file)
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not upload the image.'), { type: 'error' })
  } finally {
    uploadingImage.value = false
  }
}

const isDisabledExtend = computed(() => {
  const paidFieldMissing =
    transactionType.value === 'credit' ? !amount.value : !refundedAmount.value
  return paidFieldMissing || !comment.value || !source.value || !paymentId.value
})
const isDisabledExchange = computed(
  () => isDisabledExtend.value || !reason.value || !exchangeVehicleImage.value,
)

const updating = ref(false)
async function submitModify() {
  updating.value = true
  try {
    await modifyApi.submitModifyBooking({
      bookingId,
      type: tab.value,
      paymentId: transactionType.value === 'credit' ? paymentId.value : '',
      paymentStatus: 1,
      collectedAmount: transactionType.value === 'credit' ? amount.value : 0,
      refundId: null,
      refundedAmount: transactionType.value === 'credit' ? 0 : refundedAmount.value,
      paymentSource: source.value,
      comment: `Modify Booking - ${comment.value}`,
      newEndDate: endDate.value,
      vehicle: vehicleId.value,
      model: model.value,
      transactionType: transactionType.value,
      paymentReceivedOn: toPaymentReceivedOn(paymentReceivedDate.value, paymentReceivedTime.value),
      reason: reason.value,
      imageUrl: exchangeImageUrl.value || null,
    })
    uiStore.notify(
      tab.value === 'extend' ? 'Booking extended successfully.' : 'Vehicle exchanged successfully.',
      { type: 'success' },
    )
    detailsDialog.value = false
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Booking update failed. Please try again.'), {
      type: 'error',
    })
  } finally {
    updating.value = false
  }
}
</script>

<template>
  <div v-if="loading" class="d-flex justify-center py-10">
    <v-progress-circular indeterminate color="primary" />
  </div>

  <EmptyState
    v-else-if="!booking"
    icon="mdi-alert-circle-outline"
    title="Couldn't load this booking"
  />

  <div v-else>
    <v-btn-toggle v-model="tab" mandatory rounded="lg" color="primary" class="mb-4">
      <v-btn value="extend" variant="outlined">Extend</v-btn>
      <v-btn value="exchange" variant="outlined">Exchange</v-btn>
    </v-btn-toggle>

    <v-row>
      <v-col cols="6" sm="4"
        ><v-text-field :model-value="bookingId" label="Booking ID" disabled
      /></v-col>
      <v-col cols="6" sm="4">
        <v-text-field
          :model-value="`${booking.customerData?.fName ?? ''} ${booking.customerData?.lName ?? ''}`"
          label="Name"
          disabled
        />
      </v-col>
      <v-col cols="6" sm="4">
        <v-text-field
          :model-value="booking.extraHelmet ? 'Yes' : 'No'"
          label="Extra Helmet"
          disabled
        />
      </v-col>
      <v-col cols="6" sm="4">
        <v-text-field :model-value="deliveryLabel" label="Delivery" disabled />
      </v-col>
      <v-col cols="6" sm="4">
        <v-text-field
          :model-value="booking.locationData?.name ?? 'N/A'"
          label="Location"
          disabled
        />
      </v-col>
    </v-row>

    <v-row v-if="tab === 'extend'">
      <v-col cols="6" sm="4"
        ><v-text-field v-model="startDate" type="date" label="Start Date" disabled
      /></v-col>
      <v-col cols="6" sm="4"
        ><v-text-field v-model="endDate" type="date" label="End Date *"
      /></v-col>
    </v-row>

    <v-row v-if="tab === 'exchange'">
      <v-col cols="6" sm="4">
        <v-select v-model="model" label="Model *" :items="modelOptions" variant="outlined" />
      </v-col>
      <v-col cols="6" sm="4">
        <!-- <div class="text-caption text-medium-emphasis mb-1">Vehicle *</div> -->
        <v-card variant="outlined" class="pa-3" link @click="vehiclePickerDialog = true">
          {{ selectedRegn || 'Please Select Vehicle' }}
        </v-card>
      </v-col>
    </v-row>

    <div class="text-center my-6">
      <v-btn
        variant="flat"
        rounded="lg"
        size="large"
        color="primary"
        :disabled="!canProceed"
        @click="openDetailsDialog"
        >Update</v-btn
      >
    </div>

    <!-- Vehicle picker dialog -->
    <v-dialog v-model="vehiclePickerDialog" max-width="480">
      <v-card title="Select Vehicle">
        <v-card-text>
          <v-text-field
            v-model="searchVehicle"
            label="Find Vehicle"
            density="compact"
            class="mb-2"
          />
          <div style="max-height: 320px; overflow-y: auto">
            <v-card
              v-for="v in filteredVehicles"
              :key="v.id"
              variant="outlined"
              class="mb-2 pa-3 d-flex justify-space-between align-center"
              link
              @click="selectVehicle(v)"
            >
              <span>{{ v.registrationNumber }}</span>
              <VehicleStatusBadge :status="v.status" />
            </v-card>
            <EmptyState
              v-if="filteredVehicles.length === 0"
              icon="mdi-car-off"
              title="Sorry, no vehicle found"
            />
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Modify Details dialog -->
    <v-dialog v-model="detailsDialog" max-width="560" scrollable>
      <v-card title="Modify Details">
        <v-card-text>
          <v-row class="mt-2">
            <v-col cols="6">
              <v-select
                v-model="transactionType"
                label="Type"
                :items="[
                  { title: 'Received from Customer', value: 'credit' },
                  { title: 'Paid to Customer', value: 'debit' },
                ]"
                variant="outlined"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-if="transactionType === 'credit'"
                v-model.number="amount"
                type="number"
                label="Amount *"
                variant="outlined"
              />
              <v-text-field
                v-else
                v-model.number="refundedAmount"
                type="number"
                label="Refunded Amount *"
                variant="outlined"
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="source"
                label="Source *"
                :items="SOURCE_OPTIONS"
                variant="outlined"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="paymentId"
                :label="`${transactionType === 'credit' ? 'Payment' : 'Refund'} Id *`"
                variant="outlined"
              />
            </v-col>
            <v-col v-if="tab === 'exchange'" cols="12">
              <v-select
                v-model="reason"
                label="Reason *"
                :items="REASON_OPTIONS"
                variant="outlined"
              />
            </v-col>
            <v-col v-if="tab === 'exchange'" cols="12">
              <div class="text-caption text-medium-emphasis mb-1">Vehicle Image *</div>
              <div class="d-flex align-center ga-3">
                <v-file-input
                  accept="image/*"
                  density="compact"
                  label="Upload"
                  variant="outlined"
                  rounded="lg"
                  prepend-icon=""
                  hide-details
                  @update:model-value="onExchangeImageChange"
                />
                <v-progress-circular
                  v-if="uploadingImage"
                  indeterminate
                  size="32"
                  color="primary"
                />
                <v-img
                  v-else-if="exchangeImagePreview"
                  :src="exchangeImagePreview"
                  width="80"
                  height="80"
                  rounded="lg"
                  cover
                />
              </div>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="comment"
                label="Comment *"
                rows="2"
                variant="outlined"
                rounded="lg"
              />
            </v-col>
            <v-col cols="8">
              <v-text-field
                v-model="paymentReceivedDate"
                type="date"
                label="Payment Date *"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="4">
              <v-text-field
                v-model="paymentReceivedTime"
                type="time"
                label="Payment Time *"
                variant="outlined"
                hide-details
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            v-if="tab === 'extend'"
            color="primary"
            variant="flat"
            rounded="lg"
            :loading="updating"
            :disabled="isDisabledExtend"
            @click="submitModify"
          >
            Extend Booking
          </v-btn>
          <v-btn
            v-else
            color="primary"
            variant="flat"
            rounded="lg"
            :loading="updating"
            :disabled="isDisabledExchange"
            @click="submitModify"
          >
            Exchange Vehicle
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
