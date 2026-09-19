<script setup>
import { onMounted, ref } from 'vue'
import * as paymentTicketsApi from '../../../services/bookings/paymentTickets.api'
import { useUiStore } from '../../../stores/ui.store'
import { toUserMessage } from '../../../utils/errorMessage'
import { formatCurrency } from '../../../utils/currency'
import { formatFullDate } from '../../../utils/date'
import EmptyState from '../../common/EmptyState.vue'

const props = defineProps({
  bookingId: { type: [String, Number], required: true },
})

const uiStore = useUiStore()
const tickets = ref([])
const loading = ref(true)
const createDialog = ref(false)
const creating = ref(false)
const form = ref({ amount: null, address: '', comment: '', allowPartial: false })

async function load() {
  loading.value = true
  try {
    tickets.value = await paymentTicketsApi.fetchPaymentTickets(props.bookingId)
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not load payment tickets.'), { type: 'error' })
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.value = { amount: null, address: '', comment: '', allowPartial: false }
  createDialog.value = true
}

async function createTicket() {
  creating.value = true
  try {
    await paymentTicketsApi.createPaymentTicket({ bookingId: props.bookingId, ...form.value })
    createDialog.value = false
    uiStore.notify('Payment ticket created.', { type: 'success' })
    await load()
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not create the ticket.'), { type: 'error' })
  } finally {
    creating.value = false
  }
}

onMounted(load)
</script>

<template>
  <v-card variant="outlined" class="pa-4">
    <div class="d-flex align-center justify-space-between mb-3">
      <span class="font-weight-medium">Payment Retrieval History</span>
      <v-btn rounded="lg" variant="tonal" color="primary" @click="openCreate">Create Ticket</v-btn>
    </div>

    <div v-if="loading" class="d-flex justify-center py-6">
      <v-progress-circular indeterminate color="primary" />
    </div>
    <template v-else>
      <v-card v-for="ticket in tickets" :key="ticket.id" variant="outlined" class="mb-3 pa-4">
        <div class="d-flex justify-space-between">
          <span>#{{ ticket.bookingId }}</span>
          <v-btn
            rounded="lg"
            variant="tonal"
            color="warning"
            :href="`https://on-track-salefunnel.firebaseapp.com/customers/payment/retrieval/view/${ticket.id}`"
            target="_blank"
          >
            Adjust
          </v-btn>
        </div>
        <div class="font-weight-bold mt-1">{{ formatCurrency(ticket.amount) }}</div>
        <div class="text-medium-emphasis">{{ ticket.comment }}</div>
        <div class="text-caption text-medium-emphasis">{{ formatFullDate(ticket.createdAt) }}</div>
      </v-card>
      <EmptyState v-if="tickets.length === 0" icon="mdi-ticket-outline" title="No records yet." />
    </template>

    <v-dialog v-model="createDialog" max-width="480">
      <v-card title="Create Payment Ticket">
        <v-card-text>
          <v-text-field v-model.number="form.amount" type="number" label="Amount" />
          <v-textarea v-model="form.address" label="Address" rows="2" />
          <v-textarea v-model="form.comment" label="Comment" rows="2" />
          <v-switch v-model="form.allowPartial" label="Allow Partial Payment" color="primary" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="createDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="creating"
            :disabled="!form.amount || !form.address || !form.comment"
            @click="createTicket"
          >
            Create Ticket
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>
