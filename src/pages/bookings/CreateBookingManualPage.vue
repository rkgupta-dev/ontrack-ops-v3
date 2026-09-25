<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as createBookingApi from '../../services/bookings/createBooking.api'
import * as assignApi from '../../services/bookings/assignVehicle.api'
import { fetchLocations } from '../../services/home/home.api'
import { useUiStore } from '../../stores/ui.store'
import { toUserMessage } from '../../utils/errorMessage'
import { formatCurrency } from '../../utils/currency'
import { formatFullDate, toPaymentReceivedOn } from '../../utils/date'
import BookingStatusBadge from '../../components/bookings/BookingStatusBadge.vue'
import EmptyState from '../../components/common/EmptyState.vue'

const router = useRouter()
const uiStore = useUiStore()

const phoneNumber = ref('')
const message = ref('')
const searching = ref(false)
const customerMatches = ref([])
const customerSelectionDialog = ref(false)
const selectedCustomer = ref(null)

const loadingBookings = ref(false)
const bookingHistory = ref([])

const isEligibleToBook = computed(() =>
  bookingHistory.value.some((b) => b.status === 0 || b.status === 1),
)

async function fetchCustomer() {
  if (phoneNumber.value.length <= 9) {
    message.value = 'invalid phone number'
    setTimeout(() => (message.value = ''), 2000)
    return
  }
  searching.value = true
  try {
    const data = await createBookingApi.searchCustomerByPhone(phoneNumber.value)
    customerMatches.value = data
    if (data.length === 1) {
      selectCustomer(data[0])
    } else {
      customerSelectionDialog.value = true
    }
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not search for that number.'), { type: 'error' })
  } finally {
    searching.value = false
  }
}

function selectCustomer(customer) {
  selectedCustomer.value = customer
  customerSelectionDialog.value = false
  fetchBookingHistory()
}

async function fetchBookingHistory() {
  loadingBookings.value = true
  try {
    bookingHistory.value = await createBookingApi.fetchCustomerBookingHistory(
      selectedCustomer.value.id,
    )
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not load booking history.'), { type: 'error' })
  } finally {
    loadingBookings.value = false
  }
}

function reset() {
  selectedCustomer.value = null
  phoneNumber.value = ''
  customerMatches.value = []
  bookingHistory.value = []
}

function viewBooking(bookingId) {
  router.push({ name: 'booking-detail', params: { bookingId } })
}

function goToDynamicFlow() {
  if (!isEligibleToBook.value) {
    router.push({
      name: 'booking-create-dynamic',
      params: { customerId: selectedCustomer.value.id },
    })
  }
}

// --- Manual create-booking dialog ---
const dialog = ref(false)
const modelsList = ref([])
const selectedModel = ref(null)
const deliveryOption = ref(0) // 0 = pickup, 1 = delivery
const pickUpLocation = ref(1)
const deliveryAddress = ref('')
const locations = ref([])
const deliveryCharges = ref({ deliveryCharge: 0 })
const comment = ref('')
const adjustment = ref(0)
const paymentGateway = ref('')
const paymentId = ref('')
const orderId = ref('')
const paymentReceivedDate = ref('')
const paymentReceivedTime = ref('')
const creating = ref(false)
const error = ref('')

// The old app's addon picker is unreachable dead code in practice (the
// modal that fetches merchandise/get is opened by a method the UI never
// calls) — a fixed helmet-less placeholder is what real users actually
// see, so that's what's ported here rather than a "fixed" addon picker.
const DEFAULT_ADDON = { name: 'Skip, I will risk it.', price: 0 }

const GATEWAY_OPTIONS = [
  { title: 'Razorpay', value: 'razorpay' },
  { title: 'Cashfree', value: 'cashfree' },
  { title: 'Cash', value: 'cash' },
  { title: 'QR Code', value: 'qrcode' },
  { title: 'POS', value: 'pos' },
  { title: 'Points', value: 'points' },
  { title: 'Token of Apology (TOA)', value: 'toa' },
  { title: 'Others', value: 'others' },
]

const rentalCharge = computed(() => (selectedModel.value ? Number(selectedModel.value.price) : 0))
const deliveryCharge = computed(() =>
  deliveryOption.value === 0 ? 0 : (deliveryCharges.value?.deliveryCharge ?? 0),
)
const helmetCharge = computed(() => DEFAULT_ADDON.price)
const totalPrice = computed(
  () => helmetCharge.value + deliveryCharge.value + rentalCharge.value + Number(adjustment.value),
)

function nowIsoParts() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  }
}

async function openManualDialog() {
  selectedModel.value = null
  deliveryOption.value = 0
  pickUpLocation.value = 1
  deliveryAddress.value = ''
  comment.value = ''
  adjustment.value = 0
  paymentGateway.value = ''
  paymentId.value = ''
  orderId.value = ''
  error.value = ''
  const now = nowIsoParts()
  paymentReceivedDate.value = now.date
  paymentReceivedTime.value = now.time
  dialog.value = true

  try {
    const [models, charges, locs] = await Promise.all([
      assignApi.fetchModelsStock(),
      createBookingApi.fetchDeliveryCharges(),
      locations.value.length ? Promise.resolve(locations.value) : fetchLocationsOnce(),
    ])
    modelsList.value = models.filter((m) => m.modelData.show === 1 && m.available > 0)
    deliveryCharges.value = charges
    locations.value = locs
  } catch (err) {
    uiStore.notify(toUserMessage(err, 'Could not load booking options.'), { type: 'error' })
  }
}

