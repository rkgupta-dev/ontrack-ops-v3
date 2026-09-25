<script setup>
import { computed, onMounted, ref } from 'vue'
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

const breakupRows = computed(() => {
  const data = extendResponse.value
  if (!data) return []
  return [
    { label: 'Rental', value: data.rentalAmount },
    { label: 'Surge Charge', value: data.surgeCharge },
    { label: 'Adjusted Discount', value: data.adjustedDiscount },
    { label: 'Penalty Charge', value: data.penaltyCharge },
    { label: 'Coupon Discount', value: data.couponDiscount },
  ]
})

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
      <v-card v-if="extendResponse.paymentStatus === 1" variant="outlined" rounded="lg">
        <div class="text-center pa-6">
          <v-avatar color="success" variant="tonal" size="56" class="mb-3">
            <v-icon icon="mdi-check-circle" size="32" />
          </v-avatar>
          <div class="text-subtitle-1 font-weight-bold">Payment Already Received</div>
          <div class="text-body-2 text-medium-emphasis">
            We have already received the payment for this order.
          </div>
        </div>

        <v-divider />

        <div class="pa-4">
          <div class="d-flex align-start justify-space-between ga-2 mb-3">
            <div>
              <div class="text-caption text-medium-emphasis">New End Date</div>
              <div class="font-weight-bold">{{ extendResponse.newEndDate }}</div>
            </div>
            <v-chip color="success" variant="tonal" size="small" label prepend-icon="mdi-check">
              Paid
            </v-chip>
          </div>

          <div class="border rounded-lg pa-3 text-body-2">
            <div
              v-for="row in breakupRows"
              :key="row.label"
              class="d-flex justify-space-between py-1"
            >
              <span class="text-medium-emphasis">{{ row.label }}</span>
              <span>{{ formatCurrency(row.value) }}</span>
            </div>
          </div>

          <div class="d-flex align-center justify-space-between mt-4">
            <span class="text-caption text-medium-emphasis">Paid Amount</span>
            <span class="text-h5 font-weight-bold text-success">
              {{ formatCurrency(extendResponse.amount) }}
            </span>
          </div>
        </div>
      </v-card>

      <!-- Awaiting payment -->
      <div v-else class="d-flex flex-column ga-4">
        <!-- Summary -->
        <v-card variant="outlined" rounded="lg" class="pa-4">
          <div class="d-flex align-start justify-space-between ga-2">
            <div>
              <div class="text-caption text-medium-emphasis">New End Date</div>
              <div class="font-weight-bold">{{ extendResponse.newEndDate }}</div>
            </div>
            <v-chip color="warning" variant="tonal" size="small" label>Awaiting payment</v-chip>
          </div>

          <v-divider class="my-3" />

          <div class="d-flex align-center justify-space-between ga-2">
            <div>
              <div class="text-caption text-medium-emphasis">Payable Amount</div>
              <div class="text-h5 font-weight-bold">
                {{ formatCurrency(extendResponse.amount) }}
              </div>
            </div>
            <v-btn
              variant="text"
              color="primary"
              size="small"
              :append-icon="showBreakup ? 'mdi-chevron-up' : 'mdi-chevron-down'"
              @click="showBreakup = !showBreakup"
            >
              {{ showBreakup ? 'Hide' : 'View' }} Breakup
            </v-btn>
          </div>

          <v-expand-transition>
            <div v-if="showBreakup" class="border rounded-lg pa-3 mt-3 text-body-2">
              <div
                v-for="row in breakupRows"
                :key="row.label"
                class="d-flex justify-space-between py-1"
              >
                <span class="text-medium-emphasis">{{ row.label }}</span>
                <span>{{ formatCurrency(row.value) }}</span>
              </div>
            </div>
          </v-expand-transition>
        </v-card>

        <!-- Existing payment link -->
        <v-alert
          v-if="extendResponse.paymentLinkData"
          type="success"
          variant="tonal"
          rounded="lg"
          icon="mdi-link-variant"
        >
          <div class="font-weight-bold">Payment link already created</div>
          <div class="text-body-2 text-truncate">{{ extendResponse.paymentLinkData.link }}</div>
          <div class="text-caption mt-1">
            Expires on {{ formatFullDate(extendResponse.paymentLinkData.expiresOn) }}
          </div>
          <v-btn
            variant="flat"
            color="success"
            size="small"
            rounded="lg"
            prepend-icon="mdi-content-copy"
            class="mt-2"
            @click="copyLink"
          >
            Copy Link
          </v-btn>
        </v-alert>

        <!-- Collect payment -->
        <div>
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="text-subtitle-2 font-weight-bold">Collect payment</div>
            <v-btn
              variant="text"
              size="small"
              prepend-icon="mdi-refresh"
              :loading="loading"
              @click="load"
            >
              Refresh
            </v-btn>
          </div>
          <v-card variant="outlined" rounded="lg">
            <v-list density="comfortable" class="py-0">
              <v-list-item
                :disabled="Boolean(extendResponse.paymentLinkData) || sending"
                prepend-icon="mdi-link-variant"
                append-icon="mdi-chevron-right"
                title="Send payment link — Cashfree"
                subtitle="Customer pays online via Cashfree"
                @click="sendLinkCashfree"
              />
              <v-divider />
              <v-list-item
                :disabled="Boolean(extendResponse.paymentLinkData) || sending"
                prepend-icon="mdi-link-variant"
                append-icon="mdi-chevron-right"
                title="Send payment link — Razorpay"
                subtitle="Customer pays online via Razorpay"
                @click="sendLinkRazorpay"
              />
              <v-divider />
              <v-list-item
                prepend-icon="mdi-cash"
                append-icon="mdi-chevron-right"
                title="Update as cash"
                subtitle="Record a payment collected offline"
                @click="openCashDialog"
              />
            </v-list>
          </v-card>
        </div>

        <!-- Resend via another channel -->
        <v-card variant="outlined" rounded="lg" class="pa-4">
          <div class="text-subtitle-2 font-weight-bold">Resend via another channel</div>
          <div class="text-caption text-medium-emphasis mb-3">
            Send the payment link to a different number or email.
          </div>
          <div class="d-flex flex-column ga-3">
            <div class="d-flex align-center ga-2">
              <v-text-field
                v-model="altWhatsapp"
                label="WhatsApp number"
                type="tel"
                prepend-inner-icon="mdi-whatsapp"
                density="compact"
                hide-details
              />
              <v-btn
                color="primary"
                variant="tonal"
                rounded="lg"
                height="40"
                :disabled="!altWhatsapp"
                @click="sendAlternate('whatsapp')"
              >
                Send
              </v-btn>
            </div>
            <div class="d-flex align-center ga-2">
              <v-text-field
                v-model="altPhone"
                label="SMS number"
                type="tel"
                prepend-inner-icon="mdi-message-text-outline"
                density="compact"
                hide-details
              />
              <v-btn
                color="primary"
                variant="tonal"
                rounded="lg"
                height="40"
                :disabled="!altPhone"
                @click="sendAlternate('sms')"
              >
                Send
              </v-btn>
            </div>
            <div class="d-flex align-center ga-2">
              <v-text-field
                v-model="altEmail"
                label="Email"
                type="email"
                prepend-inner-icon="mdi-email-outline"
                density="compact"
                hide-details
              />
              <v-btn
                color="primary"
                variant="tonal"
                rounded="lg"
                height="40"
                :disabled="!altEmail"
                @click="sendAlternate('email')"
              >
                Send
              </v-btn>
            </div>
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
            variant="outlined"
            rounded="lg"
            :items="CASH_METHOD_OPTIONS"
            @update:model-value="onCashMethodChange"
          />
          <v-text-field
            v-model="cashForm.collectedBy"
            label="Collected by *"
            variant="outlined"
            rounded="lg"
          />
          <v-text-field
            v-model="cashForm.paymentId"
            label="Payment ID *"
            variant="outlined"
            rounded="lg"
          />
          <v-textarea
            v-model="cashForm.comment"
            label="Comment *"
            rows="2"
            variant="outlined"
            rounded="lg"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="cashDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            rounded="lg"
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
          <v-spacer />
          <v-btn variant="flat" rounded="lg" @click="cashConfirmDialog = false">Cancel</v-btn>

          <v-btn
            color="primary"
            variant="flat"
            rounded="lg"
            :loading="confirming"
            @click="confirmCashPayment"
            >Confirm</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
