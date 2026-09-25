<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import * as vehicleDetailApi from '../../services/vehicles/vehicleDetail.api'
import { useUiStore } from '../../stores/ui.store'
import { toUserMessage } from '../../utils/errorMessage'
import { formatCurrency } from '../../utils/currency'
import { formatFullDate } from '../../utils/date'
import BookingStatusBadge from '../../components/bookings/BookingStatusBadge.vue'
import EmptyState from '../../components/common/EmptyState.vue'

const route = useRoute()
const uiStore = useUiStore()

const loading = ref(true)
const vehicle = ref(null)

onMounted(async () => {
  try {
    vehicle.value = await vehicleDetailApi.fetchVehicleDetail(route.params.vehicleId)
  } catch (error) {
    uiStore.notify(toUserMessage(error, "Couldn't load this vehicle."), { type: 'error' })
  } finally {
    loading.value = false
  }
})

function print() {
  window.print()
}
</script>

<template>
  <div class="vehicle-snapshot-page">
    <div v-if="loading" class="d-flex justify-center py-10">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <EmptyState
      v-else-if="!vehicle"
      icon="mdi-alert-circle-outline"
      title="Couldn't load this vehicle"
    />

    <template v-else>
      <div class="d-flex justify-space-between align-center mb-4 no-print">
        <span class="text-medium-emphasis">Print Preview</span>
        <v-btn variant="flat" rounded="lg" color="primary" prepend-icon="mdi-printer" @click="print"
          >Print</v-btn
        >
      </div>

      <v-card class="pa-8 mx-auto snapshot-sheet" max-width="800">
        <div class="d-flex ga-4 align-center">
          <img src="/android-chrome-192x192.png" width="60" alt="" />
          <div>
            <div class="font-weight-bold">Ontrack Technologies Private Limited</div>
            <div class="text-caption">
              91 SpringBoard, 4th Floor, No 22, Salarpuria Towers Koramangala, Bangalore KA 560095
              IN
            </div>
          </div>
        </div>
        <v-divider class="my-4" thickness="2" color="black" />
        <div class="text-center my-6">
          <h2 class="text-decoration-underline">Vehicle Snapshot</h2>
        </div>

        <EmptyState
          v-if="!vehicle.bookingData"
          icon="mdi-calendar-blank-outline"
          title="No current booking for this vehicle"
        />

        <template v-else>
          <h4 class="mb-2">Customer Details</h4>
          <v-divider color="black" class="mb-4" />
          <v-row>
            <v-col cols="12" md="8">
              <v-row>
                <v-col cols="6" class="py-2">
                  <div class="font-weight-bold">Full Name</div>
                  {{ vehicle.bookingData.customerData?.fName }}
                  {{ vehicle.bookingData.customerData?.lName }}
                </v-col>
                <v-col cols="6" class="py-2">
                  <div class="font-weight-bold">Phone Number</div>
                  {{ vehicle.bookingData.customerData?.mobile ?? '—' }}
                </v-col>
                <v-col cols="6" class="py-2">
                  <div class="font-weight-bold">Email</div>
                  {{ vehicle.bookingData.customerData?.email ?? '—' }}
                </v-col>
                <v-col cols="6" class="py-2">
                  <div class="font-weight-bold">Booking ID</div>
                  {{ vehicle.bookingData.bookingId }}
                </v-col>
              </v-row>
            </v-col>
            <v-col cols="12" md="4" class="py-2">
              <div class="font-weight-bold">Address</div>
              {{ vehicle.bookingData.customerData?.address ?? '—' }}
            </v-col>
          </v-row>

          <h4 class="mt-6 mb-2">Booking Details</h4>
          <v-divider color="black" class="mb-4" />
          <v-row>
            <v-col cols="4" class="py-2">
              <div class="font-weight-bold">Model</div>
              {{ vehicle.modelData?.name }}
            </v-col>
            <v-col cols="4" class="py-2">
              <div class="font-weight-bold">Registration Number</div>
              {{ vehicle.registrationNumber }}
            </v-col>
            <v-col cols="4" class="py-2">
              <div class="font-weight-bold">Booking Status</div>
              <BookingStatusBadge :status="vehicle.bookingData.status" />
            </v-col>
            <v-col cols="4" class="py-2">
              <div class="font-weight-bold">Start Date</div>
              {{ formatFullDate(vehicle.bookingData.startDate) }}
            </v-col>
            <v-col cols="4" class="py-2">
              <div class="font-weight-bold">End Date</div>
              {{ formatFullDate(vehicle.bookingData.endDate) }}
            </v-col>
            <v-col cols="12" class="py-2">
              <div class="font-weight-bold">Booking Generated On</div>
              {{ formatFullDate(vehicle.bookingData.createdAt) }}
            </v-col>
            <v-col v-if="vehicle.bookingData.endedOn" cols="12" class="py-2">
              <div class="font-weight-bold">Booking Ended On</div>
              {{ formatFullDate(vehicle.bookingData.endedOn) }}
            </v-col>
          </v-row>

          <h4 class="mt-6 mb-2">Payment Details</h4>
          <v-card variant="outlined" style="border-style: dotted" class="pa-4">
            <div class="d-flex justify-space-between py-1">
              <span>Booking Charge</span
              ><span>{{ formatCurrency(vehicle.bookingData.rentalCharge) }}</span>
            </div>
            <div class="d-flex justify-space-between py-1">
              <span>Helmet Charge</span
              ><span>{{ formatCurrency(vehicle.bookingData.helmetCharge) }}</span>
            </div>
            <div class="d-flex justify-space-between py-1">
              <span>Delivery Charge</span
              ><span>{{ formatCurrency(vehicle.bookingData.deliveryCharge) }}</span>
            </div>
            <v-divider class="my-2" />
            <div class="d-flex justify-space-between py-1 font-weight-bold">
              <span>Total Amount</span>
              <span>
                {{
                  formatCurrency(
                    Number(vehicle.bookingData.deliveryCharge || 0) +
                      Number(vehicle.bookingData.rentalCharge || 0) +
                      Number(vehicle.bookingData.helmetCharge || 0),
                  )
                }}
              </span>
            </div>
            <div class="mt-2">
              <strong>Payment Status:</strong>
              {{ vehicle.bookingData.paymentStatus ? 'Paid' : 'Due' }}
            </div>
            <div>
              <strong>Payment ID:</strong>
              {{
                vehicle.bookingData.razorpay_payment_id ||
                vehicle.bookingData.other_payment_id ||
                vehicle.bookingData.paymentId ||
                'not specified'
              }}
            </div>
          </v-card>
        </template>

        <div class="text-caption text-medium-emphasis mt-8">
          This snapshot was generated automatically on {{ formatFullDate(new Date()) }}, and is
          intended solely for use by authorised personnel.
        </div>
      </v-card>
    </template>
  </div>
</template>

<style>
/* Print handling replaces the old app's fragile approach (swapping
   document.body.innerHTML for the snapshot's innerHTML, calling
   window.print(), then swapping it back — which briefly destroys the
   live Vue-mounted DOM tree). Using a real print stylesheet instead: hide
   the app shell (sidebar/top bar) and any explicitly no-print elements,
   let the browser's native print handle the rest. `:has()` scopes this to
   only take effect while this page is mounted, despite the <style> block
   itself being unscoped (unscoped is required to reach the shell, which
   is outside this component's DOM). */
@media print {
  body:has(.vehicle-snapshot-page) .app-drawer,
  body:has(.vehicle-snapshot-page) .v-app-bar,
  body:has(.vehicle-snapshot-page) .no-print {
    display: none !important;
  }
  body:has(.vehicle-snapshot-page) .v-main {
    padding: 0 !important;
  }
}
</style>
