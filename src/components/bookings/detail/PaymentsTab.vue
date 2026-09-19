<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import * as collectionsApi from '../../../services/bookings/collections.api'
import { useUiStore } from '../../../stores/ui.store'
import { toUserMessage } from '../../../utils/errorMessage'
import { formatCurrency } from '../../../utils/currency'
import { formatFullDate, toPaymentReceivedOn } from '../../../utils/date'
import EmptyState from '../../common/EmptyState.vue'

const props = defineProps({
  bookingId: { type: [String, Number], required: true },
})

const uiStore = useUiStore()

const rows = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const statusFilter = ref(null)
const totalCreditAmount = ref(0)
const totalDebitAmount = ref(0)
const lifetimeValue = ref(0)

const STATUS_OPTIONS = [
  { title: 'All', value: null },
  { title: 'Paid', value: 1 },
  { title: 'Unpaid', value: 0 },
]
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
const SERVICE_OPTIONS = [
  { title: 'Booking', value: 'booking' },
  { title: 'Refund Issued', value: 'refund' },
  { title: 'Helmet Charge', value: 'helmet charge' },
  { title: 'Helmet Refund', value: 'helmet refund' },
  { title: 'Exchange', value: 'exchange' },
  { title: 'Extension', value: 'extend' },
  { title: 'Damage Fine', value: 'damage fine' },
  { title: 'Extra Kilometer Charge', value: 'extra kilometre' },
  { title: 'Engine Seizure Charge', value: 'engine seizure charge' },
  { title: 'Delay Fine', value: 'delay fine' },
  { title: 'Water Wash', value: 'water wash' },
  { title: 'Traffic Fine', value: 'traffic fine' },
  { title: 'Over Speeding Fine', value: 'over speeding fine' },
  { title: '2nd Servicing', value: 'second servicing' },
  { title: 'Pickup Charge', value: 'pickup charge' },
  { title: 'Delivery Charge', value: 'delivery charge' },
  { title: 'Others', value: 'extra' },
]

async function load(reset = false) {
  if (loading.value) return
  loading.value = true
  if (reset) {
    page.value = 1
    rows.value = []
  }
  try {
    const result = await collectionsApi.fetchCollections({
      bookingId: props.bookingId,
      page: page.value,
      paymentStatus: statusFilter.value,
    })
    rows.value = [...rows.value, ...result.rows]
    total.value = result.total
    totalCreditAmount.value = result.totalCreditAmount
    totalDebitAmount.value = result.totalDebitAmount
    lifetimeValue.value = result.lifetimeValue
    page.value += 1
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not load payment history.'), { type: 'error' })
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (rows.value.length >= total.value) return
  load()
}

function onStatusFilterChange() {
  load(true)
}

// Add-collection dialog
const addDialog = ref(false)
const adding = ref(false)
function nowIsoParts() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  }
}

function blankAddForm() {
  const now = nowIsoParts()
  return {
    transactionType: 'credit',
    service: null,
    amount: '',
    refundedAmount: '',
    source: '',
    paymentId: '',
    refundId: '',
    paymentStatus: 1,
    comment: '',
    paymentReceivedDate: now.date,
    paymentReceivedTime: now.time,
  }
}
const addForm = ref(blankAddForm())

const addFormValid = computed(() => {
  const f = addForm.value
  if (!f.service || !f.source) return false
  return f.transactionType === 'credit' ? Boolean(f.amount) : Boolean(f.refundedAmount)
})

function openAddDialog() {
  addForm.value = blankAddForm()
  addDialog.value = true
}

// Ported from the old app's collectionList.vue: cash/points/TOA sources
// have no real gateway payment id, so one is synthesized.
watch(
  () => addForm.value.source,
  (value) => {
    addForm.value.paymentId = ['cash', 'points', 'toa'].includes(value) ? `${Date.now()}` : ''
  },
)

async function addCollection() {
  adding.value = true
  const f = addForm.value
  try {
    await collectionsApi.addCollection(props.bookingId, {
      amount: Math.abs(Number(f.amount) || 0),
      source: f.source,
      paymentStatus: f.paymentStatus,
      comment: `Add Collection - ${f.comment ?? ''}`,
      service: f.service,
      paymentId: f.paymentId,
      refundId: f.refundId,
      refundedAmount: f.transactionType === 'credit' ? 0 : Math.abs(Number(f.refundedAmount) || 0),
      transactionType: f.transactionType,
      paymentReceivedOn: toPaymentReceivedOn(f.paymentReceivedDate, f.paymentReceivedTime),
    })
    addDialog.value = false
    uiStore.notify('Collection data added.', { type: 'success' })
    await load(true)
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not add the collection.'), { type: 'error' })
  } finally {
    adding.value = false
  }
}

// View-collection dialog
const viewDialog = ref(false)
const selected = ref(null)
function openView(row) {
  selected.value = row
  viewDialog.value = true
}

