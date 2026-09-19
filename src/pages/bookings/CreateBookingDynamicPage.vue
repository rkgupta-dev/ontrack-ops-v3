<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as customerDetailApi from '../../services/customers/customerDetail.api'
import * as createBookingApi from '../../services/bookings/createBooking.api'
import * as assignApi from '../../services/bookings/assignVehicle.api'
import * as bookingDetailApi from '../../services/bookings/bookingDetail.api'
import { useUiStore } from '../../stores/ui.store'
import { toUserMessage } from '../../utils/errorMessage'
import { formatCurrency } from '../../utils/currency'
import { addDaysIso, todayIsoDate } from '../../utils/date'
import AddAddressForm from '../../components/customers/AddAddressForm.vue'
import EmptyState from '../../components/common/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const customerId = route.params.customerId

const loading = ref(false)
const loadingCustomer = ref(true)
const customerData = ref(null)
const customerAddresses = ref([])
const penaltyCharge = ref(0)

async function fetchCustomerDetails() {
  loadingCustomer.value = true
  try {
    const data = await customerDetailApi.fetchCustomer(customerId)
    customerData.value = data
    customerAddresses.value = data.addressBooks ?? []
    penaltyCharge.value = data.penaltyCharge ?? 0
  } catch (error) {
    uiStore.notify(toUserMessage(error, "Couldn't load this customer."), { type: 'error' })
  } finally {
    loadingCustomer.value = false
  }
}
onMounted(fetchCustomerDetails)

// --- Model picker ---
const modelList = ref([])
const modelDialog = ref(false)
const modelSearch = ref('')
const selectedModel = ref(null)
const selectedModelName = ref('')
const selectedModelData = ref(null)
const rentalCharge = ref(0)

const filteredModels = computed(() =>
  modelList.value.filter((m) =>
    m.modelData.name.toLowerCase().includes(modelSearch.value.toLowerCase()),
  ),
)

async function openModelDialog() {
  if (modelList.value.length === 0) {
    loading.value = true
    try {
      const models = await assignApi.fetchModelsStock()
      modelList.value = [...models].sort((a, b) => (b.available ?? 0) - (a.available ?? 0))
    } catch (error) {
      uiStore.notify(toUserMessage(error, 'Could not load models.'), { type: 'error' })
    } finally {
      loading.value = false
    }
  }
  modelDialog.value = true
}

function selectModel(model) {
  selectedModel.value = model.id
  selectedModelName.value = model.name
  selectedModelData.value = model
  rentalCharge.value = planType.value === 'WEEKLY' ? model.weeklyRentalAmount : model.price
  modelDialog.value = false
  fetchModelLocations(model.id)
}

// --- Addon picker ---
const addonsList = ref([])
const addonDialog = ref(false)
const addonSearch = ref('')
const addonsSelected = ref(null)

const filteredAddons = computed(() =>
  addonsList.value.filter((a) => a.name.toLowerCase().includes(addonSearch.value.toLowerCase())),
)

async function openAddonDialog() {
  if (addonsList.value.length === 0) {
    loading.value = true
    try {
      addonsList.value = await createBookingApi.fetchAddons()
    } catch {
      uiStore.notify('Something went wrong', { type: 'error' })
    } finally {
      loading.value = false
    }
  }
  addonDialog.value = true
}
function selectAddon(addon) {
  addonsSelected.value = addon
  addonDialog.value = false
}

// --- Plan picker (EV models only) ---
const planType = ref('MONTHLY')
const planDialog = ref(false)
const nextBillingDate = computed(() => {
  const d = addDaysIso(todayIsoDate(), 7)
  return new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
})

function choosePlan(type) {
  planType.value = type
  if (selectedModelData.value) {
    rentalCharge.value =
      type === 'WEEKLY' ? selectedModelData.value.weeklyRentalAmount : selectedModelData.value.price
  }
}

// --- Delivery / pickup ---
const deliveryType = ref(0) // 0 pickup, 1 drop
const deliveryAddress = ref('')
const pickupLocationData = ref([])
const pickupLocationId = ref(null)
const showAddAddressModal = ref(false)

async function fetchModelLocations(modelId) {
  loading.value = true
  try {
    pickupLocationData.value = await bookingDetailApi.fetchModelLocations(modelId)
    pickupLocationId.value = pickupLocationData.value[0]?.id ?? null
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not load pickup locations.'), { type: 'error' })
  } finally {
    loading.value = false
  }
}

