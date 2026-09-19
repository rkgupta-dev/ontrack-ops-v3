<script setup>
import { formatCurrency } from '../../../utils/currency'

defineProps({
  booking: { type: Object, required: true },
})

defineEmits(['edit-delivery', 'view-documents', 'adjust-penalty'])

function paymentIdOf(b) {
  return b.razorpay_payment_id || b.paymentId || b.other_payment_id || '-'
}
</script>

<template>
  <div>
    <v-alert
      v-if="booking.customerData?.penaltyCharge > 0"
      type="info"
      variant="tonal"
      class="mb-4"
      :icon="false"
      rounded="lg"
    >
      <div class="d-flex align-center justify-space-between flex-wrap ga-2">
        <span>
          Customer has a penalty of {{ formatCurrency(booking.customerData.penaltyCharge) }}
        </span>
        <v-btn
          size="small"
          rounded="lg"
          variant="flat"
          color="warning"
          @click="$emit('adjust-penalty')"
          >Adjust</v-btn
        >
      </div>
    </v-alert>

    <div class="mb-4">
      <div v-if="booking.customerData?.blacklist" class="text-error d-flex align-center mb-1">
        <v-icon icon="mdi-alert" size="small" class="mr-2" />
        Blacklisted Customer
      </div>
      <div v-if="booking.customerData?.absconding" class="text-error d-flex align-center">
        <v-icon icon="mdi-alert" size="small" class="mr-2" />
        The customer is marked as 'absconding'
      </div>
      <div v-if="booking.bookingEndComment" class="text-body-2 mt-1">
        {{ booking.bookingEndComment }}
      </div>
    </div>

    <div class="mb-4">
      <h3 class="text-h6 font-weight-medium">
        {{ booking.customerData?.fName }} {{ booking.customerData?.lName }}
      </h3>
      <div class="d-flex ga-3 text-body-2 mt-1">
        <a v-if="booking.customerData?.mobile" :href="`tel:${booking.customerData.mobile}`">
          {{ booking.customerData.mobile }}
        </a>
        <span v-if="booking.customerData?.mobile && booking.customerData?.email">~</span>
        <a v-if="booking.customerData?.email" :href="`mailto:${booking.customerData.email}`">
          {{ booking.customerData.email }}
        </a>
      </div>
    </div>

    <div class="mb-4">
      <div class="text-caption text-medium-emphasis">Booking Amount</div>
      <div class="d-flex align-center ga-2">
        <span class="text-h6">{{ formatCurrency(booking.amount) }}</span>
        <v-chip v-if="booking.paymentStatus === 1" size="small" color="success" variant="tonal">
          Paid
        </v-chip>
      </div>
      <div class="text-body-2 text-medium-emphasis">
        Order ID: {{ booking.razorpay_order_id ?? '-' }}
      </div>
      <div class="text-body-2 text-medium-emphasis">Payment ID: {{ paymentIdOf(booking) }}</div>
      <div class="text-body-2 text-medium-emphasis">
        Payment Gateway: {{ booking.paymentGateway ?? 'unknown' }}
      </div>

      <div class="d-flex align-center ga-2 mt-2">
        <span class="text-body-2">Delivery Type:</span>
        <v-chip
          size="small"
          :color="booking.deliveryType === 1 ? 'error' : 'success'"
          variant="tonal"
        >
          {{ booking.deliveryType === 1 ? 'Delivery' : 'Pickup' }}
        </v-chip>
        <v-btn icon="mdi-pencil" size="x-small" variant="text" @click="$emit('edit-delivery')" />
      </div>
      <div class="text-body-2 mt-1">
        <span class="text-medium-emphasis">
          {{ booking.deliveryType === 1 ? 'Delivery Address:' : 'Pickup Address:' }}
        </span>
        {{
          booking.deliveryType === 1
            ? booking.deliveryAddress
            : (booking.locationData?.name ?? 'N/A')
        }}
      </div>
    </div>

    <v-btn variant="text" color="primary" class="mb-4 pl-0" @click="$emit('view-documents')">
      View Documents
    </v-btn>

    <v-divider class="mb-4" />

    <div class="text-caption text-medium-emphasis mb-2">Payment Details</div>
    <div class="d-flex justify-space-between py-1">
      <span>Helmet Charge</span>
      <span
        >{{ booking.extraHelmet ? 'yes' : 'no' }} ({{ formatCurrency(booking.helmetCharge) }})</span
      >
    </div>
    <div class="d-flex justify-space-between py-1">
      <span>Rental Charge</span>
      <span>{{ formatCurrency(booking.rentalCharge) }}</span>
    </div>
    <div class="d-flex justify-space-between py-1">
      <span>Discount</span>
      <span>{{ booking.discount || 0 }}</span>
    </div>
    <div class="d-flex justify-space-between py-1">
      <span>Delivery Charge</span>
      <span>{{ booking.deliveryCharge || 0 }}</span>
    </div>
    <div class="d-flex justify-space-between py-1">
      <span>Penalty Charge</span>
      <span>{{ booking.penaltyCharge || 0 }}</span>
    </div>
    <div class="d-flex justify-space-between py-1">
      <span>Coupon Used</span>
      <span>{{ booking.coupon ?? '-' }}</span>
    </div>
    <div class="d-flex justify-space-between py-1">
      <span>Points Used</span>
      <span>{{ booking.pointsUtilised ?? '-' }}</span>
    </div>
    <div class="d-flex justify-space-between py-1">
      <span>Adjusted Discount</span>
      <span class="text-success">- {{ booking.adjustedDiscount ?? '' }}</span>
    </div>
    <v-divider class="my-2" />
    <div class="d-flex justify-space-between py-1 font-weight-bold">
      <span>Amount Paid</span>
      <span>{{ formatCurrency(booking.amount) }}</span>
    </div>
    <v-divider class="my-2" />
    <div class="d-flex justify-space-between py-1">
      <span>Order ID</span>
      <span>{{ booking.razorpay_order_id ?? '-' }}</span>
    </div>
    <div class="d-flex justify-space-between py-1">
      <span>Payment ID</span>
      <span>{{ paymentIdOf(booking) }}</span>
    </div>
  </div>
</template>
