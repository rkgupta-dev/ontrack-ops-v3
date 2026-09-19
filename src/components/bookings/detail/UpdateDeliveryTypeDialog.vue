<script setup>
import { computed, ref, watch } from 'vue'
import * as bookingDetailApi from '../../../services/bookings/bookingDetail.api'
import { useUiStore } from '../../../stores/ui.store'
import { toUserMessage } from '../../../utils/errorMessage'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  booking: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'updated'])

const uiStore = useUiStore()
const step = ref(1)
const loading = ref(false)
const saving = ref(false)
const pickupLocations = ref([])

const deliveryType = ref(0)
const pickUpLocation = ref(null)
const deliveryAddress = ref('')
const comment = ref('')

const transactionType = ref(null) // 'credit' | 'debit' | null
const service = ref(null)
const amount = ref(0)
const refundedAmount = ref(0)
const source = ref('razorpay')
const paymentId = ref('')
const refundId = ref('')
const paymentStatus = ref(1)

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
  { title: 'Pickup Charge', value: 'pickup charge' },
  { title: 'Delivery Charge', value: 'delivery charge' },
  { title: 'Others', value: 'extra' },
]

const isNextDisabled = computed(() => {
  if (deliveryType.value === 1) return !deliveryAddress.value?.trim()
  return !pickUpLocation.value
})

async function open() {
  if (!props.booking) return
  loading.value = true
  step.value = 1
  transactionType.value = null
  try {
    deliveryType.value = props.booking.deliveryType || 0
    pickUpLocation.value = props.booking.pickUpLocation || null
    deliveryAddress.value = props.booking.deliveryAddress || ''
    comment.value = props.booking.comment || ''
    pickupLocations.value = await bookingDetailApi.fetchModelLocations(props.booking.model)
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not load delivery details.'), { type: 'error' })
  } finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  (open_) => {
    if (open_) open()
  },
)

async function save() {
  saving.value = true
  try {
    const payment = transactionType.value
      ? {
          transactionType: transactionType.value,
          amount: amount.value,
          refundedAmount: refundedAmount.value,
          service: service.value,
          source: source.value,
          paymentStatus: paymentStatus.value,
          paymentId: transactionType.value === 'credit' ? paymentId.value : null,
          refundId: transactionType.value === 'debit' ? refundId.value : null,
          comment: comment.value || 'Add Collection',
        }
      : null

    const response = await bookingDetailApi.updateDeliveryType({
      bookingId: props.booking.bookingId,
      deliveryType: deliveryType.value,
      pickUpLocation: deliveryType.value === 0 ? pickUpLocation.value : null,
      deliveryAddress: deliveryType.value === 1 ? deliveryAddress.value : '',
      comment: comment.value || '',
      payment,
    })

    if (response.error === 0) {
      uiStore.notify('Booking updated successfully!', { type: 'success' })
      emit('updated')
      emit('update:modelValue', false)
    } else {
      uiStore.notify(response.message || 'Failed to update booking.', { type: 'error' })
    }
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Failed to update booking.'), { type: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="560"
    @update:model-value="(v) => $emit('update:modelValue', v)"
  >
    <v-card title="Update Delivery / Pickup">
      <v-card-text>
        <div v-if="loading" class="d-flex justify-center py-6">
          <v-progress-circular indeterminate color="primary" />
        </div>
        <template v-else>
          <div v-if="step === 1">
            <div class="text-subtitle-2 mb-2">Delivery Method</div>
            <v-radio-group v-model="deliveryType" inline>
              <v-radio label="Pickup" :value="0" />
              <v-radio label="Drop / Delivery" :value="1" />
            </v-radio-group>

            <v-textarea
              v-if="deliveryType === 1"
              v-model="deliveryAddress"
              label="Delivery Address"
              rows="3"
              variant="outlined"
              rounded="lg"
            />
            <div v-else>
              <div class="text-subtitle-2 mb-2">Select Pickup Location</div>
              <v-radio-group v-model="pickUpLocation">
                <v-radio v-for="loc in pickupLocations" :key="loc.id" :value="loc.id">
                  <template #label>
                    <div>
                      <div class="text-body-2">{{ loc.name }}</div>
                      <div class="text-caption text-medium-emphasis">{{ loc.address }}</div>
                    </div>
                  </template>
                </v-radio>
              </v-radio-group>
            </div>
          </div>

          <div v-else>
            <v-select
              v-model="transactionType"
              label="Transaction Type"
              :items="[
                { title: 'Received from Customer', value: 'credit' },
                { title: 'Paid to Customer', value: 'debit' },
                { title: 'Not Applicable', value: null },
              ]"
              variant="outlined"
              rounded="lg"
            />

            <template v-if="transactionType">
              <v-row>
                <v-col cols="6">
                  <v-select
                    v-model="service"
                    label="Service *"
                    :items="SERVICE_OPTIONS"
                    variant="outlined"
                    rounded="lg"
                  />
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    v-if="transactionType === 'debit'"
                    v-model.number="refundedAmount"
                    type="number"
                    label="Refunded Amount"
                    variant="outlined"
                    rounded="lg"
                  />
                  <v-text-field
                    v-else
                    v-model.number="amount"
                    type="number"
                    label="Received Amount"
                    variant="outlined"
                    rounded="lg"
                  />
                </v-col>
                <v-col cols="6">
                  <v-select
                    v-model="source"
                    label="Source *"
                    :items="SOURCE_OPTIONS"
                    variant="outlined"
                    rounded="lg"
                  />
                </v-col>
                <v-col v-if="transactionType === 'credit'" cols="6">
                  <v-text-field
                    v-model="paymentId"
                    label="Payment ID"
                    variant="outlined"
                    rounded="lg"
                  />
                </v-col>
                <v-col v-else cols="6">
                  <v-text-field
                    v-model="refundId"
                    label="Refund ID"
                    variant="outlined"
                    rounded="lg"
                  />
                </v-col>
              </v-row>
              <v-checkbox
                v-model="paymentStatus"
                :true-value="1"
                :false-value="0"
                label="Paid"
                density="compact"
                hide-details
              />
            </template>

            <v-textarea
              v-model="comment"
              label="Comment"
              rows="3"
              variant="outlined"
              class="mt-2"
              rounded="lg"
            />
          </div>
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn v-if="step === 2" variant="text" rounded="lg" @click="step = 1">Previous</v-btn>
        <v-btn
          v-if="step === 1"
          variant="flat"
          color="primary"
          :disabled="isNextDisabled"
          @click="step = 2"
          rounded="lg"
        >
          Next
        </v-btn>
        <v-btn v-else color="primary" variant="flat" rounded="lg" :loading="saving" @click="save"
          >Save Changes</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
