<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as extendApi from '../../services/bookings/extendBooking.api'
import { formatCurrency } from '../../utils/currency'
import { formatFullDate } from '../../utils/date'
import BookingStatusBadge from '../../components/bookings/BookingStatusBadge.vue'

const route = useRoute()
const router = useRouter()
const bookingId = route.params.bookingId

const loading = ref(true)
const errorMessage = ref('')
const feedbackMessage = ref('')
const calculatedOn = ref('')

const responseData = ref(null)
const extendResponse = ref(null)

const daysToExtend = ref(4)
const extendForMonth = ref(false)
const adjustedDiscount = ref(0)
const maxDiscount = ref(500)
const minDaysToExtend = ref(1)

const overdueWarning = computed(() => {
  const r = extendResponse.value
  return r && r.minDaysToExtend > 1 && r.minDaysToExtend <= 30
})
const overdueBlocked = computed(() => extendResponse.value?.minDaysToExtend > 30)

const summaryRows = computed(() => {
  const r = extendResponse.value
  if (!r) return []
  return [
    { label: 'Extend For', value: `${r.days} days` },
    { label: 'Rental Amount', value: formatCurrency(r.rentalAmountBeforeSurge) },
    { label: 'Surge Charge', value: formatCurrency(r.surgeCharge) },
    { label: 'Penalty', value: formatCurrency(r.penalty), color: 'text-error' },
    { label: 'Discount', value: formatCurrency(r.adjustedDiscount), color: 'text-success' },
  ]
})

async function calculatePayment() {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await extendApi.calculateExtend({
      bookingId,
      days: extendForMonth.value ? 30 : daysToExtend.value,
      extendForMonth: extendForMonth.value,
      adjustedDiscount: adjustedDiscount.value,
    })
    extendResponse.value = data
    maxDiscount.value = Math.max(500, data.totalAmount / 50)
    minDaysToExtend.value = data.minDaysToExtend
    if (minDaysToExtend.value > daysToExtend.value) {
      daysToExtend.value = minDaysToExtend.value
    }
    calculatedOn.value = formatFullDate(new Date().toISOString())
    if (data.minDaysToExtend > 15) {
      extendForMonth.value = true
    }
  } catch (error) {
    errorMessage.value = error.response?.data?.message ?? 'Failed to calculate the extension.'
  } finally {
    loading.value = false
  }
}

async function searchBooking() {
  loading.value = true
  try {
    const data = await extendApi.fetchExtendBookingSummary(bookingId)
    if (data) {
      responseData.value = data
      await calculatePayment()
    } else {
      responseData.value = null
      feedbackMessage.value = 'No bookings found'
      loading.value = false
    }
  } catch (error) {
    errorMessage.value = error.response?.data?.message ?? 'Failed to load this booking.'
    loading.value = false
  }
}

onMounted(searchBooking)

const creatingOrder = ref(false)
async function createOrder() {
  creatingOrder.value = true
  try {
    const data = await extendApi.createExtendOrder(extendResponse.value)
    router.push({
      name: 'booking-extend-payment',
      params: { bookingId, extendId: data.extendId },
    })
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Something went wrong. Please try again.'
  } finally {
    creatingOrder.value = false
  }
}
</script>

