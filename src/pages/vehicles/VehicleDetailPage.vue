<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useVehicleDetailStore } from '../../stores/vehicleDetail.store'
import { useUiStore } from '../../stores/ui.store'
import { toUserMessage } from '../../utils/errorMessage'
import { formatFullDate, formatRelativeTime, isExpired } from '../../utils/date'
import { formatCurrency } from '../../utils/currency'
import VehicleStatusBadge from '../../components/vehicles/VehicleStatusBadge.vue'
import BookingStatusBadge from '../../components/bookings/BookingStatusBadge.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import SpecsTab from '../../components/vehicles/detail/SpecsTab.vue'
import SettingsTab from '../../components/vehicles/detail/SettingsTab.vue'
import BookingHistoryTab from '../../components/vehicles/detail/BookingHistoryTab.vue'
import ServiceHistoryTab from '../../components/vehicles/detail/ServiceHistoryTab.vue'
import VcrTab from '../../components/vehicles/detail/VcrTab.vue'
import ActivitiesTab from '../../components/bookings/detail/ActivitiesTab.vue'
import VehicleCollectionTab from '../../components/vehicles/detail/VehicleCollectionTab.vue'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const store = useVehicleDetailStore()
const { vehicle, loading, error } = storeToRefs(store)

// Read once on load, then keep the URL in sync so the active tab survives
// a reload/share — it was previously only ever read, never written back.
const tab = ref(route.query.tab ?? 'specs')
watch(tab, (value) => {
  router.replace({ query: { ...route.query, tab: value } })
})

async function load() {
  try {
    await store.fetch(route.params.vehicleId)
  } catch (err) {
    uiStore.notify(toUserMessage(err, "Couldn't load this vehicle."), { type: 'error' })
  }
}
onMounted(load)

const isSwapKeyBlocked = computed(() => Boolean(vehicle.value?.swapKeyStatus?.blocked))

// --- Resale listing ---
const resaleDialog = ref(false)
const resaleDetailDialog = ref(false)
const resaleForm = ref({
  reSalePrice: '',
  insuranceCost: '',
  rtoCost: '',
  rsaCost: '',
  warrantyCost: '',
  kmReading: '',
  about: '',
  miscCost: 0,
  isForSale: false,
})
const totalPrice = computed(
  () =>
    Number(resaleForm.value.reSalePrice || 0) +
    Number(resaleForm.value.insuranceCost || 0) +
    Number(resaleForm.value.rtoCost || 0) +
    Number(resaleForm.value.rsaCost || 0) +
    Number(resaleForm.value.warrantyCost || 0) +
    Number(resaleForm.value.miscCost || 0),
)
function openResaleDialog() {
  const details = vehicle.value.vehicleDetails ?? {}
  resaleForm.value = {
    reSalePrice: details.reSalePrice ?? '',
    insuranceCost: details.insuranceCost ?? '',
    rtoCost: details.rtoCost ?? '',
    rsaCost: details.rsaCost ?? '',
    warrantyCost: details.warrantyCost ?? '',
    kmReading: details.kmReading ?? '',
    about: details.about ?? '',
    miscCost: details.miscCost ?? 0,
    isForSale: Boolean(details.isForSale),
  }
  resaleDialog.value = true
}
const savingResale = ref(false)
async function submitResale() {
  savingResale.value = true
  try {
    await store.updateResale({
      ...resaleForm.value,
      registrationNumber: vehicle.value.registrationNumber,
      totalPrice: totalPrice.value,
    })
    resaleDialog.value = false
    resaleDetailDialog.value = false
    uiStore.notify('Updated.', { type: 'success' })
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not update resale details.'), { type: 'error' })
  } finally {
    savingResale.value = false
  }
}
</script>

