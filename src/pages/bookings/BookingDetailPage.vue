<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useBookingDetailStore } from '../../stores/bookingDetail.store'
import { useUiStore } from '../../stores/ui.store'
import { toUserMessage } from '../../utils/errorMessage'
import { formatFullDate } from '../../utils/date'
import BookingStatusBadge from '../../components/bookings/BookingStatusBadge.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import OverviewTab from '../../components/bookings/detail/OverviewTab.vue'
import PaymentsTab from '../../components/bookings/detail/PaymentsTab.vue'
import ImagesTab from '../../components/bookings/detail/ImagesTab.vue'
import ActivitiesTab from '../../components/bookings/detail/ActivitiesTab.vue'
import PaymentTicketsTab from '../../components/bookings/detail/PaymentTicketsTab.vue'
import KmBillsTab from '../../components/bookings/detail/KmBillsTab.vue'
import ExtensionTab from '../../components/bookings/detail/ExtensionTab.vue'
import UpdateDeliveryTypeDialog from '../../components/bookings/detail/UpdateDeliveryTypeDialog.vue'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const store = useBookingDetailStore()
const { booking, loading, error, actionPending } = storeToRefs(store)

// Old-app URL convention: `?current_tab=<index>` (numeric, not the tab's
// string key) — e.g. `/L26I0124408?current_tab=1` for Payments, index 1
// in this same order. Kept as a numeric index (rather than switching the
// v-tabs' own `value`s to numbers) so existing/shared links in that shape
// still land on the right tab.
const TAB_KEYS = [
  'overview',
  'payments',
  'images',
  'activities',
  'tickets',
  'km-bills',
  'extension',
]

function initialTab() {
  const index = Number(route.query.current_tab)
  return Number.isInteger(index) && TAB_KEYS[index] ? TAB_KEYS[index] : 'overview'
}
const tab = ref(initialTab())

watch(tab, (value) => {
  const index = TAB_KEYS.indexOf(value)
  router.replace({ query: { ...route.query, current_tab: index >= 0 ? index : undefined } })
})

async function load() {
  try {
    await store.fetch(route.params.bookingId)
  } catch (err) {
    uiStore.notify(toUserMessage(err, "Couldn't load this booking."), { type: 'error' })
  }
}

onMounted(load)

function goToVehicle() {
  // Now that a real vehicle detail page exists (Phase 2), route straight
  // there — previously fell back to a filtered vehicles list search since
  // no detail page existed yet.
  const vehicleId = booking.value.vehicleData?.id
  if (vehicleId) {
    router.push({ name: 'vehicle-detail', params: { vehicleId } })
  } else {
    router.push({
      name: 'vehicles',
      query: { search: booking.value.vehicleData?.registrationNumber },
    })
  }
}

// --- Cancel booking dialog ---
const cancelDialog = ref(false)
const cancelForm = ref({ source: '', refundId: '', amount: '', comment: '' })
const SOURCE_OPTIONS = [
  { title: 'Razorpay', value: 'razorpay' },
  { title: 'Cashfree', value: 'cashfree' },
  { title: 'Cash', value: 'cash' },
  { title: 'Others', value: 'others' },
]
function openCancel() {
  cancelForm.value = { source: '', refundId: '', amount: '', comment: '' }
  cancelDialog.value = true
}
async function confirmCancel() {
  try {
    await store.cancelBooking(cancelForm.value)
    cancelDialog.value = false
    uiStore.notify('Booking cancelled successfully.', { type: 'success' })
  } catch (err) {
    uiStore.notify(toUserMessage(err, 'Something went wrong.'), { type: 'error' })
  }
}

// --- Reinitiate dialog ---
const reinitiateDialog = ref(false)
const reinitiateComment = ref('')
function openReinitiate() {
  reinitiateComment.value = ''
  reinitiateDialog.value = true
}
async function confirmReinitiate() {
  try {
    await store.reinitiateBooking(reinitiateComment.value)
    reinitiateDialog.value = false
    uiStore.notify('Booking reinitiated.', { type: 'success' })
  } catch (err) {
    uiStore.notify(toUserMessage(err, 'Something went wrong.'), { type: 'error' })
  }
}

