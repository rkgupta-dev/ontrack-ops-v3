<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import * as extensionsApi from '../../services/bookings/extensions.api'
import * as extendApi from '../../services/bookings/extendBooking.api'
import { useUiStore } from '../../stores/ui.store'
import { toUserMessage } from '../../utils/errorMessage'
import { formatCurrency } from '../../utils/currency'
import { formatFullDate } from '../../utils/date'

const route = useRoute()
const uiStore = useUiStore()
const extendId = route.params.extendId

const loading = ref(true)
const errorMessage = ref('')
const extendResponse = ref(null)
const showBreakup = ref(false)

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    extendResponse.value = await extensionsApi.fetchExtensionDetail(extendId)
  } catch (error) {
    errorMessage.value = error.response?.data?.message ?? 'Could not load this extension.'
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
    await extendApi.sendExtendPaymentLinkCashfree(extendId)
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
    await extendApi.sendExtendPaymentLink(extendId)
    uiStore.notify('Payment link sent.', { type: 'success' })
    await load()
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not send the payment link.'), { type: 'error' })
  } finally {
    sending.value = false
  }
}

// --- Alternate channel resend ---
const altPhone = ref('')
const altWhatsapp = ref('')
const altEmail = ref('')
async function sendAlternate(method) {
  const contact =
    method === 'email' ? altEmail.value : method === 'sms' ? altPhone.value : altWhatsapp.value
  try {
    const data = await extendApi.sendPaymentLinkAlternate({ extendId, contact, method })
    uiStore.notify(data.message ?? 'Sent.', { type: 'success' })
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not send the link.'), { type: 'error' })
  }
}

function copyLink() {
  const link = extendResponse.value?.paymentLinkData?.link
  if (!link) return
  navigator.clipboard.writeText(link).then(() => {
    uiStore.notify('Link copied.', { type: 'success' })
  })
}

// --- Update as cash ---
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
    await extendApi.verifyCashPayment({
      extendId,
      paymentMethod: cashForm.value.method,
      paymentId: cashForm.value.paymentId,
      comment: `Extend Booking - ${cashForm.value.comment} - collected by ${cashForm.value.collectedBy}`,
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

    <template v-else-if="extendResponse">
      <!-- Already paid -->
      <div v-if="extendResponse.paymentStatus === 1" class="text-center py-6">
        <v-icon icon="mdi-check-circle" color="success" size="40" class="mb-2" />
        <div class="font-weight-bold">Payment Already Received</div>
        <div class="text-medium-emphasis">We have already received the payment for this order.</div>
        <v-card variant="outlined" class="mt-6 pa-4 text-left">
          <div class="d-flex justify-space-between py-1">
            <span>Rental</span><span>{{ formatCurrency(extendResponse.rentalAmount) }}</span>
          </div>
          <div class="d-flex justify-space-between py-1">
            <span>Surge Charge</span><span>{{ formatCurrency(extendResponse.surgeCharge) }}</span>
          </div>
          <div class="d-flex justify-space-between py-1">
            <span>Adjusted Discount</span
            ><span>{{ formatCurrency(extendResponse.adjustedDiscount) }}</span>
          </div>
          <div class="d-flex justify-space-between py-1">
            <span>Penalty Charge</span
            ><span>{{ formatCurrency(extendResponse.penaltyCharge) }}</span>
          </div>
          <div class="d-flex justify-space-between py-1">
            <span>Coupon Discount</span
            ><span>{{ formatCurrency(extendResponse.couponDiscount) }}</span>
          </div>
          <v-divider class="my-2" />
          <div class="d-flex justify-space-between py-1 font-weight-bold">
            <span>Paid Amount</span><span>{{ formatCurrency(extendResponse.amount) }}</span>
          </div>
        </v-card>
      </div>

      <!-- Awaiting payment -->
      <div v-else>
        <div class="text-caption text-medium-emphasis">New End Date</div>
        <div class="font-weight-bold mb-2">{{ extendResponse.newEndDate }}</div>
        <v-divider class="mb-2" />
        <div class="d-flex justify-space-between py-1 font-weight-bold">
          <span>Payable Amount</span><span>{{ formatCurrency(extendResponse.amount) }}</span>
        </div>
        <v-btn variant="text" color="primary" class="pl-0" @click="showBreakup = !showBreakup">
          View Breakup
        </v-btn>
        <v-card v-if="showBreakup" variant="outlined" class="pa-3 mb-3">
          <div class="d-flex justify-space-between py-1">
            <span>Rental</span><span>{{ formatCurrency(extendResponse.rentalAmount) }}</span>
          </div>
          <div class="d-flex justify-space-between py-1">
            <span>Surge Charge</span><span>{{ formatCurrency(extendResponse.surgeCharge) }}</span>
          </div>
          <div class="d-flex justify-space-between py-1">
            <span>Adjusted Discount</span
            ><span>{{ formatCurrency(extendResponse.adjustedDiscount) }}</span>
          </div>
          <div class="d-flex justify-space-between py-1">
            <span>Penalty Charge</span
            ><span>{{ formatCurrency(extendResponse.penaltyCharge) }}</span>
          </div>
          <div class="d-flex justify-space-between py-1">
            <span>Coupon Discount</span
            ><span>{{ formatCurrency(extendResponse.couponDiscount) }}</span>
          </div>
        </v-card>

        <v-card
          v-if="extendResponse.paymentLinkData"
          variant="outlined"
          class="my-4 pa-4"
          style="border-color: rgb(var(--v-theme-success))"
        >
          <div class="font-weight-bold mb-1">Payment Link Already Created</div>
          <div class="text-truncate">{{ extendResponse.paymentLinkData.link }}</div>
          <v-divider class="my-2" />
          <div class="text-caption text-medium-emphasis">
            Link expires on {{ formatFullDate(extendResponse.paymentLinkData.expiresOn) }}
          </div>
          <v-btn variant="text" color="primary" class="pl-0 mt-1" @click="copyLink"
            >Copy Link</v-btn
          >
        </v-card>

        <v-list class="my-4" density="comfortable" lines="one" variant="outlined" rounded="lg">
          <v-list-item
            :disabled="Boolean(extendResponse.paymentLinkData) || sending"
            title="Send Payment Link — Cashfree"
            @click="sendLinkCashfree"
          />
          <v-divider />
          <v-list-item
            :disabled="Boolean(extendResponse.paymentLinkData) || sending"
            title="Send Payment Link — Razorpay"
            @click="sendLinkRazorpay"
          />
          <v-divider />
          <v-list-item title="Update as Cash" @click="openCashDialog" />
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

    <!-- Update Cash dialog -->
    <v-dialog v-model="cashDialog" max-width="480">
      <v-card title="Update Cash Payment">
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
