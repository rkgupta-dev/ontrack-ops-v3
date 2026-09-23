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
  <div style="max-width: 800px">
    <template v-if="extendResponse">
      <v-alert v-if="overdueWarning" type="warning" variant="tonal" class="mb-3">
        Booking is overdue by {{ extendResponse.minDaysToExtend - 1 }} days, a minimum
        {{ extendResponse.minDaysToExtend > 15 ? 30 : extendResponse.minDaysToExtend }} days should
        be extended.
      </v-alert>
      <v-alert v-if="overdueBlocked" type="error" variant="tonal" class="mb-3">
        This booking has been overdue for more than 30 days, so a standard extension is not
        feasible. Please escalate this matter to upper-level management for further attention.
      </v-alert>

      <v-row>
        <v-col cols="12" md="6">
          <div v-if="feedbackMessage">{{ feedbackMessage }}</div>
          <div v-if="loading" class="text-medium-emphasis">loading...</div>
          <div v-else class="text-caption text-medium-emphasis">
            Calculated on: {{ calculatedOn }}
          </div>

          <div v-if="responseData" class="mt-4">
            <div class="text-caption text-medium-emphasis mb-1">Booking Highlight</div>
            <BookingStatusBadge :status="responseData.status" />
            <div class="mt-1">{{ bookingId }}</div>
            <div v-if="responseData.vehicleData" class="font-weight-bold">
              {{ responseData.vehicleData.registrationNumber }}
            </div>
            <div class="text-medium-emphasis">{{ responseData.modelData?.name }}</div>
            <div class="mt-1">
              {{ responseData.startDate }} <span class="text-medium-emphasis">------</span>
              {{ responseData.endDate }}
            </div>
          </div>
        </v-col>

        <v-col cols="12" md="6">
          <v-card variant="outlined" class="pa-4">
            <template v-if="responseData?.plan_type !== 'WEEKLY'">
              <v-checkbox
                v-model="extendForMonth"
                label="Extend for a month"
                :disabled="overdueBlocked"
                density="compact"
                hide-details
                @update:model-value="calculatePayment"
              />
              <div class="text-center text-caption text-medium-emphasis my-1">------ or ------</div>
              <div class="text-center mb-1">
                Extend for {{ daysToExtend }} day{{ daysToExtend > 1 ? 's' : '' }}
              </div>
              <v-slider
                v-model="daysToExtend"
                :min="minDaysToExtend"
                :max="15"
                step="1"
                :disabled="extendForMonth || overdueBlocked"
                @end="calculatePayment"
              />
              <div class="text-center mb-2">
                <div class="text-caption text-medium-emphasis">New End Date</div>
                <div class="font-weight-bold">{{ extendResponse.newEndDate }}</div>
              </div>
              <v-divider class="mb-3" />
            </template>

            <div class="d-flex justify-space-between">
              <span>Adjust Discounts</span>
              <span>{{ adjustedDiscount }}</span>
            </div>
            <v-slider
              v-model="adjustedDiscount"
              :min="0"
              :max="maxDiscount"
              step="50"
              @update:model-value="calculatePayment"
            />
            <v-divider class="my-2" />

            <div class="d-flex justify-space-between py-1">
              <span>Extend For</span><span>{{ extendResponse.days }} days</span>
            </div>
            <div class="d-flex justify-space-between py-1">
              <span>Rental Amount</span
              ><span>{{ formatCurrency(extendResponse.rentalAmountBeforeSurge) }}</span>
            </div>
            <div class="d-flex justify-space-between py-1">
              <span>Surge Charge</span><span>{{ formatCurrency(extendResponse.surgeCharge) }}</span>
            </div>
            <div class="d-flex justify-space-between py-1 text-error">
              <span>Penalty</span><span>{{ formatCurrency(extendResponse.penalty) }}</span>
            </div>
            <div class="d-flex justify-space-between py-1 text-success">
              <span>Discount</span
              ><span>{{ formatCurrency(extendResponse.adjustedDiscount) }}</span>
            </div>
            <v-divider class="my-2" />
            <div class="d-flex justify-space-between py-1 font-weight-bold">
              <span>Payable Amount</span
              ><span>{{ formatCurrency(extendResponse.totalAmount) }}</span>
            </div>

            <v-btn
              block
              variant="flat"
              rounded="lg"
              color="primary"
              class="mt-4"
              :loading="creatingOrder"
              @click="createOrder"
            >
              Create Order
            </v-btn>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <v-alert v-if="errorMessage" type="error" variant="tonal" class="mt-3">{{
      errorMessage
    }}</v-alert>
  </div>
</template>
