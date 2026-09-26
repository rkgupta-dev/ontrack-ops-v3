<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as bookingDetailApi from '../../services/bookings/bookingDetail.api'
import * as assignApi from '../../services/bookings/assignVehicle.api'
import { useAuthStore } from '../../stores/auth.store'
import { useUiStore } from '../../stores/ui.store'
import { toUserMessage } from '../../utils/errorMessage'
import { todayIsoDate, addDaysIso, formatDateOnly, formatFullDate } from '../../utils/date'
import { formatCurrency } from '../../utils/currency'
import EmptyState from '../../components/common/EmptyState.vue'

const authStore = useAuthStore()

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const bookingId = route.params.bookingId

// Two steps on one route, ported from the old app's bookingDetails.vue →
// assignVehicle2.vue hop: 'review' (booking/customer/payment summary +
// model stock, "Confirm & Assign") then 'itinerary' (the assign form).
// Kept in the URL query so browser Back returns from the form to review.
const step = computed(() => (route.query.step === 'itinerary' ? 'itinerary' : 'review'))

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
  { key: 'odometerPic', label: 'Odometer (optional)' },
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

// The 5 document photos are required on a first assignment; the odometer
// photo is optional (matches the old app's validation).
const REQUIRED_IMAGE_KEYS = [
  'riderPic',
  'dlPic',
  'addressProofFrontPic',
  'addressProofBackPic',
  'idCardPic',
]
const hasRequiredImages = computed(() => REQUIRED_IMAGE_KEYS.every((key) => images.value[key]))
const hasExistingLineItem = computed(() => bookingLineItemData.value?.length > 0)

// --- Pickup handoff checklist → consent (A-175) → OTP ---
const docsVerified = ref(false)
const vcrChecked = ref(false)
const customerInformed = ref(false)
const consentSending = ref(false)
const consentSent = ref(false)
const otp = ref('')

const canSendConsent = computed(
  () =>
    docsVerified.value &&
    vcrChecked.value &&
    customerInformed.value &&
    Boolean(selectedVehicle.value),
)
const otpValid = computed(() => /^\d{6}$/.test(otp.value))

async function sendConsent() {
  if (!canSendConsent.value) return
  consentSending.value = true
  try {
    await assignApi.sendAssignConsent(bookingData.value.id, {
      vehicleId: selectedVehicle.value,
      documentsVerified: docsVerified.value,
      customerInformed: customerInformed.value,
    })
    consentSent.value = true
    uiStore.notify('Customer notified. Waiting for OTP.', { type: 'success' })
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Failed to send consent notification.'), {
      type: 'error',
    })
  } finally {
    consentSending.value = false
  }
}

// Consent (and so the OTP) is issued for one specific vehicle — picking a
// different one afterwards means starting the handoff over.
watch(selectedVehicle, (next, prev) => {
  if (prev && next !== prev && consentSent.value) {
    consentSent.value = false
    otp.value = ''
    uiStore.notify('Vehicle changed — send the OTP again.', { type: 'info' })
  }
})

const validate = computed(() => {
  if (!consentSent.value || !otpValid.value) return false
  const base = kmReading.value && selectedVehicle.value && selectedModel.value
  if (!base) return false
  if (hasRequiredImages.value && permanentAddress.value) return true
  return hasExistingLineItem.value
})

watch(startDate, () => {
  if (!startDate.value) return
  if (bookingData.value?.plan_type === 'WEEKLY') {
    endDate.value = addDaysIso(startDate.value, 7)
  } else {
    endDate.value = addDaysIso(startDate.value, 30)
  }
})

// Re-fetch the vehicle list when the user picks a different model. Skipped
// until loadItinerary() has run (it fetches the list itself, in the
// documented order); `initialized` doubles as "itinerary data loaded".
let initialized = false
watch(selectedModel, async (modelId) => {
  if (!initialized || !modelId) return
  if (!vehiclePreselected.value) selectedVehicle.value = null
  await loadVehicles(modelId)
})