<template>
  <div v-if="loading" class="d-flex justify-center py-10">
    <v-progress-circular indeterminate color="primary" />
  </div>

  <EmptyState
    v-else-if="error || !vehicle"
    icon="mdi-alert-circle-outline"
    title="Couldn't load this vehicle"
    :message="toUserMessage(error)"
  >
    <v-btn class="mt-4" variant="tonal" color="primary" @click="load">Retry</v-btn>
  </EmptyState>

  <div v-else>
    <!-- Header -->
    <v-row class="mb-2">
      <v-col cols="12" md="7">
        <h2 class="text-h5 font-weight-medium">{{ vehicle.registrationNumber }}</h2>
        <div class="d-flex ga-2 flex-wrap align-center mt-1 mb-2">
          <v-chip size="x-small" :color="vehicle.gps ? 'success' : undefined" variant="tonal">
            {{ vehicle.gps ? 'GPS Installed' : 'GPS Not Installed' }}
          </v-chip>
          <v-chip
            v-if="isExpired(vehicle.nextInsuranceDate)"
            size="small"
            color="error"
            variant="tonal"
          >
            Insurance Expired
          </v-chip>
          <v-chip v-if="isExpired(vehicle.RCExpiry)" size="small" color="error" variant="tonal">
            RC Expired
          </v-chip>
          <VehicleStatusBadge :status="vehicle.status" />
          <v-chip
            v-if="vehicle.subStatus && vehicle.subStatus !== 'Default'"
            size="small"
            :color="vehicle.subStatus === 'Engine Issue Resolved' ? 'primary' : 'error'"
            variant="tonal"
          >
            <v-icon
              :icon="
                vehicle.subStatus === 'Engine Issue Resolved' ? 'mdi-check-circle' : 'mdi-alert'
              "
              size="14"
              start
            />
            {{ vehicle.subStatus }}
          </v-chip>
          <v-chip v-if="isSwapKeyBlocked" size="small" color="error" variant="tonal">
            <v-icon icon="mdi-key" size="14" start /> Swap Key Blocked
          </v-chip>
        </div>
        <div class="text-caption text-medium-emphasis">
          Added: {{ formatFullDate(vehicle.modelData?.createdAt) }}
        </div>
        <div class="text-caption text-medium-emphasis">
          {{ vehicle.modelData?.show === 1 ? 'Visible' : 'Hidden' }}
        </div>

        <v-card v-if="vehicle.status !== 7" variant="outlined" class="pa-3 mt-2" max-width="350">
          <template v-if="vehicle.vehicleDetails?.isForSale">
            <div class="text-success font-weight-medium mb-2">Vehicle is listed for sale</div>
            <v-btn size="small" color="primary" @click="openResaleDialog"
              >Update Resale Details</v-btn
            >
          </template>
          <template v-else>
            <div class="text-error font-weight-medium mb-2">Vehicle is not listed for sale</div>
            <v-btn
              size="small"
              variant="flat"
              rounded="lg"
              color="primary"
              @click="openResaleDialog"
              >Add to Resale</v-btn
            >
          </template>
        </v-card>
        <v-card
          v-else
          variant="outlined"
          class="pa-3 mt-2"
          max-width="350"
          link
          @click="resaleDetailDialog = true"
        >
          <div class="text-success font-weight-medium">
            This vehicle has been sold out. {{ formatCurrency(totalPrice) }}
          </div>
        </v-card>

        <div class="mt-3">
          <div class="font-weight-medium">{{ vehicle.modelData?.name }}</div>
          <div>
            <span class="text-decoration-line-through text-medium-emphasis">
              {{ formatCurrency(vehicle.modelData?.inflatedPrice) }}
            </span>
            <strong class="ml-2">{{ formatCurrency(vehicle.modelData?.price) }} /m</strong>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Current booking card -->
    <v-card v-if="vehicle.bookingData" variant="outlined" class="pa-4 mb-4">
      <div class="d-flex justify-space-between align-start">
        <div v-if="vehicle.bookingData.status === 3">
          <v-chip size="small" color="error" variant="tonal">
            Booking Expired {{ formatRelativeTime(vehicle.bookingData.endDate) }}
          </v-chip>
        </div>
        <BookingStatusBadge v-else :status="vehicle.bookingData.status" />
        <v-btn
          size="small"
          rounded="lg"
          variant="flat"
          color="primary"
          :to="{ name: 'vehicle-snapshot', params: { vehicleId: vehicle.id } }"
        >
          Snap
        </v-btn>
      </div>
      <div class="text-caption text-medium-emphasis mt-2">
        {{ formatFullDate(vehicle.bookingData.createdAt) }}
      </div>
      <div class="font-weight-medium">
        {{ vehicle.bookingData.customerData?.fName }} {{ vehicle.bookingData.customerData?.lName }}
      </div>
      <RouterLink
        :to="{ name: 'booking-detail', params: { bookingId: vehicle.bookingData.bookingId } }"
      >
        {{ vehicle.bookingData.bookingId }}
      </RouterLink>
      <div class="d-flex justify-space-between mt-2">
        <strong>{{ vehicle.bookingData.startDate }}</strong>
        <v-icon icon="mdi-arrow-right" />
        <strong>{{ vehicle.bookingData.endDate }}</strong>
      </div>
      <v-btn
        class="mt-3"
        size="small"
        variant="tonal"
        rounded="lg"
        :to="{ name: 'booking-detail', params: { bookingId: vehicle.bookingData.bookingId } }"
      >
        View Details
      </v-btn>
    </v-card>
    <v-alert
      v-else-if="vehicle.status === 1"
      type="warning"
      variant="tonal"
      :icon="false"
      rounded="lg"
      class="mb-4"
    >
      Vehicle is marked booked, but no details found.
    </v-alert>

    <!-- Tabs -->
    <v-card class="mb-4">
      <v-tabs
        v-model="tab"
        density="comfortable"
        fixed-tabs
        show-arrows
        bg-color="#E3E2FA"
        center-active
      >
        <v-tab value="specs">Specs</v-tab>
        <v-tab value="service">Service History</v-tab>
        <v-tab value="settings">Settings</v-tab>
        <v-tab value="bookings">Booking History</v-tab>
        <v-tab value="vcr">VCR</v-tab>
        <v-tab value="activities">Activities</v-tab>
        <v-tab value="collection">Collection</v-tab>
      </v-tabs>
    </v-card>

    <v-window v-model="tab">
      <v-window-item value="specs"><SpecsTab :vehicle="vehicle" /></v-window-item>
      <v-window-item value="service"><ServiceHistoryTab :vehicle-id="vehicle.id" /></v-window-item>
      <v-window-item value="settings"><SettingsTab :vehicle="vehicle" /></v-window-item>
      <v-window-item value="bookings"><BookingHistoryTab :vehicle-id="vehicle.id" /></v-window-item>
      <v-window-item value="vcr"><VcrTab :vehicle-id="vehicle.id" /></v-window-item>
      <v-window-item value="activities"><ActivitiesTab :booking-id="vehicle.id" /></v-window-item>
      <v-window-item value="collection"
        ><VehicleCollectionTab :vehicle-id="vehicle.id"
      /></v-window-item>
    </v-window>

    <!-- Resale detail (read-only, sold vehicles) -->
    <v-dialog v-model="resaleDetailDialog" max-width="420">
      <v-card title="Vehicle Re-Sale Details">
        <v-card-text>
          <div class="d-flex justify-space-between py-1">
            <span>Registration Number</span><span>{{ vehicle.registrationNumber }}</span>
          </div>
          <div class="d-flex justify-space-between py-1">
            <span>Re-Sale Price</span><span>{{ formatCurrency(resaleForm.reSalePrice) }}</span>
          </div>
          <div class="d-flex justify-space-between py-1">
            <span>Insurance Cost</span><span>{{ formatCurrency(resaleForm.insuranceCost) }}</span>
          </div>
          <div class="d-flex justify-space-between py-1">
            <span>RTO Cost</span><span>{{ formatCurrency(resaleForm.rtoCost) }}</span>
          </div>
          <div class="d-flex justify-space-between py-1">
            <span>RSA Cost</span><span>{{ formatCurrency(resaleForm.rsaCost) }}</span>
          </div>
          <div class="d-flex justify-space-between py-1">
            <span>Warranty Cost</span><span>{{ formatCurrency(resaleForm.warrantyCost) }}</span>
          </div>
          <div class="d-flex justify-space-between py-1">
            <span>Miscellaneous Cost</span><span>{{ formatCurrency(resaleForm.miscCost) }}</span>
          </div>
          <div class="d-flex justify-space-between py-1">
            <span>KM Driven</span><span>{{ resaleForm.kmReading }} km</span>
          </div>
          <v-divider class="my-2" />
          <div class="d-flex justify-space-between py-1 font-weight-bold">
            <span>Total Price</span><span>{{ formatCurrency(totalPrice) }}</span>
          </div>
          <v-btn class="mt-3" variant="text" color="primary" @click="openResaleDialog">
            Update Details
          </v-btn>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Resale pricing form -->
    <v-dialog v-model="resaleDialog" max-width="480" scrollable>
      <v-card title="Resale Pricing">
        <v-card-text>
          <v-text-field
            v-model.number="resaleForm.reSalePrice"
            type="number"
            label="Resale Price"
          />
          <v-text-field
            v-model.number="resaleForm.insuranceCost"
            type="number"
            label="Insurance Cost"
          />
          <v-text-field v-model.number="resaleForm.rtoCost" type="number" label="RTO Cost" />
          <v-text-field v-model.number="resaleForm.rsaCost" type="number" label="RSA Cost" />
          <v-text-field
            v-model.number="resaleForm.warrantyCost"
            type="number"
            label="Warranty Cost"
          />
          <v-text-field v-model.number="resaleForm.kmReading" type="number" label="KM Driven" />
          <v-text-field
            v-model.number="resaleForm.miscCost"
            type="number"
            label="Miscellaneous Charge"
          />
          <v-textarea v-model="resaleForm.about" label="About" rows="3" />
          <v-switch v-model="resaleForm.isForSale" color="primary" label="Add to Resale" />
          <v-text-field :model-value="formatCurrency(totalPrice)" label="Total Price" readonly />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="resaleDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="savingResale" @click="submitResale">Submit</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
