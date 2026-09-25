<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import { useUiStore } from '../../stores/ui.store'
import { toUserMessage } from '../../utils/errorMessage'
import {
  clearSavedCredentials,
  getSavedCredentials,
  setSavedCredentials,
} from '../../services/savedCredentials'

const { login } = useAuth()
const uiStore = useUiStore()
const router = useRouter()
const route = useRoute()

const form = ref(null)
const formValid = ref(false)
const employeeId = ref('')
const password = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const formError = ref('')
const saveForLater = ref(false)

onMounted(() => {
  const saved = getSavedCredentials()
  if (saved) {
    employeeId.value = saved.employeeId
    password.value = saved.password
    saveForLater.value = true
  }
})

const rules = {
  required: (label) => (value) => Boolean(value?.trim()) || `${label} is required.`,
}

async function handleSubmit() {
  const { valid } = await form.value.validate()
  if (!valid) return

  submitting.value = true
  formError.value = ''
  try {
    await login({ employeeId: employeeId.value.trim(), password: password.value })
    if (saveForLater.value) {
      setSavedCredentials(employeeId.value.trim(), password.value)
    } else {
      clearSavedCredentials()
    }
    uiStore.notify('Logged in successfully.', { type: 'success' })
    router.replace(route.query.redirect || { name: 'home' })
  } catch (error) {
    formError.value = toUserMessage(error, 'Invalid employee ID or password.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <v-card elevation="0" class="pa-2">
    <v-card-item class="text-center pt-6 mb-4">
      <v-avatar rounded="lg" color="primary" size="64" class="mb-4">
        <v-img src="/ontrack_logo.webp" alt="Ontrack Operations" cover />
      </v-avatar>
      <v-card-title class="text-h5 font-weight-bold">Ontrack Operations</v-card-title>
    </v-card-item>

    <v-card-text>
      <v-form ref="form" v-model="formValid" @submit.prevent="handleSubmit">
        <v-text-field
          v-model="employeeId"
          label="Employee ID"
          autocomplete="username"
          :rules="[rules.required('Employee ID')]"
          :disabled="submitting"
          autofocus
          class="mb-2"
        />
        <v-text-field
          v-model="password"
          label="Password"
          :type="showPassword ? 'text' : 'password'"
          :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
          autocomplete="current-password"
          :rules="[rules.required('Password')]"
          :disabled="submitting"
          hide-details
          class="mb-2"
          @click:append-inner="showPassword = !showPassword"
        />
        <v-checkbox v-model="saveForLater" hide-details :disabled="submitting" class="mb-1">
          <template #label>
            <span class="text-caption">Save employee ID & password for later</span>
          </template>
        </v-checkbox>
        <v-btn
          type="submit"
          color="primary"
          variant="flat"
          rounded="lg"
          block
          size="large"
          class="mt-2"
          :loading="submitting"
        >
          Sign in
        </v-btn>
      </v-form>

      <v-alert
        v-if="formError"
        type="error"
        variant="tonal"
        density="comfortable"
        class="mt-4"
        closable
        @click:close="formError = ''"
      >
        {{ formError }}
      </v-alert>
    </v-card-text>
  </v-card>
</template>
