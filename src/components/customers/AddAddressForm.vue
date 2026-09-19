<script setup>
import { ref } from 'vue'
import * as customerDetailApi from '../../services/customers/customerDetail.api'
import { toUserMessage } from '../../utils/errorMessage'

const props = defineProps({
  customerId: { type: [String, Number], required: true },
})
const emit = defineEmits(['added'])

const form = ref({
  addLine1: '',
  addLine2: '',
  pincode: null,
  district: '',
  city: '',
  contactNumber: '',
  contactName: '',
  alternateNo: '',
})
const errorMessage = ref('')
const submitting = ref(false)

async function onSubmit() {
  submitting.value = true
  errorMessage.value = ''
  try {
    const data = await customerDetailApi.addCustomerAddress(props.customerId, form.value)
    emit('added', data)
  } catch (error) {
    errorMessage.value = toUserMessage(error)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <v-form @submit.prevent="onSubmit">
    <v-row>
      <v-col cols="12"
        ><v-text-field v-model="form.addLine1" label="Address Line 1" required
      /></v-col>
      <v-col cols="12"
        ><v-text-field v-model="form.addLine2" label="Address Line 2" required
      /></v-col>
      <v-col cols="6"
        ><v-text-field v-model="form.pincode" type="number" label="Pincode" required
      /></v-col>
      <v-col cols="6"><v-text-field v-model="form.district" label="District" /></v-col>
      <v-col cols="6"><v-text-field v-model="form.city" label="City" required /></v-col>
      <v-col cols="6"
        ><v-text-field v-model="form.contactNumber" label="Contact Number" required
      /></v-col>
      <v-col cols="6"
        ><v-text-field v-model="form.contactName" label="Contact Name" required
      /></v-col>
      <v-col cols="6"><v-text-field v-model="form.alternateNo" label="Alternate Number" /></v-col>
    </v-row>

    <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mb-2">
      {{ errorMessage }}
    </v-alert>

    <v-btn block type="submit" color="primary" :loading="submitting">Submit</v-btn>
  </v-form>
</template>