// --- View documents dialog ---
const documentsDialog = ref(false)

// --- Update payment dialog ---
const updatePaymentDialog = ref(false)
const orderId = ref('')
function openUpdatePayment() {
  orderId.value = booking.value.razorpay_order_id ?? ''
  updatePaymentDialog.value = true
}
async function confirmUpdatePayment() {
  try {
    await store.updatePayment(orderId.value)
    updatePaymentDialog.value = false
    uiStore.notify('Payment updated successfully.', { type: 'success' })
  } catch (err) {
    uiStore.notify(toUserMessage(err, 'Something went wrong.'), { type: 'error' })
  }
}

// --- Adjust penalty dialog ---
const penaltyDialog = ref(false)
const penalty = ref(0)
const waiveoff = ref(0)
const paid = ref(0)
const addpenalty = ref(0)
const outstanding = computed(
  () =>
    Number(penalty.value) +
    Number(addpenalty.value) -
    (Number(waiveoff.value) + Number(paid.value)),
)
function openPenalty() {
  penalty.value = booking.value.customerData?.penaltyCharge ?? 0
  waiveoff.value = 0
  paid.value = 0
  addpenalty.value = 0
  penaltyDialog.value = true
}
async function savePenalty() {
  try {
    await store.updatePenalty(outstanding.value)
    penaltyDialog.value = false
    uiStore.notify('Penalty Charge Updated successfully!', { type: 'success' })
  } catch (err) {
    uiStore.notify(toUserMessage(err, 'Something is wrong with the API.'), { type: 'error' })
  }
}

// --- Add to / remove from recovery ---
const addRecoveryDialog = ref(false)
const recoveryComment = ref('')
const recoveryAddress = ref('')
function openAddRecovery() {
  recoveryComment.value = ''
  recoveryAddress.value = ''
  addRecoveryDialog.value = true
}
async function confirmAddRecovery() {
  try {
    await store.addToRecovery({ comment: recoveryComment.value, address: recoveryAddress.value })
    addRecoveryDialog.value = false
    uiStore.notify('Vehicle/Booking added to recovery list.', { type: 'success' })
  } catch (err) {
    uiStore.notify(toUserMessage(err, 'Something went wrong.'), { type: 'error' })
  }
}

const removeRecoveryDialog = ref(false)
function openRemoveRecovery() {
  removeRecoveryDialog.value = true
}
async function confirmRemoveRecovery() {
  try {
    await store.removeFromRecovery(booking.value.recoveryData[0].id)
    uiStore.notify('Vehicle/Booking removed from recovery list.', { type: 'success' })
  } catch (err) {
    uiStore.notify(toUserMessage(err, 'Something went wrong.'), { type: 'error' })
  } finally {
    removeRecoveryDialog.value = false
  }
}

// --- Update delivery type ---
const deliveryDialog = ref(false)
</script>