async function loadVehicles(modelId) {
  try {
    vehiclesList.value = await assignApi.fetchAvailableVehicles(modelId)
  } catch (error) {
    vehiclesList.value = []
    uiStore.notify(toUserMessage(error, 'Failed to load available vehicles.'), { type: 'error' })
  }
}

async function refreshLineItem() {
  try {
    bookingLineItemData.value = await bookingDetailApi.fetchBookingLineItem(bookingData.value?.id)
  } catch {
    bookingLineItemData.value = []
  }
}

// Calls per step, matching the live app:
//  review    → getBookings, getModels?model_id (stock count)
//  itinerary → models/stock, bookingLineItems, getVehicles — only fetched
//              once the user continues past "Confirm & Assign".
const modelDetails = ref(null)

async function loadBooking() {
  const booking = await bookingDetailApi.fetchBookingDetail(bookingId)
  if (!booking) throw new Error('Booking not found')
  bookingData.value = booking
  selectedModel.value = booking.model
  startDate.value = booking.startDate || todayIsoDate()
  endDate.value = booking.endDate || todayIsoDate()
  selectedVehicle.value = booking.vehicle
  vehiclePreselected.value = Boolean(booking.vehicle)
}

async function loadReview() {
  const modelId = bookingData.value?.model
  modelDetails.value = modelId ? await assignApi.fetchModelById(modelId) : null
}

async function loadItinerary() {
  // Documented order: models/stock → bookingLineItems → getVehicles.
  modelsList.value = await assignApi.fetchModelsStock()
  await refreshLineItem()
  if (selectedModel.value) await loadVehicles(selectedModel.value)
  initialized = true
}

async function load() {
  loading.value = true
  loadError.value = null
  try {
    if (!bookingData.value) await loadBooking()
    if (step.value === 'review') await loadReview()
    else if (!initialized) await loadItinerary()
  } catch (error) {
    loadError.value = toUserMessage(error, 'Failed to load booking details.')
  } finally {
    loading.value = false
  }
}

onMounted(load)

// Moving between steps (Confirm & Assign, or browser Back/Forward) loads
// whatever that step still needs.
watch(step, (next) => {
  if (next === 'itinerary' && !initialized) load()
  else if (next === 'review' && !modelDetails.value) load()
})

// --- Review step ---
// Stock for the booking's model, from A-116 (loadReview()).
const stockAvailable = computed(() => Number(modelDetails.value?.available ?? 0))

const customerName = computed(() => {
  const c = bookingData.value?.customerData
  return [c?.fName, c?.lName].filter(Boolean).join(' ') || '—'
})

const paymentRows = computed(() => {
  const b = bookingData.value ?? {}
  return [
    {
      label: 'Helmet Charge',
      value: `${Number(b.extraHelmet) === 0 ? 'no' : 'yes'} (${formatCurrency(b.helmetCharge, '₹0')})`,
    },
    { label: 'Rental Charge', value: formatCurrency(b.rentalCharge) },
    { label: 'Discount', value: b.discount || 0 },
    { label: 'Delivery Charge', value: b.deliveryCharge || 0 },
    { label: 'Penalty Charge', value: b.penaltyCharge || 0 },
    { label: 'Coupon Used', value: b.coupon || '-' },
    { label: 'Adjusted Discount', value: `- ${b.adjustedDiscount || ''}`, success: true },
    { label: 'Order ID', value: b.razorpay_order_id || '-' },
  ]
})

const documentsDialog = ref(false)
const previewDocument = ref(null)
const documents = computed(() => {
  const data = bookingData.value?.customerData
  return [
    { label: 'DL Front', src: data?.DLfront },
    { label: 'DL Back', src: data?.DLback },
    { label: 'ID Proof', src: data?.idProof },
    { label: 'ID Proof Back', src: data?.idProofBack },
  ]
})

// "Confirm & Assign" only continues to the form when the customer's DL,
// DL number and ID are all verified — same gate and same call (A-052) as
// the old app.
const checkingDocs = ref(false)
const docsNotVerifiedDialog = ref(false)

