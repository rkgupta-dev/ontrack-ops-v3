<script setup>
import { onMounted, ref } from 'vue'
import * as extensionsApi from '../../../services/bookings/extensions.api'
import { formatFullDate } from '../../../utils/date'
import { formatCurrency } from '../../../utils/currency'
import EmptyState from '../../common/EmptyState.vue'

const props = defineProps({
  bookingId: { type: [String, Number], required: true },
})

const headers = [
  { title: 'Booking ID', key: 'bookingId' },
  { title: 'Extend ID', key: 'extendId' },
  { title: 'Amount', key: 'amount' },
  { title: 'Payment ID', key: 'paymentId' },
  { title: 'Status', key: 'paymentStatus' },
  { title: 'New End Date', key: 'newEndDate' },
  { title: 'Created At', key: 'createdAt' },
]

const rows = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)

const detailDialog = ref(false)
const detailLoading = ref(false)
const detail = ref(null)

async function load() {
  loading.value = true
  try {
    const result = await extensionsApi.fetchExtensions({
      bookingId: props.bookingId,
      page: page.value,
    })
    rows.value = [...rows.value, ...result.rows]
    total.value = result.total
    page.value += 1
  } catch {
    // leave rows as-is — an empty/failed page still renders the empty state
  } finally {
    loading.value = false
  }
}

async function openDetail(row) {
  detailDialog.value = true
  detailLoading.value = true
  detail.value = null
  try {
    detail.value = await extensionsApi.fetchExtensionDetail(row.extendId)
  } catch {
    detail.value = null
  } finally {
    detailLoading.value = false
  }
}

onMounted(() => {
  page.value = 1
  rows.value = []
  load()
})
</script>

<template>
  <v-card>
    <v-data-table
      :headers="headers"
      :items="rows"
      :loading="loading"
      hide-default-footer
      class="single-line-table"
      @click:row="(_, { item }) => openDetail(item)"
    >
      <template #[`item.amount`]="{ item }">
        <span class="text-no-wrap">{{ formatCurrency(item.amount) }}</span>
      </template>
      <template #[`item.paymentStatus`]="{ item }">
        <v-chip
          size="small"
          :color="item.paymentStatus === 1 ? 'success' : 'error'"
          variant="tonal"
          class="font-weight-medium"
        >
          {{ item.paymentStatus === 1 ? 'Paid' : 'Pending' }}
        </v-chip>
      </template>
      <template #[`item.createdAt`]="{ item }">
        <span class="text-no-wrap">{{ formatFullDate(item.createdAt) }}</span>
      </template>
      <template #no-data>
        <EmptyState icon="mdi-calendar-plus-outline" title="No entries found" />
      </template>
    </v-data-table>

    <div v-if="total > rows.length" class="text-center my-3">
      <v-btn variant="text" color="primary" :loading="loading" @click="load">Load More</v-btn>
    </div>

    <v-dialog v-model="detailDialog" max-width="560">
      <v-card title="Extension Details">
        <v-card-text>
          <div v-if="detailLoading" class="d-flex justify-center py-6">
            <v-progress-circular indeterminate color="primary" />
          </div>
          <EmptyState
            v-else-if="!detail"
            icon="mdi-file-search-outline"
            title="No details found."
          />
          <div v-else>
            <div class="d-flex justify-space-between py-1">
              <span>Extension ID</span><span>{{ detail.extendId }}</span>
            </div>
            <div class="d-flex justify-space-between py-1">
              <span>Booking ID</span><span>{{ detail.bookingId }}</span>
            </div>
            <div class="d-flex justify-space-between py-1">
              <span>No. of Days</span><span>{{ detail.noOfDays }}</span>
            </div>
            <div class="d-flex justify-space-between py-1">
              <span>Amount</span><span>{{ formatCurrency(detail.amount) }}</span>
            </div>
            <div class="d-flex justify-space-between py-1">
              <span>Current End Date</span><span>{{ detail.currentEndDate }}</span>
            </div>
            <div class="d-flex justify-space-between py-1">
              <span>New End Date</span><span>{{ detail.newEndDate }}</span>
            </div>
            <div class="d-flex justify-space-between py-1">
              <span>Payment Status</span>
              <span :class="detail.paymentStatus === 1 ? 'text-success' : 'text-error'">
                {{ detail.paymentStatus === 1 ? 'Paid' : 'Pending' }}
              </span>
            </div>
            <div class="d-flex justify-space-between py-1">
              <span>Penalty Charge</span><span>{{ detail.penaltyCharge }}</span>
            </div>
            <div class="d-flex justify-space-between py-1">
              <span>Adjusted Discount</span><span>{{ detail.adjustedDiscount }}</span>
            </div>
            <div class="d-flex justify-space-between py-1">
              <span>Coupon Discount</span><span>{{ detail.couponDiscount }}</span>
            </div>
            <div class="d-flex justify-space-between py-1">
              <span>Points Used</span><span>{{ detail.pointsUtilized }}</span>
            </div>
            <div class="d-flex justify-space-between py-1">
              <span>Comment</span><span>{{ detail.comment }}</span>
            </div>

            <template v-if="detail.paymentLinkData">
              <v-divider class="my-3" />
              <div class="text-subtitle-2 mb-1">Payment Link Info</div>
              <div class="d-flex justify-space-between py-1">
                <span>Link</span>
                <a :href="detail.paymentLinkData.link" target="_blank">{{
                  detail.paymentLinkData.link
                }}</a>
              </div>
              <div class="d-flex justify-space-between py-1">
                <span>Status</span><span>{{ detail.paymentLinkData.status }}</span>
              </div>
              <div class="d-flex justify-space-between py-1">
                <span>Expires On</span
                ><span>{{ formatFullDate(detail.paymentLinkData.expiresOn) }}</span>
              </div>
              <div class="d-flex justify-space-between py-1">
                <span>Email Sent</span
                ><span>{{ detail.paymentLinkData.emailSent ? 'Yes' : 'No' }}</span>
              </div>
            </template>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="detailDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<style scoped>
/* Forces headers to be bold and on a single line */
:deep(.single-line-table th) {
  font-weight: 700 !important;
  white-space: nowrap !important;
}

/* Prevents table cells from wrapping into multiple lines */
:deep(.single-line-table td) {
  white-space: nowrap !important;
}

/* Optional: changes cursor to pointer on hover since rows are clickable */
:deep(.single-line-table tbody tr) {
  cursor: pointer;
}
</style>