async function loadCustomerAddresses() {
  showAddAddressModal.value = false
  loading.value = true
  try {
    customerAddresses.value = await customerDetailApi.fetchCustomerAddresses(customerId)
  } catch {
    uiStore.notify('Something went wrong', { type: 'error' })
  } finally {
    loading.value = false
  }
}

// --- Pricing ---
const adjustedDiscount = ref(0)
const deliveryCharge = computed(() => (deliveryType.value === 1 ? 500 : 0))
const totalAddonsCharge = computed(() => addonsSelected.value?.price ?? 0)
const payableAmount = computed(
  () =>
    rentalCharge.value +
    totalAddonsCharge.value +
    deliveryCharge.value -
    adjustedDiscount.value +
    penaltyCharge.value,
)
const paymentBreakupsDialog = ref(false)

// --- Submit / confirm ---
const errorMessage = ref('')
const confirmDialog = ref(false)
const orderData = ref(null)

async function createBooking() {
  loading.value = true
  errorMessage.value = ''
  try {
    // NOTE: the old app hardcodes `test: true` here on every real
    // submission — a leftover debug flag, deliberately not ported. See
    // services/bookings/createBooking.api.js::submitDynamicBooking().
    orderData.value = await createBookingApi.submitDynamicBooking({
      model: selectedModel.value ?? null,
      customerId,
      addons: addonsSelected.value?.id ?? null,
      deliveryType: deliveryType.value,
      deliveryAddress: deliveryAddress.value,
      adjustedDiscount: adjustedDiscount.value,
      pickUpLocation: deliveryType.value === 0 ? pickupLocationId.value : null,
      plan_type: planType.value,
    })
    confirmDialog.value = true
  } catch (error) {
    errorMessage.value = toUserMessage(error)
  } finally {
    loading.value = false
  }
}

function confirmAndPay() {
  router.push({ name: 'booking-payment', params: { bookingId: orderData.value.bookingId } })
}
</script>