async function confirmAndAssign() {
  checkingDocs.value = true
  try {
    const customer = await assignApi.fetchCustomerVerification(bookingData.value.customer)
    const verified =
      Number(customer?.DLVerified) === 1 &&
      Number(customer?.IDVerified) === 1 &&
      Number(customer?.DLnumberVerified) === 1
    if (verified) {
      router.push({ query: { ...route.query, step: 'itinerary' } })
    } else {
      uiStore.notify('Documents not verified.', { type: 'error' })
      docsNotVerifiedDialog.value = true
    }
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not check customer documents.'), { type: 'error' })
  } finally {
    checkingDocs.value = false
  }
}

// --- Confirm dialog ---
const confirmPrompt = ref(false)
const assigning = ref(false)
const assignMessage = ref(null)
const assignError = ref(null)
const showSuccessPrompt = ref(false)
// Set once the pre-booking data (images/KM/address) is saved, so "Try
// again" after a failed assignment doesn't upload it a second time.
const preDataSubmitted = ref(false)

// One explicit dialog state instead of inferring it from message/error
// combinations: 'confirm' → 'working' → 'success' | 'error'.
const dialogState = computed(() => {
  if (showSuccessPrompt.value) return 'success'
  if (assignError.value) return 'error'
  if (assigning.value) return 'working'
  return 'confirm'
})

