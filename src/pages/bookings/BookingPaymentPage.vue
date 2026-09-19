<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import * as bookingDetailApi from '../../services/bookings/bookingDetail.api'
import * as bookingPaymentApi from '../../services/bookings/bookingPayment.api'
import {
  verifyCashPayment,
  sendPaymentLinkAlternate,
} from '../../services/bookings/extendBooking.api'
import { useUiStore } from '../../stores/ui.store'
import { toUserMessage } from '../../utils/errorMessage'
import { formatCurrency } from '../../utils/currency'
import { formatFullDate } from '../../utils/date'

const route = useRoute()
const uiStore = useUiStore()
const bookingId = route.params.bookingId

const loading = ref(true)
const errorMessage = ref('')
const bookingData = ref(null)

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    bookingData.value = await bookingDetailApi.fetchBookingDetail(bookingId)
    if (!bookingData.value) errorMessage.value = 'Some error occurred.'
  } catch (error) {
    errorMessage.value = error.response?.data?.message ?? 'Could not load this booking.'
  } finally {
    loading.value = false
  }
}
onMounted(load)

// --- Send payment link (Cashfree / Razorpay) ---
const sending = ref(false)
async function sendLinkCashfree() {
  sending.value = true
  try {
    await bookingPaymentApi.sendBookingPaymentLinkCashfree(bookingId)
    uiStore.notify('Payment link sent.', { type: 'success' })
    await load()
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not send the payment link.'), { type: 'error' })
  } finally {
    sending.value = false
  }
}
async function sendLinkRazorpay() {
  sending.value = true
  try {
    await bookingPaymentApi.sendBookingPaymentLinkRazorpay(bookingId)
    uiStore.notify('Payment link sent.', { type: 'success' })
    await load()
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not send the payment link.'), { type: 'error' })
  } finally {
    sending.value = false
  }
}
// The old app fully redirected the browser (`window.location.href`) to the
// Razorpay page for this option — replaced with opening it in a new tab so
// the agent doesn't lose their place in the ops app while the customer pays.
async function payThroughRazorpay() {
  sending.value = true
  try {
    const data = await bookingPaymentApi.sendBookingPaymentLinkRazorpay(bookingId)
    const link = data?.data?.paymentLink
    if (link) window.open(link, '_blank', 'noopener')
    await load()
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not open the payment page.'), { type: 'error' })
  } finally {
    sending.value = false
  }
}

function copyLink() {
  const link = bookingData.value?.paymentLinkData?.link
  if (!link) return
  navigator.clipboard.writeText(link).then(() => {
    uiStore.notify('Link copied.', { type: 'success' })
  })
}

// --- Alternate channel resend ---
const altPhone = ref('')
const altWhatsapp = ref('')
const altEmail = ref('')
async function sendAlternate(method) {
  const contact =
    method === 'email' ? altEmail.value : method === 'sms' ? altPhone.value : altWhatsapp.value
  try {
    const data = await sendPaymentLinkAlternate({ extendId: bookingId, contact, method })
    uiStore.notify(data.message ?? 'Sent.', { type: 'success' })
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not send the link.'), { type: 'error' })
  }
}

// --- Collect at Location (cash / points / TOA / ...) ---
const cashDialog = ref(false)
const cashConfirmDialog = ref(false)
const cashForm = ref({ method: '', collectedBy: '', paymentId: '', comment: '' })
const CASH_METHOD_OPTIONS = [
  { title: 'Razorpay', value: 'razorpay' },
  { title: 'Cashfree', value: 'cashfree' },
  { title: 'Cash', value: 'cash' },
  { title: 'QR Code', value: 'qrcode' },
  { title: 'POS', value: 'pos' },
  { title: 'Points', value: 'points' },
  { title: 'Token of Apology (TOA)', value: 'toa' },
  { title: 'Others', value: 'others' },
]
function openCashDialog() {
  cashForm.value = { method: '', collectedBy: '', paymentId: '', comment: '' }
  cashDialog.value = true
}
function onCashMethodChange(value) {
  if (['cash', 'points', 'toa'].includes(value)) {
    const now = new Date()
    cashForm.value.paymentId = `${now.getTime()}`
  } else {
    cashForm.value.paymentId = ''
  }
}
const confirming = ref(false)
async function confirmCashPayment() {
  confirming.value = true
  try {
    await verifyCashPayment({
      extendId: bookingId,
      paymentMethod: cashForm.value.method,
      paymentId: cashForm.value.paymentId,
      comment: `New Booking - ${cashForm.value.comment} - collected by ${cashForm.value.collectedBy}`,
    })
    cashConfirmDialog.value = false
    cashDialog.value = false
    uiStore.notify('Payment recorded.', { type: 'success' })
    await load()
  } catch (error) {
    errorMessage.value = error.response?.data?.message ?? 'Something went wrong.'
  } finally {
    confirming.value = false
  }
}
</script>