<template>
  <v-card v-if="loadingCustomer" class="mx-auto pa-6 text-center" max-width="500">
    We are loading ...
  </v-card>

  <v-card v-else class="mx-auto pa-4" max-width="500">
    <div v-if="customerData" class="mb-3">
      <div class="text-caption text-medium-emphasis">customer/{{ customerData.id }}</div>
      <div class="font-weight-medium">{{ customerData.fName }} {{ customerData.lName }}</div>
      <div class="text-medium-emphasis">{{ customerData.mobile }}, {{ customerData.email }}</div>
    </div>
    <v-divider class="mb-3" />

    <div class="text-caption text-medium-emphasis mb-1">Model *</div>
    <v-btn block variant="outlined" color="primary" class="mb-3" @click="openModelDialog">
      {{ selectedModel ? selectedModelName : 'Pick Model' }}
    </v-btn>

    <div v-if="!selectedModel" class="text-medium-emphasis mb-3">Please select model first.</div>
    <template v-else>
      <div class="text-caption text-medium-emphasis mb-1">Addons</div>
      <v-btn block variant="outlined" color="primary" class="mb-3" @click="openAddonDialog">
        {{ addonsSelected ? addonsSelected.name : 'Please Select Addon' }}
      </v-btn>

      <template v-if="selectedModelData?.evType === 'electric'">
        <div class="text-caption text-medium-emphasis mb-1">Plans</div>
        <v-btn block variant="outlined" color="primary" class="mb-3" @click="planDialog = true">
          {{ planType || 'Please Select Plan' }}
        </v-btn>
      </template>

      <v-radio-group v-model="deliveryType" label="Delivery Type" inline density="compact">
        <v-radio label="Pickup" :value="0" />
        <v-radio label="Drop" :value="1" />
      </v-radio-group>

      <div v-if="deliveryType === 0" class="mb-3">
        <v-radio-group v-model="pickupLocationId">
          <v-radio v-for="loc in pickupLocationData" :key="loc.id" :value="loc.id">
            <template #label>
              <div>
                <strong>{{ loc.name }}</strong>
                <div class="text-caption text-medium-emphasis">{{ loc.address }}</div>
              </div>
            </template>
          </v-radio>
        </v-radio-group>
      </div>

      <div v-else class="mb-3">
        <v-radio-group v-model="deliveryAddress">
          <v-radio
            v-for="address in customerAddresses"
            :key="address.id"
            :value="`${address.addLine1} ${address.addLine2} ${address.pincode}`"
            :label="`${address.addLine1}, ${address.addLine2}, ${address.pincode}`"
          />
        </v-radio-group>
        <v-btn color="primary" @click="showAddAddressModal = true">+ Add new address</v-btn>
      </div>

      <div class="d-flex justify-space-between mb-1">
        <span class="text-medium-emphasis">Adjust Discounts</span>
        <span class="text-medium-emphasis">{{ adjustedDiscount }}</span>
      </div>
      <v-slider v-model="adjustedDiscount" :min="0" :max="200" step="50" class="mb-3" />

      <div class="d-flex justify-space-between py-1">
        <span>Rental Charge:</span><span>{{ rentalCharge }}</span>
      </div>
      <div class="d-flex justify-space-between py-1">
        <span>Addons Charge:</span><span>{{ totalAddonsCharge }}</span>
      </div>
      <div class="d-flex justify-space-between py-1">
        <span>Delivery Charge:</span><span>{{ deliveryCharge }}</span>
      </div>
      <div class="d-flex justify-space-between py-1 text-error">
        <span>Penalty Charge:</span><span>+{{ penaltyCharge }}</span>
      </div>
      <div class="d-flex justify-space-between py-1 text-success">
        <span>Adjusted Discount:</span><span>-{{ adjustedDiscount }}</span>
      </div>
      <div class="d-flex justify-space-between py-1 font-weight-bold">
        <span>Payable</span><span>{{ payableAmount }}</span>
      </div>

      <v-btn variant="text" color="primary" class="pl-0 mt-1" @click="paymentBreakupsDialog = true">
        View Payment Breakup
      </v-btn>

      <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mt-3">
        {{ errorMessage }}
      </v-alert>
      <v-btn
        block
        color="primary"
        class="mt-3"
        :disabled="!selectedModel"
        :loading="loading"
        @click="createBooking"
      >
        Create Booking
      </v-btn>
    </template>
  </v-card>

  <!-- Model select dialog -->
  <v-dialog v-model="modelDialog" max-width="560" scrollable>
    <v-card title="Model List">
      <v-card-text>
        <v-text-field
          v-model="modelSearch"
          label="Search model name, e.g. Suzuki, Honda etc"
          class="mb-2"
        />
        <v-card
          v-for="model in filteredModels"
          :key="model.modelData.id"
          class="mb-2 pa-3"
          :style="{
            border:
              selectedModel === model.modelData.id
                ? '2px solid rgb(var(--v-theme-success))'
                : undefined,
          }"
          link
          @click="selectModel(model.modelData)"
        >
          <v-row align="center">
            <v-col cols="3"
              ><v-img :src="model.modelData.image300" height="70" cover rounded="lg"
            /></v-col>
            <v-col cols="9">
              <div class="font-weight-bold">{{ model.modelData.name }}</div>
              <div :class="model.available > 0 ? 'text-success' : 'text-error'">
                Available: {{ model.available }}
              </div>
              <div>
                First Booking: {{ formatCurrency(model.modelData.price) }}, Extension:
                {{ formatCurrency(model.modelData.old_price) }}
              </div>
              <div class="text-medium-emphasis text-decoration-line-through">
                Rack Rate: {{ formatCurrency(model.modelData.inflatedPrice) }}
              </div>
            </v-col>
          </v-row>
        </v-card>
        <EmptyState
          v-if="filteredModels.length === 0"
          icon="mdi-motorbike-off"
          title="No models found"
        />
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Addon select dialog -->
  <v-dialog v-model="addonDialog" max-width="560" scrollable>
    <v-card title="Addon List">
      <v-card-text>
        <v-card
          v-for="addon in filteredAddons"
          :key="addon.id"
          class="mb-2 pa-3"
          :style="{
            border: addonsSelected === addon ? '2px solid rgb(var(--v-theme-success))' : undefined,
          }"
          link
          @click="selectAddon(addon)"
        >
          <v-row align="center">
            <v-col cols="3"><v-img :src="addon.image" height="70" cover rounded="lg" /></v-col>
            <v-col cols="9">
              <div class="font-weight-bold text-primary">{{ addon.name }}</div>
              <div>{{ formatCurrency(addon.price) }}</div>
            </v-col>
          </v-row>
        </v-card>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Plan select dialog -->
  <v-dialog v-model="planDialog" max-width="480">
    <v-card title="Choose a Plan">
      <v-card-text v-if="selectedModelData">
        <v-card
          class="mb-3 pa-3"
          :style="{
            border: planType === 'MONTHLY' ? '2px solid rgb(var(--v-theme-success))' : undefined,
          }"
          link
          @click="choosePlan('MONTHLY')"
        >
          <div class="font-weight-bold">Monthly Plan - 30 days</div>
          <div class="mt-1">
            <strong>{{ formatCurrency(selectedModelData.price) }}</strong>
            {{
              selectedModelData.old_price > selectedModelData.price
                ? 'for first month, extend at'
                : 'per month'
            }}
            <span v-if="selectedModelData.old_price > selectedModelData.price">
              {{ formatCurrency(selectedModelData.old_price) }} per month.
            </span>
          </div>
          <div class="text-caption text-medium-emphasis mt-1">
            + ₹{{ selectedModelData.perKmCharge }} per km as an energy charge, billed weekly. Your
            next energy billing date will be {{ nextBillingDate }} if you pick up today.
          </div>
        </v-card>
        <v-card
          v-if="selectedModelData.weeklyRentalAmount > 0"
          class="pa-3"
          :style="{
            border: planType === 'WEEKLY' ? '2px solid rgb(var(--v-theme-success))' : undefined,
          }"
          link
          @click="choosePlan('WEEKLY')"
        >
          <div class="font-weight-bold">Weekly Plan - 7 days</div>
          <div class="mt-1">
            <strong>{{ formatCurrency(selectedModelData.weeklyRentalAmount) }}/week</strong>
          </div>
          <div class="text-caption text-medium-emphasis mt-1">
            Includes {{ selectedModelData.kmAllowedInWeeklyPlan }} km of free usage — ₹{{
              selectedModelData.perKmCharge
            }}/km applies after exceeding the limit. Your next energy billing date will be
            {{ nextBillingDate }} if you pick up today.
          </div>
        </v-card>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Add address dialog -->
  <v-dialog v-model="showAddAddressModal" max-width="480" scrollable>
    <v-card title="Add Address">
      <v-card-text>
        <AddAddressForm :customer-id="customerId" @added="loadCustomerAddresses" />
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Payment breakups dialog -->
  <v-dialog v-model="paymentBreakupsDialog" max-width="420">
    <v-card title="Payment Breakups">
      <v-card-text>
        <div class="d-flex justify-space-between py-1">
          <span>Rental Charge:</span><span>{{ rentalCharge }}</span>
        </div>
        <div class="d-flex justify-space-between py-1">
          <span>Helmet Charge:</span><span>{{ totalAddonsCharge }}</span>
        </div>
        <div class="d-flex justify-space-between py-1">
          <span>Delivery Charge:</span><span>{{ deliveryCharge }}</span>
        </div>
        <div class="d-flex justify-space-between py-1 text-error">
          <span>Penalty Charge:</span><span>+{{ penaltyCharge }}</span>
        </div>
        <div class="d-flex justify-space-between py-1 text-success">
          <span>Discount:</span><span>-{{ adjustedDiscount }}</span>
        </div>
        <v-divider class="my-2" />
        <div class="d-flex justify-space-between py-1 font-weight-bold">
          <span>Payable</span><span>{{ payableAmount }}</span>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Order confirmation dialog -->
  <v-dialog v-model="confirmDialog" max-width="420" persistent>
    <v-card title="Order Details">
      <v-card-text v-if="orderData">
        <div class="d-flex justify-space-between py-1">
          <span>Booking Id:</span><span>{{ orderData.bookingId }}</span>
        </div>
        <div class="d-flex justify-space-between py-1">
          <span>Model Price:</span><span>{{ orderData.modelPrice }}</span>
        </div>
        <div class="d-flex justify-space-between py-1">
          <span>Addons Charge:</span><span>{{ orderData.addOnsCharge }}</span>
        </div>
        <div class="d-flex justify-space-between py-1">
          <span>Delivery Charge:</span><span>{{ orderData.deliveryCharge }}</span>
        </div>
        <div class="d-flex justify-space-between py-1 text-error">
          <span>Penalty Charge:</span><span>+{{ orderData.penalty }}</span>
        </div>
        <div class="d-flex justify-space-between py-1 text-success">
          <span>Adjusted Discount:</span><span>-{{ orderData.adjustedDiscount }}</span>
        </div>
        <v-divider class="my-2" />
        <div class="d-flex justify-space-between py-1 font-weight-bold pb-4">
          <span>Payable</span><span>{{ orderData.payable }}</span>
        </div>
        <v-btn color="success" block @click="confirmAndPay">Confirm Order</v-btn>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