const assignSummary = computed(() => [
  {
    label: 'Vehicle',
    value: vehicleOptions.value.find((o) => o.value === selectedVehicle.value)?.title ?? '—',
  },
  {
    label: 'Model',
    value: modelOptions.value.find((o) => o.value === selectedModel.value)?.title ?? '—',
  },
  { label: 'Start', value: formatDateOnly(startDate.value) },
  { label: 'End', value: formatDateOnly(endDate.value) },
  { label: 'KM reading', value: kmReading.value || '—' },
])

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
    if (!hasExistingLineItem.value && !preDataSubmitted.value) {
      await assignApi.submitPreBookingData(bookingData.value.id, images.value, {
        kmReading: kmReading.value,
        comment: comment.value,
        permanentAddress: permanentAddress.value,
      })
      preDataSubmitted.value = true
      assignMessage.value = 'Pre Data has been set.'
    }
    await assignApi.assignVehicleToBooking(bookingData.value.id, {
      vehicleId: selectedVehicle.value,
      startDate: startDate.value,
      endDate: endDate.value,
      otp: otp.value,
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
    <div class="text-medium-emphasis">
      {{ step === 'review' ? 'fetching booking details' : 'creating booking itinerary' }}
    </div>
  </div>

  <EmptyState
    v-else-if="loadError"
    icon="mdi-alert-circle-outline"
    title="Something went wrong"
    :message="loadError"
  >
    <v-btn class="mt-4" color="primary" @click="load">Retry</v-btn>
  </EmptyState>

  <!-- Step 1: review -->
  <div v-else-if="step === 'review'">
    <div class="text-body-2 text-medium-emphasis">Booking Details</div>
    <div class="text-body-2 text-medium-emphasis">{{ bookingId }}</div>
    <div class="d-flex align-center flex-wrap ga-2">
      <h2 class="text-h5 font-weight-bold">{{ bookingData.modelData?.name ?? '—' }}</h2>
      <span v-if="stockAvailable > 0" class="text-body-1 text-success">
        ({{ stockAvailable }} Available)
      </span>
      <span v-else class="text-body-1 text-error">(No Stock Left ({{ stockAvailable }}))</span>
    </div>
    <div v-if="bookingData.vehicleData" class="text-h6 font-weight-bold">
      {{ bookingData.vehicleData.registrationNumber }}
    </div>
    <div class="text-body-2 mt-1">{{ formatFullDate(bookingData.createdAt) }}</div>

    <v-divider class="my-4" />

    <div class="text-body-2 text-medium-emphasis">Customer Details</div>
    <div class="d-flex align-center ga-1">
      <h3 class="text-h6 font-weight-bold">{{ customerName }}</h3>
      <v-btn
        v-if="bookingData.customer"
        icon="mdi-open-in-new"
        variant="text"
        size="small"
        color="primary"
        aria-label="Open customer"
        :to="{ name: 'customer-detail', params: { customerId: bookingData.customer } }"
      />
    </div>
    <div class="d-flex align-center flex-wrap ga-2">
      <a
        v-if="bookingData.customerData?.mobile"
        :href="`tel:${bookingData.customerData.mobile}`"
        class="text-body-1 text-primary text-decoration-none"
      >
        {{ bookingData.customerData.mobile }},
      </a>
      <span class="text-body-2">{{ bookingData.customerData?.email }}</span>
    </div>
    <div class="d-flex ga-2 mt-3">
      <v-btn
        variant="outlined"
        color="primary"
        rounded="lg"
        prepend-icon="mdi-phone-outline"
        :href="`tel:${bookingData.customerData?.mobile}`"
        :disabled="!bookingData.customerData?.mobile"
      >
        Call
      </v-btn>
      <v-btn
        variant="outlined"
        color="primary"
        rounded="lg"
        prepend-icon="mdi-file-document-outline"
        @click="documentsDialog = true"
      >
        Documents
      </v-btn>
    </div>

    <v-divider class="my-4" />

    <div class="text-body-2 text-medium-emphasis mb-2">Payment Details</div>
    <div
      v-for="row in paymentRows"
      :key="row.label"
      class="d-flex justify-space-between text-body-2 py-1"
    >
      <span>{{ row.label }}</span>
      <span :class="{ 'text-success': row.success }">{{ row.value }}</span>
    </div>

    <v-row justify="center" class="mt-6">
      <v-col cols="12" md="6">
        <v-btn
          size="large"
          block
          rounded="lg"
          variant="flat"
          color="warning"
          :loading="checkingDocs"
          @click="confirmAndAssign"
        >
          Confirm &amp; Assign
        </v-btn>
      </v-col>
    </v-row>

    <!-- Documents -->
    <v-dialog v-model="documentsDialog" max-width="560" scrollable>
      <v-card title="Documents">
        <v-card-text>
          <div class="mb-3">
            <div class="text-body-2 text-medium-emphasis">DL Number</div>
            <strong>{{ bookingData.customerData?.DLnumber || 'Not Available' }}</strong>
          </div>
          <v-row>
            <v-col v-for="doc in documents" :key="doc.label" cols="6">
              <div class="text-body-2 font-weight-bold mb-1">{{ doc.label }}</div>
              <v-img
                v-if="doc.src"
                :src="doc.src"
                :alt="doc.label"
                height="160"
                rounded="lg"
                cover
                class="cursor-pointer"
                @click="previewDocument = doc"
              />
              <div v-else class="text-caption text-medium-emphasis">Not available</div>
            </v-col>
          </v-row>
          <v-alert :icon="false" type="warning" variant="tonal" density="compact" class="mt-3">
            Some documents may not be visible due to different formats. Click any image to view in
            full size.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="documentsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      :model-value="Boolean(previewDocument)"
      max-width="900"
      @update:model-value="(open) => !open && (previewDocument = null)"
    >
      <v-card v-if="previewDocument" :title="previewDocument.label">
        <template #append>
          <v-btn icon="mdi-close" variant="text" @click="previewDocument = null" />
        </template>
        <v-card-text>
          <v-img
            :src="previewDocument.src"
            :alt="previewDocument.label"
            max-height="75vh"
            contain
          />
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Documents not verified -->
    <v-dialog v-model="docsNotVerifiedDialog" max-width="460">
      <v-card title="Documents not verified">
        <v-card-text>
          <v-alert type="warning" variant="tonal" density="compact" rounded="lg" class="mb-3">
            Documents verification is pending for this customer!
          </v-alert>
          <div class="text-body-2">
            The customer's DL, DL number and ID must all be verified before a vehicle can be
            assigned.
          </div>
          <!-- Same split as the old bookingDetails.vue: Outreach steps for
               Ontrack agents, "ask your manager" for lessor agents. -->
          <div class="text-body-2 text-medium-emphasis mt-3 mb-1">Process for DL Verification</div>
          <ol v-if="authStore.canViewAdmin" class="text-body-2 pl-5">
            <li>
              Sign in to
              <a href="https://ontrack-outreach.web.app/" target="_blank" rel="noopener"
                >outreach app</a
              >.
            </li>
            <li>Navigate to Customer Tab &gt; Search for phone number</li>
            <li>Navigate to KYC Info tab and click on 'Digitally Verify'</li>
            <li>Enter DL Number and Date of birth to verify</li>
          </ol>
          <div v-else class="text-body-2">
            If you don't have access to outreach app, please ask your manager or contact support
            team.
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="docsNotVerifiedDialog = false">
            I'll do it later
          </v-btn>

          <v-btn
            color="success"
            variant="flat"
            rounded="lg"
            :href="`https://ontrack-outreach.web.app/customer/${bookingData.customer}`"
            target="_blank"
            rel="noopener"
          >
            Verify Now
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>

  <!-- Step 2: itinerary -->
  <div v-else>
    <h2 class="text-h6 font-weight-bold mb-4">Booking Itinerary</h2>

    <v-row>
      <v-col cols="12" sm="6">
        <v-select
          v-model="selectedModel"
          placeholder="Model"
          variant="outlined"
          rounded="lg"
          :items="modelOptions"
          :disabled="vehiclePreselected"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select
          v-model="selectedVehicle"
          placeholder="Vehicle"
          variant="outlined"
          rounded="lg"
          :items="vehicleOptions"
          :disabled="vehiclePreselected"
        />
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field v-model="kmReading" label="KM Reading" rounded="lg" />
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field v-model="startDate" type="date" label="Start Date" rounded="lg" />
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field v-model="endDate" type="date" label="End Date" rounded="lg" />
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
          variant="outlined"
          rounded="lg"
          :label="previews[field.key] ? 'Replace' : 'Upload'"
          @update:model-value="(f) => onImageChange(field.key, f)"
        />
      </v-col>
    </v-row>

    <v-textarea
      v-model="permanentAddress"
      label="Permanent Address"
      rows="2"
      class="mt-2"
      variant="outlined"
      rounded="lg"
    />
    <v-textarea v-model="comment" label="Comment" rows="2" variant="outlined" rounded="lg" />

    <v-divider class="my-4" />

    <div class="text-subtitle-1 font-weight-medium mb-2">Pickup Handoff Checklist</div>
    <template v-if="!consentSent">
      <v-checkbox
        v-model="docsVerified"
        label="License, Aadhaar and other relevant documents verified"
        density="compact"
        hide-details
      />
      <v-checkbox
        v-model="vcrChecked"
        label="Vehicle Quality Check (VCR) filed and checked"
        density="compact"
        hide-details
      />
      <v-checkbox
        v-model="customerInformed"
        label="Customer informed of end date and servicing details"
        density="compact"
        hide-details
      />
      <v-btn
        size="large"
        block
        rounded="lg"
        variant="flat"
        color="primary"
        class="mt-3"
        :disabled="!canSendConsent"
        :loading="consentSending"
        @click="sendConsent"
      >
        Notify Customer &amp; Send OTP
      </v-btn>
    </template>
    <template v-else>
      <v-alert
        :icon="false"
        type="success"
        variant="tonal"
        density="compact"
        rounded="lg"
        class="mb-3"
      >
        Customer notified. Ask them to read out the OTP from the app to complete the handoff.
      </v-alert>
      <v-otp-input v-model="otp" length="6" type="number" class="px-0" />
      <div class="text-center">
        <v-btn
          variant="text"
          size="small"
          color="primary"
          :loading="consentSending"
          @click="sendConsent"
        >
          Resend OTP
        </v-btn>
      </div>
    </template>

    <v-btn
      size="large"
      block
      rounded="lg"
      variant="flat"
      color="primary"
      :disabled="!validate"
      class="mt-4"
      @click="openConfirm"
    >
      Assign Vehicle
    </v-btn>

    <v-dialog v-model="confirmPrompt" max-width="420" persistent>
      <v-card class="pa-6">
        <!-- Confirm -->
        <template v-if="dialogState === 'confirm'">
          <div class="text-center mb-4">
            <v-avatar color="primary" variant="tonal" size="56" class="mb-3">
              <v-icon icon="mdi-motorbike" size="28" />
            </v-avatar>
            <h3 class="text-h6 font-weight-bold">Assign this vehicle?</h3>
            <div class="text-body-2 text-medium-emphasis">
              Booking <strong>{{ bookingId }}</strong>
            </div>
          </div>
          <v-sheet rounded="lg" color="grey-lighten-4" class="pa-3 mb-5">
            <div
              v-for="row in assignSummary"
              :key="row.label"
              class="d-flex justify-space-between text-body-2 py-1"
            >
              <span class="text-medium-emphasis">{{ row.label }}</span>
              <span class="font-weight-medium">{{ row.value }}</span>
            </div>
          </v-sheet>
          <div class="d-flex ga-2">
            <v-btn class="flex-1-1" variant="outlined" rounded="lg" @click="confirmPrompt = false">
              Cancel
            </v-btn>
            <v-btn
              class="flex-1-1"
              color="primary"
              variant="flat"
              rounded="lg"
              @click="confirmAssign"
            >
              Assign
            </v-btn>
          </div>
        </template>

        <!-- Working -->
        <div v-else-if="dialogState === 'working'" class="text-center py-4">
          <v-progress-circular indeterminate color="primary" size="56" width="5" class="mb-4" />
          <h3 class="text-h6 font-weight-bold mb-1">Assigning vehicle…</h3>
          <div class="text-body-2 text-medium-emphasis">{{ assignMessage }}</div>
          <div class="text-caption text-medium-emphasis mt-2">Please don't close this page.</div>
        </div>

        <!-- Error -->
        <template v-else-if="dialogState === 'error'">
          <div class="text-center mb-5">
            <v-avatar color="error" variant="tonal" size="56" class="mb-3">
              <v-icon icon="mdi-alert-circle-outline" size="28" />
            </v-avatar>
            <h3 class="text-h6 font-weight-bold mb-1">Couldn't assign the vehicle</h3>
            <div class="text-body-2 text-medium-emphasis">{{ assignError }}</div>
          </div>
          <div class="d-flex ga-2">
            <v-btn class="flex-1-1" variant="outlined" rounded="lg" @click="confirmPrompt = false">
              Close
            </v-btn>
            <v-btn
              class="flex-1-1"
              color="primary"
              variant="flat"
              rounded="lg"
              @click="confirmAssign"
            >
              Try again
            </v-btn>
          </div>
        </template>

        <!-- Success -->
        <template v-else>
          <div class="text-center mb-5">
            <v-avatar color="success" variant="tonal" size="56" class="mb-3">
              <v-icon icon="mdi-check-circle-outline" size="28" />
            </v-avatar>
            <h3 class="text-h6 font-weight-bold mb-1">Vehicle assigned</h3>
            <div class="text-body-2 text-medium-emphasis">
              {{ assignSummary[0].value }} is now assigned to booking {{ bookingId }}.
            </div>
          </div>
          <div class="d-flex ga-2">
            <v-btn
              class="flex-1-1"
              variant="outlined"
              rounded="lg"
              @click="router.push({ name: 'home' })"
            >
              Back to List
            </v-btn>
            <v-btn
              class="flex-1-1"
              color="primary"
              variant="flat"
              rounded="lg"
              @click="router.push({ name: 'booking-detail', params: { bookingId } })"
            >
              View Booking
            </v-btn>
          </div>
        </template>
      </v-card>
    </v-dialog>
  </div>
</template>
