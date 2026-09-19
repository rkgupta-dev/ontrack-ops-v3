<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import * as customersApi from '../../services/customers/customers.api'
import { useUiStore } from '../../stores/ui.store'
import { toUserMessage } from '../../utils/errorMessage'

const router = useRouter()
const uiStore = useUiStore()

const form = ref(null)
const formValid = ref(false)
const submitting = ref(false)

const fName = ref('')
const lName = ref('')
const mobile = ref('')
const alternateNo = ref('')
const email = ref('')
const gender = ref(null)
const state = ref('')
const city = ref('')
const pincode = ref('')
const address = ref('')

const rules = {
  required: (label) => (value) => Boolean(value?.trim()) || `${label} is required.`,
}

async function handleSubmit() {
  const { valid } = await form.value.validate()
  if (!valid) return

  submitting.value = true
  try {
    await customersApi.createCustomer({
      fName: fName.value.trim(),
      lName: lName.value.trim(),
      mobile: mobile.value.trim(),
      email: email.value.trim(),
      alternateNo: alternateNo.value.trim(),
      gender: gender.value,
      state: state.value.trim(),
      city: city.value.trim(),
      pincode: pincode.value.trim(),
      address: address.value.trim(),
    })
    uiStore.notify('Customer created successfully.', { type: 'success' })
    router.push({ name: 'customers' })
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not create customer.'), { type: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <v-card variant="outlined" rounded="lg" class="pa-4 pa-sm-6">
    <v-form ref="form" v-model="formValid" @submit.prevent="handleSubmit">
      <v-row>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="fName"
            label="First Name*"
            :rules="[rules.required('First name')]"
            :disabled="submitting"
            density="compact"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="lName"
            label="Last Name*"
            :rules="[rules.required('Last name')]"
            :disabled="submitting"
            density="compact"
          />
        </v-col>

        <v-col cols="12" sm="6">
          <v-text-field
            v-model="mobile"
            label="Mobile*"
            :rules="[rules.required('Mobile')]"
            :disabled="submitting"
            density="compact"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="alternateNo"
            label="Alternate No"
            :disabled="submitting"
            density="compact"
          />
        </v-col>

        <v-col cols="12" sm="6">
          <v-text-field
            v-model="email"
            label="Email*"
            :rules="[rules.required('Email')]"
            :disabled="submitting"
            density="compact"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <div class="text-body-2 mb-1">Gender</div>
          <v-radio-group
            v-model="gender"
            inline
            hide-details
            :disabled="submitting"
            density="compact"
          >
            <v-radio label="Male" value="male" />
            <v-radio label="Female" value="female" />
          </v-radio-group>
        </v-col>

        <v-col cols="12" sm="6">
          <v-text-field v-model="state" label="State" :disabled="submitting" density="compact" />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field v-model="city" label="City" :disabled="submitting" density="compact" />
        </v-col>

        <v-col cols="12" sm="6">
          <v-text-field
            v-model="pincode"
            label="Pincode"
            :disabled="submitting"
            density="compact"
          />
        </v-col>

        <v-col cols="12">
          <v-textarea
            v-model="address"
            label="Complete Address"
            rows="2"
            :disabled="submitting"
            density="compact"
            variant="outlined"
          />
        </v-col>
      </v-row>

      <div class="d-flex justify-end">
        <v-btn type="submit" color="primary" variant="flat" rounded="lg" :loading="submitting">
          Create Customer
        </v-btn>
      </div>
    </v-form>
  </v-card>
</template>