<template>
  <div class="mx-auto" style="max-width: 600px">
    <div v-if="loading" class="d-flex justify-center py-10">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <template v-else-if="bookingData">
      <!-- Already paid -->
      <div v-if="bookingData.paymentStatus === 1" class="text-center py-6">
        <v-icon icon="mdi-check-circle" color="success" size="40" class="mb-2" />
        <div class="font-weight-bold">Payment Already Received</div>
        <div class="text-medium-emphasis">We have already received the payment for this order.</div>
        <v-card variant="outlined" class="mt-6 pa-4 text-left">
          <div v-if="bookingData.razorpay_order_id" class="d-flex justify-space-between py-1">
            <span>Order ID</span><span>{{ bookingData.razorpay_order_id }}</span>
          </div>
          <div class="d-flex justify-space-between py-1">
            <span>Payment ID</span>
            <span>{{ bookingData.paymentId || bookingData.razorpay_payment_id || '—' }}</span>
          </div>
          <div class="d-flex justify-space-between py-1">
            <span>Payment Mode</span><span>{{ bookingData.paymentMode || '—' }}</span>
          </div>
          <v-divider class="my-2" />
          <div class="d-flex justify-space-between py-1 font-weight-bold">
            <span>Total Amount</span><span>{{ formatCurrency(bookingData.amount) }}</span>
          </div>
          <v-btn
            v-if="bookingData.status === 0"
            block
            color="success"
            class="mt-4"
            :to="{ name: 'booking-assign-vehicle', params: { bookingId } }"
          >
            Assign Booking
          </v-btn>
          <v-btn
            v-else
            block
            color="primary"
            class="mt-4"
            :to="{ name: 'booking-detail', params: { bookingId } }"
          >
            View Booking
          </v-btn>
        </v-card>
      </div>

      <!-- Awaiting payment -->
      <div v-else>
        <div class="d-flex justify-space-between py-1 font-weight-bold">
          <span>Amount</span><span>{{ formatCurrency(bookingData.amount) }}</span>
        </div>
        <div class="text-medium-emphasis mb-2">Choose Payment Method:</div>

        <v-card
          v-if="bookingData.paymentLinkData"
          variant="outlined"
          class="my-4 pa-4"
          style="border-color: rgb(var(--v-theme-success))"
        >
          <div class="font-weight-bold mb-1">Payment Link Already Created</div>
          <div class="text-truncate">{{ bookingData.paymentLinkData.link }}</div>
          <v-divider class="my-2" />
          <div class="text-caption text-medium-emphasis">
            Link expires on {{ formatFullDate(bookingData.paymentLinkData.expiresOn) }}
          </div>
          <v-btn variant="text" color="primary" class="pl-0 mt-1" @click="copyLink"
            >Copy Link</v-btn
          >
        </v-card>

        <v-list class="my-4" density="comfortable" lines="two" variant="outlined" rounded="lg">
          <v-list-item
            :disabled="Boolean(bookingData.paymentLinkData) || sending"
            title="Send Payment Link — Cashfree"
            subtitle="Customer will receive link through SMS, WhatsApp, and email."
            @click="sendLinkCashfree"
          />
          <v-divider />
          <v-list-item
            :disabled="Boolean(bookingData.paymentLinkData) || sending"
            title="Send Payment Link — Razorpay"
            subtitle="Customer will receive link through SMS, WhatsApp, and email."
            @click="sendLinkRazorpay"
          />
          <v-divider />
          <v-list-item
            :disabled="sending"
            title="Pay through Razorpay"
            subtitle="Opens the payment page in a new tab — use to collect payment in person via QR."
            @click="payThroughRazorpay"
          />
          <v-divider />
          <v-list-item
            title="Collect at Location/Store"
            subtitle="Mark it paid through card, mention agent or cash drawer ID later."
            @click="openCashDialog"
          />
        </v-list>

        <v-btn variant="tonal" @click="load">Refresh</v-btn>

        <v-card variant="outlined" class="mt-4 pa-4">
          <div class="font-weight-medium mb-2">Resend via another channel</div>
          <div class="d-flex ga-2 mb-2">
            <v-text-field
              v-model="altWhatsapp"
              label="WhatsApp number"
              density="compact"
              hide-details
            />
            <v-btn @click="sendAlternate('whatsapp')">Send</v-btn>
          </div>
          <div class="d-flex ga-2 mb-2">
            <v-text-field v-model="altPhone" label="SMS number" density="compact" hide-details />
            <v-btn @click="sendAlternate('sms')">Send</v-btn>
          </div>
          <div class="d-flex ga-2">
            <v-text-field v-model="altEmail" label="Email" density="compact" hide-details />
            <v-btn @click="sendAlternate('email')">Send</v-btn>
          </div>
        </v-card>
      </div>
    </template>

    <v-alert v-if="errorMessage" type="error" variant="tonal" class="mt-3 text-center">
      {{ errorMessage }}
    </v-alert>

    <!-- Collect at Location dialog -->
    <v-dialog v-model="cashDialog" max-width="480">
      <v-card title="Collect at Location">
        <v-card-text>
          <v-select
            v-model="cashForm.method"
            label="Paid by *"
            :items="CASH_METHOD_OPTIONS"
            @update:model-value="onCashMethodChange"
          />
          <v-text-field v-model="cashForm.collectedBy" label="Collected by *" />
          <v-text-field v-model="cashForm.paymentId" label="Payment ID *" />
          <v-textarea v-model="cashForm.comment" label="Comment *" rows="2" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cashDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :disabled="
              !cashForm.method || !cashForm.collectedBy || !cashForm.paymentId || !cashForm.comment
            "
            @click="cashConfirmDialog = true"
          >
            Confirm Payment
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirm dialog -->
    <v-dialog v-model="cashConfirmDialog" max-width="380">
      <v-card title="Are you sure?">
        <v-card-text>
          If you confirm, we will mark your payment as paid and activate the booking.
          <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mt-2">
            {{ errorMessage }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="outlined" color="error" @click="cashConfirmDialog = false">Cancel</v-btn>
          <v-spacer />
          <v-btn color="primary" :loading="confirming" @click="confirmCashPayment">Confirm</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