<template>
  <div v-if="loading" class="d-flex justify-center py-10">
    <v-progress-circular indeterminate color="primary" />
  </div>

  <EmptyState
    v-else-if="error || !booking"
    icon="mdi-alert-circle-outline"
    title="Couldn't load this booking"
    :message="toUserMessage(error)"
  >
    <v-btn class="mt-4" variant="tonal" color="primary" @click="load">Retry</v-btn>
  </EmptyState>

  <div v-else>
    <!-- Header -->
    <v-row class="mb-2">
      <v-col cols="12" md="8">
        <div class="d-flex ga-2 align-center mb-2">
          <BookingStatusBadge :status="booking.status" :payment-status="booking.paymentStatus" />
          <v-chip
            size="small"
            :color="booking.plan_type === 'WEEKLY' ? 'primary' : 'secondary'"
            variant="tonal"
          >
            {{ booking.plan_type }}
          </v-chip>
        </div>
        <div v-if="booking.startDate && booking.endDate" class="text-medium-emphasis">
          {{ booking.startDate }} to {{ booking.endDate }}
        </div>
        <div v-if="booking.status === 0" class="text-error">yet to assign</div>
        <div class="text-medium-emphasis">{{ booking.modelData?.name ?? 'N/A' }}</div>
        <div
          v-if="booking.vehicleData"
          class="text-h6 text-primary"
          style="cursor: pointer"
          @click="goToVehicle"
        >
          {{ booking.vehicleData.registrationNumber }}
        </div>
        <v-btn
          v-if="booking.status === 0"
          size="small"
          variant="flat"
          rounded="lg"
          color="warning"
          class="mt-2"
          :to="{ name: 'booking-assign-vehicle', params: { bookingId: booking.bookingId } }"
        >
          Assign Vehicle
        </v-btn>
        <div class="text-caption text-medium-emphasis mt-2">Source: {{ booking.source }}</div>
        <div class="text-caption text-medium-emphasis">{{ formatFullDate(booking.createdAt) }}</div>
      </v-col>

      <v-col cols="12" md="4" class="text-md-right">
        <v-menu>
          <template #activator="{ props: menuProps }">
            <v-btn
              variant="flat"
              rounded="lg"
              append-icon="mdi-chevron-down"
              color="primary"
              v-bind="menuProps"
              >Modify</v-btn
            >
          </template>
          <v-list>
            <v-list-item :to="{ name: 'booking-modify', params: { bookingId: booking.bookingId } }">
              <v-list-item-title>Old (Manual)</v-list-item-title>
            </v-list-item>
            <v-list-item :to="{ name: 'booking-extend', params: { bookingId: booking.bookingId } }">
              <v-list-item-title>Extend Booking (New)</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
        <v-btn
          v-if="booking.status === 0"
          color="error"
          variant="flat"
          rounded="lg"
          class="ml-2"
          @click="openCancel"
          >Cancel</v-btn
        >
        <v-btn
          v-else-if="booking.status === 1 || booking.status === 3"
          variant="flat"
          rounded="lg"
          color="error"
          class="ml-2"
          :to="{ name: 'booking-end', params: { bookingId: booking.bookingId } }"
        >
          End
        </v-btn>
      </v-col>
    </v-row>

    <!-- Status alerts -->
    <v-alert
      v-if="booking.status === 2 || booking.status === 10"
      type="error"
      variant="tonal"
      class="mb-3"
      :icon="false"
      rounded="lg"
    >
      <div class="d-flex justify-space-between align-center flex-wrap ga-2">
        <div>
          <div class="text-h6 font-weight-medium">
            Booking has been {{ booking.status === 2 ? 'ended' : 'cancelled' }}
          </div>
          <div>Ended on: {{ formatFullDate(booking.endedOn) }}</div>
        </div>
        <v-btn variant="flat" rounded="lg" size="small" color="warning" @click="openReinitiate"
          >Reinitiate Booking</v-btn
        >
      </div>
    </v-alert>

    <v-alert
      v-if="booking.status === 1"
      type="success"
      variant="tonal"
      :icon="false"
      rounded="lg"
      class="mb-3"
    >
      <div class="text-h6 font-weight-medium">Booking is active</div>
      <div>Activated from: {{ formatFullDate(booking.assignedOn) }}</div>
    </v-alert>

    <v-alert
      v-if="booking.status === 3"
      type="error"
      variant="tonal"
      class="mb-3"
      :icon="false"
      rounded="lg"
    >
      <div class="text-h6 font-weight-medium">Booking is expired</div>
      <div>Expired on: {{ booking.endDate }}</div>
    </v-alert>

    <v-alert
      v-if="booking.status !== 0"
      :type="!booking.recoveryData?.length ? 'success' : 'error'"
      :icon="false"
      variant="tonal"
      class="mb-3"
      rounded="lg"
    >
      <div class="d-flex justify-space-between align-center flex-wrap ga-2">
        <span>{{
          !booking.recoveryData?.length
            ? 'Vehicle is not added to recovery'
            : 'Vehicle is added to recovery'
        }}</span>
        <v-btn
          v-if="!booking.recoveryData?.length"
          size="small"
          color="success"
          variant="flat"
          rounded="lg"
          @click="openAddRecovery"
        >
          Add to recovery
        </v-btn>
        <v-btn
          v-else
          size="small"
          color="error"
          variant="flat"
          rounded="lg"
          @click="openRemoveRecovery"
          >Remove from recovery</v-btn
        >
      </div>
    </v-alert>

    <v-alert
      v-if="!booking.paymentStatus"
      type="error"
      variant="tonal"
      class="mb-3"
      :icon="false"
      rounded="lg"
    >
      <div class="mb-2">
        This is a failed booking, meaning the booking was created (order ID:
        {{ booking.razorpay_order_id || 'no order created' }}), but the payment was not received. If
        the payment is received through Razorpay, please update the status here.
      </div>
      <v-btn size="small" color="warning" variant="flat" rounded="lg" @click="openUpdatePayment"
        >Update Payment</v-btn
      >
    </v-alert>

    <!-- Tabs -->
    <v-card class="mb-4">
      <v-tabs
        v-model="tab"
        density="comfortable"
        show-arrows
        fixed-tabs
        bg-color="#E3E2FA"
        center-active
      >
        <v-tab value="overview">Overview</v-tab>
        <v-tab value="payments">Payments</v-tab>
        <v-tab value="images">Booking Images</v-tab>
        <v-tab value="activities">Activities</v-tab>
        <v-tab value="tickets">Payment Tickets</v-tab>
        <v-tab value="km-bills">KM Bills</v-tab>
        <v-tab value="extension">Extension</v-tab>
      </v-tabs>
    </v-card>

    <v-window v-model="tab">
      <v-window-item value="overview">
        <OverviewTab
          :booking="booking"
          @edit-delivery="deliveryDialog = true"
          @view-documents="documentsDialog = true"
          @adjust-penalty="openPenalty"
        />
      </v-window-item>
      <v-window-item value="payments">
        <PaymentsTab :booking-id="booking.bookingId" />
      </v-window-item>
      <v-window-item value="images">
        <ImagesTab :booking-id="booking.id" :booking-code="booking.bookingId" />
      </v-window-item>
      <v-window-item value="activities">
        <ActivitiesTab :booking-id="booking.id" />
      </v-window-item>
      <v-window-item value="tickets">
        <PaymentTicketsTab :booking-id="booking.id" />
      </v-window-item>
      <v-window-item value="km-bills">
        <KmBillsTab :booking-id="booking.id" />
      </v-window-item>
      <v-window-item value="extension">
        <ExtensionTab :booking-id="booking.bookingId" />
      </v-window-item>
    </v-window>

    <!-- Cancel booking dialog -->
    <v-dialog v-model="cancelDialog" max-width="480">
      <v-card title="Cancel Booking">
        <v-card-text>
          <v-select
            v-model="cancelForm.source"
            label="Refund Mode *"
            :items="SOURCE_OPTIONS"
            variant="outlined"
          />
          <v-text-field v-model="cancelForm.refundId" label="Refund ID" variant="outlined" />
          <v-text-field
            v-model.number="cancelForm.amount"
            type="number"
            label="Amount *"
            variant="outlined"
          />
          <v-textarea v-model="cancelForm.comment" label="Comment" rows="2" variant="outlined" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn rounded="lg" variant="text" @click="cancelDialog = false">Close</v-btn>
          <v-btn
            color="error"
            variant="flat"
            rounded="lg"
            :loading="actionPending"
            :disabled="!cancelForm.amount || !cancelForm.source"
            @click="confirmCancel"
          >
            Confirm
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Reinitiate dialog -->
    <v-dialog v-model="reinitiateDialog" max-width="480">
      <v-card title="Reinitiate Booking">
        <v-card-text>
          Specify a relevant comment behind booking reinitiation and hit confirm.
          <v-textarea
            v-model="reinitiateComment"
            placeholder="Reason for reinitiation."
            class="mt-2"
            variant="outlined"
            rows="3"
            rounded="lg"
          />
          <div class="text-caption text-medium-emphasis">
            <strong>Note:</strong> once a booking is reinitiated, it cannot be reverted.
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn rounded="lg" variant="text" @click="reinitiateDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            rounded="lg"
            :loading="actionPending"
            :disabled="!reinitiateComment"
            @click="confirmReinitiate"
          >
            Confirm
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- View documents dialog -->
    <v-dialog v-model="documentsDialog" max-width="560">
      <v-card title="View Documents">
        <v-card-text>
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">DL Number</div>
            <strong>{{ booking.customerData?.DLnumber ?? 'Not Available' }}</strong>
          </div>
          <v-row>
            <v-col cols="6">
              <div class="text-caption font-weight-bold mb-1">DL Front</div>
              <a
                v-if="booking.customerData?.DLfront"
                :href="booking.customerData.DLfront"
                target="_blank"
              >
                <v-img :src="booking.customerData.DLfront" height="160" rounded="lg" cover />
              </a>
            </v-col>
            <v-col cols="6">
              <div class="text-caption font-weight-bold mb-1">DL Back</div>
              <a
                v-if="booking.customerData?.DLback"
                :href="booking.customerData.DLback"
                target="_blank"
              >
                <v-img :src="booking.customerData.DLback" height="160" rounded="lg" cover />
              </a>
            </v-col>
            <v-col cols="6">
              <div class="text-caption font-weight-bold mb-1">ID Proof</div>
              <a
                v-if="booking.customerData?.idProof"
                :href="booking.customerData.idProof"
                target="_blank"
              >
                <v-img :src="booking.customerData.idProof" height="160" rounded="lg" cover />
              </a>
            </v-col>
            <v-col cols="6">
              <div class="text-caption font-weight-bold mb-1">ID Proof Back</div>
              <a
                v-if="booking.customerData?.idProofBack"
                :href="booking.customerData.idProofBack"
                target="_blank"
              >
                <v-img :src="booking.customerData.idProofBack" height="160" rounded="lg" cover />
              </a>
            </v-col>
          </v-row>
          <v-alert type="warning" variant="tonal" density="compact" class="mt-3">
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

    <!-- Update payment dialog -->
    <v-dialog v-model="updatePaymentDialog" max-width="420">
      <v-card title="Update Payment">
        <v-card-text>
          <v-text-field v-model="orderId" label="Order ID *" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="updatePaymentDialog = false">Close</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            rounded="lg"
            :loading="actionPending"
            :disabled="!orderId"
            @click="confirmUpdatePayment"
          >
            Update Payment
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Adjust penalty dialog -->
    <v-dialog v-model="penaltyDialog" max-width="480">
      <v-card title="Adjust Penalty">
        <v-card-text>
          <v-row dense>
            <v-col cols="6">
              <v-text-field
                v-model.number="penalty"
                type="number"
                label="Total Penalty"
                disabled
                rounded="lg"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="waiveoff"
                type="number"
                label="Waived Off"
                rounded="lg"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model.number="paid" type="number" label="Paid" rounded="lg" />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="addpenalty"
                type="number"
                label="Add Penalty"
                rounded="lg"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                :model-value="outstanding"
                type="number"
                label="Outstanding"
                disabled
                rounded="lg"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="penaltyDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            rounded="lg"
            :loading="actionPending"
            @click="savePenalty"
            >Save</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add to recovery dialog -->
    <v-dialog v-model="addRecoveryDialog" max-width="480">
      <v-card title="Add to Recovery">
        <v-card-text>
          <v-textarea
            v-model="recoveryComment"
            label="Comment *"
            rows="2"
            variant="outlined"
            rounded="lg"
          />
          <v-textarea
            v-model="recoveryAddress"
            label="Address *"
            rows="2"
            variant="outlined"
            rounded="lg"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="addRecoveryDialog = false">Cancel</v-btn>
          <v-btn
            color="error"
            variant="flat"
            rounded="lg"
            :loading="actionPending"
            :disabled="!recoveryComment || !recoveryAddress"
            @click="confirmAddRecovery"
          >
            Add to Recovery
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Remove from recovery confirm -->
    <v-dialog v-model="removeRecoveryDialog" max-width="400">
      <v-card title="Confirm Removal">
        <v-card-text>Are you sure you want to remove this booking from recovery?</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="removeRecoveryDialog = false">Cancel</v-btn>
          <v-btn
            color="error"
            variant="flat"
            rounded="lg"
            :loading="actionPending"
            @click="confirmRemoveRecovery"
            >Yes, Remove</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <UpdateDeliveryTypeDialog v-model="deliveryDialog" :booking="booking" @updated="load" />
  </div>
</template>
