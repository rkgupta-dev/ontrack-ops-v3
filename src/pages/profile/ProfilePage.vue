<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import { useUiStore } from '../../stores/ui.store'
import { formatDateOnly } from '../../utils/date'
import AttendancePage from '../attendance/AttendancePage.vue'

const { user, logout } = useAuth()
const uiStore = useUiStore()
const router = useRouter()

const tab = ref('info')

const userDisplayName = computed(() => user.value?.name || user.value?.userName || 'Account')
const userRole = computed(() => user.value?.role || null)
const userInitial = computed(() => userDisplayName.value.trim().charAt(0).toUpperCase() || '?')
// A-019/A-020 — confirmed live response fields (2026-09-18).
const userAvatarUrl = computed(() => user.value?.displayPicture || null)
const dob = computed(() => formatDateOnly(user.value?.dob))
const agentSince = computed(() => formatDateOnly(user.value?.createdAt))

function handleLogout() {
  logout()
  uiStore.notify('You have been logged out.', { type: 'success' })
  router.push({ name: 'login' })
}
</script>

<template>
  <v-card
    variant="outlined"
    rounded="lg"
    class="pa-4 mb-6 d-flex align-center justify-space-between flex-wrap ga-4"
  >
    <div class="d-flex align-center ga-4">
      <v-avatar color="primary" size="56">
        <v-img v-if="userAvatarUrl" :src="userAvatarUrl" :alt="userDisplayName" cover />
        <span v-else class="text-h6 font-weight-bold text-white">{{ userInitial }}</span>
      </v-avatar>
      <div>
        <div class="text-h6 font-weight-bold">{{ userDisplayName }}</div>
        <div v-if="userRole" class="text-medium-emphasis text-uppercase">{{ userRole }}</div>
      </div>
    </div>
    <v-btn
      color="error"
      variant="flat"
      rounded="lg"
      data-testid="profile-logout-button"
      @click="handleLogout"
    >
      Logout
    </v-btn>
  </v-card>

  <v-tabs v-model="tab" color="primary">
    <v-tab value="info">Info</v-tab>
    <v-tab value="attendance">Attendance</v-tab>
  </v-tabs>
  <v-divider class="mb-6" />

  <v-window v-model="tab">
    <v-window-item value="info">
      <div class="d-flex flex-column ga-4">
        <div v-if="userRole"><span class="font-weight-medium">Role:</span> {{ userRole }}</div>
        <div v-if="user?.dob"><span class="font-weight-medium">Date of Birth:</span> {{ dob }}</div>
        <div v-if="user?.email">
          <span class="font-weight-medium">Email:</span> {{ user.email }}
        </div>
        <div v-if="user?.mobile">
          <span class="font-weight-medium">Mobile:</span> {{ user.mobile }}
        </div>
        <div v-if="user?.createdAt">
          <span class="font-weight-medium">Agent Since:</span> {{ agentSince }}
        </div>
      </div>
    </v-window-item>

    <v-window-item value="attendance">
      <AttendancePage />
    </v-window-item>
  </v-window>
</template>