<template>
  <div class="mx-auto" style="max-width: 960px">
    <div v-if="loading && !extendResponse" class="d-flex justify-center py-10">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-alert v-else-if="feedbackMessage" type="info" variant="tonal" rounded="lg" class="mb-4">
      {{ feedbackMessage }}
    </v-alert>

    <template v-if="extendResponse">
      <v-alert v-if="overdueWarning" type="warning" variant="tonal" rounded="lg" class="mb-4">
        Booking is overdue by {{ extendResponse.minDaysToExtend - 1 }} days, a minimum
        {{ extendResponse.minDaysToExtend > 15 ? 30 : extendResponse.minDaysToExtend }} days should
        be extended.
      </v-alert>
      <v-alert v-if="overdueBlocked" type="error" variant="tonal" rounded="lg" class="mb-4">
        This booking has been overdue for more than 30 days, so a standard extension is not
        feasible. Please escalate this matter to upper-level management for further attention.
      </v-alert>

      <v-row>
        <!-- Booking summary -->
        <v-col cols="12" md="5">
          <v-card v-if="responseData" variant="outlined" rounded="lg" class="pa-4">
            <div class="d-flex align-center justify-space-between ga-2 mb-3">
              <div class="text-subtitle-2 font-weight-bold">Booking</div>
              <BookingStatusBadge :status="responseData.status" />
            </div>

            <div class="text-caption text-medium-emphasis">Booking ID</div>
            <div class="text-body-2 mb-3 text-break">{{ bookingId }}</div>

            <div class="d-flex align-center ga-3 mb-3">
              <v-avatar color="primary" variant="tonal" rounded="lg">
                <v-img
                  v-if="responseData.modelData?.image"
                  :src="responseData.modelData.image"
                  :alt="responseData.modelData.name"
                  cover
                  height="30"
                />
                <v-icon v-else icon="mdi-motorbike" />
              </v-avatar>
              <div style="min-width: 0">
                <div v-if="responseData.vehicleData" class="font-weight-bold">
                  {{ responseData.vehicleData.registrationNumber }}
                </div>
                <div class="text-body-2 text-medium-emphasis text-truncate">
                  {{ responseData.modelData?.name }}
                </div>
              </div>
            </div>

            <v-divider class="mb-3" />

            <div class="d-flex align-center justify-space-between ga-2 text-body-2">
              <div>
                <div class="text-caption text-medium-emphasis">Start</div>
                <div class="font-weight-medium">{{ responseData.startDate }}</div>
              </div>
              <v-icon icon="mdi-arrow-right" size="18" class="text-medium-emphasis" />
              <div class="text-right">
                <div class="text-caption text-medium-emphasis">Current End</div>
                <div class="font-weight-medium">{{ responseData.endDate }}</div>
              </div>
            </div>

            <div class="text-caption text-medium-emphasis mt-4">
              Calculated on {{ calculatedOn }}
            </div>
          </v-card>
        </v-col>

        <!-- Extension calculator -->
        <v-col cols="12" md="7">
          <v-card variant="outlined" rounded="lg" :loading="loading">
            <div class="pa-4">
              <template v-if="responseData?.plan_type !== 'WEEKLY'">
                <div class="text-subtitle-2 font-weight-bold mb-2">Extend by</div>
                <v-switch
                  v-model="extendForMonth"
                  label="Extend for a month"
                  color="primary"
                  inset
                  :disabled="overdueBlocked"
                  density="compact"
                  hide-details
                  @update:model-value="calculatePayment"
                />

                <div class="d-flex align-center ga-3 my-2">
                  <v-divider />
                  <span class="text-caption text-medium-emphasis">or</span>
                  <v-divider />
                </div>

                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-body-2">Number of days</span>
                  <v-chip size="small" label :disabled="extendForMonth">
                    {{ daysToExtend }} day{{ daysToExtend > 1 ? 's' : '' }}
                  </v-chip>
                </div>
                <v-slider
                  v-model="daysToExtend"
                  :min="minDaysToExtend"
                  :max="15"
                  step="1"
                  color="primary"
                  thumb-label
                  hide-details
                  :disabled="extendForMonth || overdueBlocked"
                  @end="calculatePayment"
                />

                <v-card
                  variant="tonal"
                  color="primary"
                  rounded="lg"
                  class="d-flex align-center justify-space-between flex-wrap ga-2 pa-3 mt-3"
                >
                  <div class="d-flex align-center ga-2">
                    <v-icon icon="mdi-calendar-check" />
                    <span class="text-body-2">New End Date</span>
                  </div>
                  <span class="font-weight-bold">{{ extendResponse.newEndDate }}</span>
                </v-card>

                <v-divider class="my-4" />
              </template>

              <div class="d-flex align-center justify-space-between mb-1">
                <span class="text-subtitle-2 font-weight-bold">Adjust discount</span>
                <v-chip size="small" label color="success" variant="tonal">
                  {{ formatCurrency(adjustedDiscount) }}
                </v-chip>
              </div>
              <v-slider
                v-model="adjustedDiscount"
                :min="0"
                :max="maxDiscount"
                step="50"
                color="success"
                hide-details
                @update:model-value="calculatePayment"
              />
            </div>

            <v-divider />

            <div class="pa-4">
              <div
                v-for="row in summaryRows"
                :key="row.label"
                class="d-flex justify-space-between py-1 text-body-2"
                :class="row.color"
              >
                <span :class="{ 'text-medium-emphasis': !row.color }">{{ row.label }}</span>
                <span>{{ row.value }}</span>
              </div>

              <v-divider class="my-3" />

              <div class="d-flex align-center justify-space-between">
                <span class="text-body-2 font-weight-medium">Payable Amount</span>
                <span class="text-h5 font-weight-bold">
                  {{ formatCurrency(extendResponse.totalAmount) }}
                </span>
              </div>

              <v-btn
                block
                size="large"
                variant="flat"
                rounded="lg"
                color="primary"
                class="mt-4"
                :loading="creatingOrder"
                :disabled="loading || overdueBlocked"
                @click="createOrder"
              >
                Create Order
              </v-btn>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <v-alert v-if="errorMessage" type="error" variant="tonal" rounded="lg" class="mt-4">
      {{ errorMessage }}
    </v-alert>
  </div>
</template>