// Lifetime-value dialog
const ltvDialog = ref(false)

onMounted(() => load(true))
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-4">
      <div class="text-caption text-medium-emphasis">{{ rows.length }} / {{ total }} entries</div>
      <div class="d-flex align-center ga-2">
        <v-select
          v-model="statusFilter"
          :items="STATUS_OPTIONS"
          density="compact"
          variant="outlined"
          rounded="lg"
          hide-details
          style="max-width: 140px"
          @update:model-value="onStatusFilterChange"
        />
        <v-btn variant="tonal" rounded="lg" color="success" @click="ltvDialog = true">
          LTV {{ formatCurrency(Math.round(lifetimeValue)) }}
        </v-btn>
        <v-btn variant="tonal" rounded="lg" color="primary" @click="openAddDialog"
          >+ Add Collection</v-btn
        >
      </div>
    </div>

    <v-card
      v-for="(c, index) in rows"
      :key="index"
      class="mb-3 pa-4"
      :style="{
        borderColor:
          c.transactionType === 'CREDIT'
            ? 'rgb(var(--v-theme-success))'
            : 'rgb(var(--v-theme-error))',
      }"
      link
      @click="openView(c)"
    >
      <div class="d-flex justify-space-between align-center mb-2">
        <div class="d-flex ga-2">
          <v-chip
            size="small"
            :color="c.transactionType?.toLowerCase() === 'debit' ? 'error' : 'success'"
            variant="tonal"
          >
            {{ c.transactionType }}
          </v-chip>
          <v-chip size="small" :color="c.paymentStatus ? 'success' : 'error'" variant="tonal">
            {{ c.paymentStatus ? 'Paid' : 'Not Paid / Failed' }}
          </v-chip>
        </div>
        <v-btn
          v-if="
            (c.amount > 0 && c.transactionType?.toLowerCase() === 'credit') ||
            (c.refundedAmount > 0 && c.transactionType?.toLowerCase() === 'debit')
          "
          rounded="lg"
          variant="tonal"
          color="primary"
          :disabled="!c.paymentStatus"
          :href="`https://glacier.on-track.in/api/collection/payment-receipt/${c.id}`"
          target="_blank"
          @click.stop
        >
          Receipt
        </v-btn>
      </div>
      <div class="d-flex justify-space-between mb-2">
        <span class="text-caption text-medium-emphasis">{{ formatFullDate(c.createdAt) }}</span>
        <v-chip size="small" color="warning" variant="tonal">{{ c.type }}</v-chip>
      </div>
      <div
        class="text-h6"
        :class="c.transactionType?.toLowerCase() === 'debit' ? 'text-error' : 'text-success'"
      >
        {{
          formatCurrency(
            c.transactionType?.toLowerCase() === 'credit' ? c.amount : c.refundedAmount,
          )
        }}
      </div>
      <div v-if="c.paymentStatus == 1" class="text-caption text-medium-emphasis">
        Paid by <strong>{{ c.source ?? 'N/A' }}</strong>
      </div>
      <div class="text-caption text-medium-emphasis mt-1">{{ c.comment }}</div>
    </v-card>

    <EmptyState
      v-if="rows.length === 0 && !loading"
      icon="mdi-cash-multiple"
      title="No entries found"
    />

    <div v-if="total > rows.length" class="text-center mt-2">
      <v-btn variant="text" color="primary" :loading="loading" @click="loadMore">Load More</v-btn>
    </div>

    <v-dialog v-model="addDialog" max-width="560">
      <v-card title="Add Payment">
        <v-card-text>
          <v-row>
            <v-col cols="6">
              <v-select
                v-model="addForm.transactionType"
                label="Type *"
                :items="[
                  { title: 'Received from Customer', value: 'credit' },
                  { title: 'Paid to Customer', value: 'debit' },
                ]"
                variant="outlined"
                rounded="lg"
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="addForm.service"
                label="Service *"
                :items="SERVICE_OPTIONS"
                variant="outlined"
                rounded="lg"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-if="addForm.transactionType === 'debit'"
                v-model="addForm.refundedAmount"
                type="number"
                label="Refunded Amount"
                variant="outlined"
                rounded="lg"
              />
              <v-text-field
                v-else
                v-model="addForm.amount"
                type="number"
                label="Received Amount"
                variant="outlined"
                rounded="lg"
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="addForm.source"
                label="Source *"
                :items="SOURCE_OPTIONS"
                variant="outlined"
                rounded="lg"
              />
            </v-col>
            <v-col v-if="addForm.transactionType === 'credit'" cols="6">
              <v-text-field
                v-model="addForm.paymentId"
                label="Payment ID"
                variant="outlined"
                rounded="lg"
              />
            </v-col>
            <v-col v-else cols="6">
              <v-text-field
                v-model="addForm.refundId"
                label="Refund ID"
                rounded="lg"
                variant="outlined"
              />
            </v-col>
            <v-col cols="8">
              <v-text-field
                v-model="addForm.paymentReceivedDate"
                type="date"
                label="Payment Date *"
                rounded="lg"
                variant="outlined"
              />
            </v-col>
            <v-col cols="4">
              <v-text-field
                v-model="addForm.paymentReceivedTime"
                type="time"
                label="Payment Time *"
                rounded="lg"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="addForm.comment"
                label="Comment"
                rows="2"
                rounded="lg"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12">
              <v-checkbox
                v-model="addForm.paymentStatus"
                :true-value="1"
                :false-value="0"
                label="Paid"
                density="compact"
                hide-details
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="addDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="adding" :disabled="!addFormValid" @click="addCollection">
            Add Collection
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="viewDialog" max-width="640">
      <v-card title="Collection View">
        <v-card-text v-if="selected">
          <v-row dense>
            <v-col cols="6"><strong>Id</strong>: {{ selected.id }}</v-col>
            <v-col cols="6"><strong>Booking ID</strong>: {{ selected.bookingId }}</v-col>
            <v-col cols="6"><strong>No of Days</strong>: {{ selected.noOfDays }}</v-col>
            <v-col cols="6"><strong>Amount</strong>: {{ selected.amount }}</v-col>
            <v-col cols="6"><strong>Payment Gateway</strong>: {{ selected.paymentGateway }}</v-col>
            <v-col cols="6"><strong>Type</strong>: {{ selected.type }}</v-col>
            <v-col cols="6"><strong>Status</strong>: {{ selected.status ?? '-' }}</v-col>
            <v-col cols="6"><strong>Service</strong>: {{ selected.service ?? '-' }}</v-col>
            <v-col cols="6"><strong>Payment Id</strong>: {{ selected.paymentId ?? '-' }}</v-col>
            <v-col cols="6"><strong>Customer Id</strong>: {{ selected.customer }}</v-col>
            <v-col cols="6"><strong>Source</strong>: {{ selected.source }}</v-col>
            <v-col cols="6"
              ><strong>Transaction Type</strong>: {{ selected.transactionType }}</v-col
            >
            <v-col cols="6"
              ><strong>Payment Status</strong>:
              {{ selected.paymentStatus ? 'Paid' : 'Not Paid' }}</v-col
            >
            <v-col cols="6"
              ><strong>Refunded Amount</strong>: {{ selected.refundedAmount ?? '-' }}</v-col
            >
            <v-col cols="6"><strong>Refund Id</strong>: {{ selected.refundId ?? '-' }}</v-col>
            <v-col cols="12"><v-divider class="my-2" /></v-col>
            <v-col v-if="selected.collectionExchangeHistory" cols="12" class="text-info">
              Exchanged with
              {{ selected.collectionExchangeHistory.newVehicleData?.registrationNumber }}
            </v-col>
            <v-col cols="12"
              ><strong>Payment Received Date:</strong>
              {{ selected.paymentReceivedDate ?? '-' }}</v-col
            >
            <v-col cols="12"><strong>Reason:</strong> {{ selected.reason ?? '-' }}</v-col>
            <v-col cols="12"><strong>Comment:</strong> {{ selected.comment ?? '-' }}</v-col>
            <v-col cols="12"
              ><strong>Created At:</strong> {{ formatFullDate(selected.createdAt) }}</v-col
            >
            <v-col cols="12"
              ><strong>Updated At:</strong> {{ formatFullDate(selected.updatedAt) }}</v-col
            >
            <v-col cols="12"
              ><strong>Agent Name:</strong> {{ selected.agentData?.name ?? '-' }}</v-col
            >
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="viewDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="ltvDialog" max-width="480">
      <v-card title="Lifetime Value">
        <v-card-text>
          <v-row>
            <v-col cols="6">
              <v-card variant="outlined" class="pa-4">
                <div class="text-success font-weight-medium mb-2">Credits</div>
                <div class="d-flex justify-space-between">
                  <span class="text-medium-emphasis">Total Credits:</span>
                  <strong>{{ formatCurrency(totalCreditAmount) }}</strong>
                </div>
              </v-card>
            </v-col>
            <v-col cols="6">
              <v-card variant="outlined" class="pa-4">
                <div class="text-error font-weight-medium mb-2">Debits</div>
                <div class="d-flex justify-space-between">
                  <span class="text-medium-emphasis">Total Debits:</span>
                  <strong>{{ formatCurrency(totalDebitAmount) }}</strong>
                </div>
              </v-card>
            </v-col>
          </v-row>
          <v-divider class="my-3" />
          <div class="d-flex justify-space-between align-center">
            <span class="text-medium-emphasis">Net Lifetime Value:</span>
            <span
              :class="lifetimeValue >= 0 ? 'text-success' : 'text-error'"
              class="text-h6 font-weight-bold"
            >
              {{ formatCurrency(lifetimeValue) }}
            </span>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="ltvDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