async function fetchLocationsOnce() {
  return fetchLocations()
}

const formValid = computed(() => {
  if (
    !selectedModel.value ||
    !paymentGateway.value ||
    !paymentReceivedDate.value ||
    !paymentReceivedTime.value
  ) {
    return false
  }
  return paymentGateway.value === 'razorpay'
    ? Boolean(paymentId.value && orderId.value)
    : Boolean(paymentId.value)
})

async function createBooking() {
  if (creating.value) return
  creating.value = true
  error.value = ''
  try {
    await createBookingApi.submitManualBooking({
      customerMobile: selectedCustomer.value.mobile,
      model: selectedModel.value.id,
      deliveryType: deliveryOption.value,
      pickUpLocation: deliveryOption.value === 0 ? pickUpLocation.value : null,
      deliveryAddress: deliveryOption.value === 1 ? deliveryAddress.value : null,
      extraHelmet: helmetCharge.value > 0 ? 1 : 0,
      helmetCharge: helmetCharge.value,
      rentalCharge: rentalCharge.value,
      discount: Math.abs(adjustment.value),
      deliveryCharge: deliveryCharge.value,
      razorpay_payment_id: paymentGateway.value === 'razorpay' ? paymentId.value : null,
      razorpay_order_id: paymentGateway.value === 'razorpay' ? orderId.value : null,
      paymentId: paymentGateway.value !== 'razorpay' ? paymentId.value : null,
      g_pay_id: null,
      other_payment_id: null,
      comment: `Create Booking - ${comment.value}`,
      payment_gateway: paymentGateway.value,
      source: 'operations',
      paymentReceivedOn: toPaymentReceivedOn(paymentReceivedDate.value, paymentReceivedTime.value),
    })
    uiStore.notify('Booking Created', { type: 'success' })
    dialog.value = false
    await fetchBookingHistory()
  } catch {
    error.value = 'Something went wrong'
    uiStore.notify('Something went wrong', { type: 'error' })
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div>
    <template v-if="!selectedCustomer">
      <div v-if="message" class="text-error mb-2">{{ message }}</div>
      <h2 class="text-h6 font-weight-bold mb-3">Enter Customer Phone Number</h2>
      <v-text-field
        v-model="phoneNumber"
        type="tel"
        label="Enter 10 digit number"
        style="max-width: 320px"
        variant="outlined"
        rounded="lg"
      />
      <v-btn
        color="primary"
        variant="flat"
        rounded="lg"
        :disabled="phoneNumber.length < 10"
        :loading="searching"
        @click="fetchCustomer"
      >
        Fetch Customer
      </v-btn>
    </template>

    <template v-else>
      <div v-if="loadingBookings" class="py-6 text-center text-medium-emphasis">hold on...</div>
      <template v-else>
        <v-card variant="outlined" class="pa-4 mb-4">
          <v-row align="center">
            <v-col cols="12" md="9">
              <h4 class="text-h6">{{ selectedCustomer.fName }} {{ selectedCustomer.lName }}</h4>
              <div class="text-medium-emphasis">{{ selectedCustomer.mobile }}</div>
              <div class="text-medium-emphasis">{{ selectedCustomer.email }}</div>
              <div class="text-medium-emphasis">{{ selectedCustomer.address }}</div>
              <v-btn
                variant="tonal"
                size="small"
                color="secondary"
                rounded="lg"
                class="mt-1"
                @click="reset"
                >Change Customer</v-btn
              >
            </v-col>
            <v-col cols="12" md="3" class="text-md-right">
              <v-menu>
                <template #activator="{ props: menuProps }">
                  <v-btn
                    rounded="lg"
                    color="primary"
                    :disabled="isEligibleToBook"
                    v-bind="menuProps"
                  >
                    {{ isEligibleToBook ? 'Already Booked' : 'Create Booking' }}
                  </v-btn>
                </template>
                <v-list v-if="!isEligibleToBook">
                  <v-list-item title="Old (Manual)" @click="openManualDialog" />
                  <v-list-item title="New (Dynamic)" @click="goToDynamicFlow" />
                </v-list>
              </v-menu>
            </v-col>
          </v-row>
        </v-card>

        <v-card v-for="b in bookingHistory" :key="b.bookingId" variant="outlined" class="mb-3 pa-4">
          <BookingStatusBadge :status="b.status" class="mb-2" />
          <div class="d-flex justify-space-between align-center">
            <div>
              <div v-if="b.vehicleData" class="text-subtitle-1 font-weight-bold">
                {{ b.vehicleData.registrationNumber }}
              </div>
              <div class="text-caption text-medium-emphasis">{{ b.bookingId }}</div>
              <div>{{ b.customerData?.fName }} {{ b.customerData?.lName }}</div>
              <div class="text-caption text-medium-emphasis">{{ formatFullDate(b.createdAt) }}</div>
            </div>
            <v-btn color="primary" variant="tonal" rounded="lg" @click="viewBooking(b.bookingId)"
              >View/Modify</v-btn
            >
          </div>
        </v-card>
        <EmptyState
          v-if="bookingHistory.length === 0"
          icon="mdi-calendar-blank-outline"
          title="No bookings yet"
        />
      </template>
    </template>

    <!-- Customer selection dialog -->
    <v-dialog v-model="customerSelectionDialog" max-width="480">
      <v-card title="Select Customer">
        <v-card-text>
          <div class="text-warning mb-2">search results for {{ phoneNumber }}</div>
          <v-radio-group>
            <v-radio
              v-for="c in customerMatches"
              :key="c.id"
              :label="`${c.fName} ${c.lName} - ${c.mobile}`"
              @click="selectCustomer(c)"
            />
          </v-radio-group>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Manual create-booking dialog -->
    <v-dialog v-model="dialog" max-width="560" scrollable persistent>
      <v-card title="Create Booking">
        <v-card-text>
          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{
            error
          }}</v-alert>

          <v-row>
            <v-col cols="6">
              <v-select v-model="paymentGateway" label="Mode *" :items="GATEWAY_OPTIONS" />
            </v-col>
            <template v-if="paymentGateway === 'razorpay'">
              <v-col cols="6"><v-text-field v-model="paymentId" label="Payment ID *" /></v-col>
              <v-col cols="6"><v-text-field v-model="orderId" label="Order ID *" /></v-col>
            </template>
            <v-col v-else-if="paymentGateway" cols="6">
              <v-text-field v-model="paymentId" label="Payment ID *" />
            </v-col>
            <v-col cols="8"
              ><v-text-field v-model="paymentReceivedDate" type="date" label="Payment Date *"
            /></v-col>
            <v-col cols="4"
              ><v-text-field v-model="paymentReceivedTime" type="time" label="Payment Time *"
            /></v-col>

            <v-col cols="12">
              <v-select
                v-model="selectedModel"
                label="Model *"
                :items="modelsList.map((m) => ({ title: m.modelData.name, value: m.modelData }))"
              />
            </v-col>

            <v-col cols="12">
              <v-text-field :model-value="DEFAULT_ADDON.name" label="Addons" disabled />
            </v-col>

            <v-col cols="12">
              <v-switch
                v-model="deliveryOption"
                :true-value="1"
                :false-value="0"
                label="Doorstep Delivery"
                color="primary"
              />
            </v-col>

            <v-col v-if="deliveryOption === 0" cols="12">
              <v-select
                v-model="pickUpLocation"
                label="Self Pickup Location *"
                :items="locations.map((l) => ({ title: l.name, value: l.id }))"
              />
            </v-col>
            <v-col v-else cols="12">
              <v-textarea v-model="deliveryAddress" label="Delivery Address *" rows="2" />
            </v-col>
          </v-row>

          <div class="text-caption text-medium-emphasis mt-2">
            Add a comment: if it's a cash transaction, please specify who collected the cash.
          </div>
          <v-textarea v-model="comment" placeholder="Add comment here.." rows="2" />

          <div class="text-caption text-medium-emphasis mt-2">Adjustments & Discounts</div>
          <v-slider v-model="adjustment" :min="-200" :max="200" step="50" />
          <div class="font-weight-medium mb-2">Adjusted: {{ formatCurrency(adjustment) }}</div>

          <v-card variant="outlined" class="pa-4">
            <div class="d-flex justify-space-between py-1">
              <span>Rental Charge</span><span>{{ formatCurrency(rentalCharge) }}</span>
            </div>
            <div class="d-flex justify-space-between py-1">
              <span>Helmet Charge</span><span>{{ formatCurrency(helmetCharge) }}</span>
            </div>
            <div class="d-flex justify-space-between py-1">
              <span>Delivery Charge</span><span>{{ formatCurrency(deliveryCharge) }}</span>
            </div>
            <div class="d-flex justify-space-between py-1">
              <span>Adjustment</span><span>{{ formatCurrency(adjustment) }}</span>
            </div>
            <v-divider class="my-2" />
            <div class="d-flex justify-space-between py-1 font-weight-bold">
              <span>Total</span><span>{{ formatCurrency(totalPrice) }}</span>
            </div>
          </v-card>

          <v-alert v-if="!formValid" type="error" variant="tonal" density="compact" class="mt-3">
            Please fill all the required fields.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" @click="dialog = false">Cancel</v-btn>
          <v-spacer />
          <v-btn
            block
            color="primary"
            :loading="creating"
            :disabled="!formValid"
            @click="createBooking"
          >
            BOOK <template v-if="selectedModel">({{ formatCurrency(totalPrice) }})</template>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
