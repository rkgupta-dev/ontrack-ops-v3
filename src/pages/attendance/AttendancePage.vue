<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useAttendance } from '../../composables/useAttendance'
import { useUiStore } from '../../stores/ui.store'
import { toUserMessage } from '../../utils/errorMessage'
import { formatDateTime } from '../../utils/date'
import { getCurrentPosition } from '../../services/geolocation'
import { reverseGeocode } from '../../services/geocode'
import EmptyState from '../../components/common/EmptyState.vue'
import ConfirmDialog from '../../components/common/ConfirmDialog.vue'

const {
  loading,
  punching,
  error,
  status,
  punchInTime,
  punchOutTime,
  fetchToday,
  punchIn,
  punchOut,
} = useAttendance()
const uiStore = useUiStore()

const confirmPunchOutOpen = ref(false)

// Location is fetched up front (mirroring the old app's "Location
// Detected" step) so it's ready by the time the agent hits Clock In,
// rather than being captured silently at punch time.
const locationLoading = ref(true)
const locationDenied = ref(false)
const locationErrorMessage = ref('')
const locationAddress = ref('')
const coords = ref(null) // { lat, long }

async function fetchLocation() {
  locationLoading.value = true
  locationDenied.value = false
  locationErrorMessage.value = ''
  try {
    const { lat, long } = await getCurrentPosition()
    coords.value = { lat, long }
    locationAddress.value =
      (await reverseGeocode(lat, long)) || `${lat.toFixed(5)}, ${long.toFixed(5)}`
  } catch (err) {
    locationDenied.value = true
    locationErrorMessage.value = toUserMessage(err, 'Could not get your location.')
  } finally {
    locationLoading.value = false
  }
}

async function loadToday() {
  try {
    await fetchToday()
  } catch (err) {
    uiStore.notify(toUserMessage(err, 'Could not load today’s attendance.'), { type: 'error' })
  }
}

// Live "HH:MM:SS" ticker while punched in — re-evaluated every second
// against a plain timestamp ref rather than setting up a fresh interval
// per render.
const now = ref(Date.now())
let tickHandle = null

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

const liveDuration = computed(() => {
  if (!punchInTime.value) return '00:00:00'
  return formatDuration(now.value - new Date(punchInTime.value).getTime())
})

const finalDuration = computed(() => {
  if (!punchInTime.value || !punchOutTime.value) return '00:00:00'
  return formatDuration(
    new Date(punchOutTime.value).getTime() - new Date(punchInTime.value).getTime(),
  )
})

async function handlePunchIn() {
  try {
    await punchIn(coords.value ? { ...coords.value, place: locationAddress.value } : undefined)
    uiStore.notify('Punched in successfully.', { type: 'success' })
  } catch (err) {
    uiStore.notify(toUserMessage(err, 'Punch in failed. Please try again.'), { type: 'error' })
  }
}

async function handlePunchOutConfirmed() {
  try {
    await punchOut(coords.value ? { ...coords.value, place: locationAddress.value } : undefined)
    confirmPunchOutOpen.value = false
    uiStore.notify('Punched out successfully.', { type: 'success' })
  } catch (err) {
    confirmPunchOutOpen.value = false
    uiStore.notify(toUserMessage(err, 'Punch out failed. Please try again.'), { type: 'error' })
  }
}

onMounted(() => {
  loadToday()
  fetchLocation()
  tickHandle = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (tickHandle) clearInterval(tickHandle)
})
</script>

<template>
  <v-row justify="center">
    <v-col cols="12" sm="10" md="7" lg="5">
      <v-card elevation="0">
        <div v-if="loading" class="pa-6">
          <v-skeleton-loader type="list-item-avatar-two-line, actions" />
        </div>

        <EmptyState
          v-else-if="error"
          icon="mdi-alert-circle-outline"
          title="Couldn't load attendance"
          :message="toUserMessage(error)"
        >
          <v-btn class="mt-4" variant="tonal" color="primary" @click="loadToday">Retry</v-btn>
        </EmptyState>

        <v-card-text v-else class="py-6 text-center">
          <!-- Not punched in yet: show the location-detection step first -->
          <template v-if="status === 'not_punched_in' || status === 'unknown'">
            <div v-if="locationLoading" class="py-4">
              <v-progress-circular indeterminate color="primary" class="mb-3" />
              <div class="text-body-2 text-medium-emphasis">Loading your co-ordinates...</div>
            </div>

            <v-alert v-else-if="locationDenied" type="error" variant="tonal" class="text-start">
              The app does not have access to your location. Please enable location access to punch
              in.
              <div class="text-caption mt-2">Exact error: {{ locationErrorMessage }}</div>
              <v-btn class="mt-3" variant="tonal" color="primary" @click="fetchLocation">
                Try again
              </v-btn>
            </v-alert>

            <template v-else>
              <h3 class="text-h6 font-weight-bold mb-2">Location Detected</h3>
              <div class="text-body-1 mb-6">{{ locationAddress }}</div>
              <div class="d-flex justify-center ga-2">
                <v-btn variant="tonal" rounded="lg" :disabled="punching" @click="fetchLocation"
                  >Relocate</v-btn
                >
                <v-btn
                  color="primary"
                  variant="flat"
                  rounded="lg"
                  :loading="punching"
                  @click="handlePunchIn"
                >
                  Clock In
                </v-btn>
              </div>
            </template>
          </template>

          <!-- Punched in: live work-duration timer -->
          <template v-else-if="status === 'punched_in'">
            <h2 class="font-weight-bold mb-2">Work Duration</h2>
            <div class="text-h4 font-weight-bold mb-4">{{ liveDuration }}</div>
            <div class="text-body-1 mb-6">Logged in at: {{ formatDateTime(punchInTime) }}</div>
            <v-btn
              color="error"
              rounded="lg"
              variant="flat"
              prepend-icon="mdi-logout-variant"
              :loading="punching"
              @click="confirmPunchOutOpen = true"
            >
              Clock Out
            </v-btn>
          </template>

          <!-- Punched out: final work duration for the day -->
          <template v-else-if="status === 'punched_out'">
            <h2 class="font-weight-bold mb-2">Work Duration</h2>
            <div class="text-h4 font-weight-bold mb-4">{{ finalDuration }}</div>
            <div class="text-body-1">Logged in at: {{ formatDateTime(punchInTime) }}</div>
            <div class="text-body-1">End Time: {{ formatDateTime(punchOutTime) }}</div>
          </template>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>

  <ConfirmDialog
    v-model="confirmPunchOutOpen"
    title="Punch out?"
    message="This ends your shift for today."
    confirm-text="Punch Out"
    confirm-color="error"
    :loading="punching"
    @confirm="handlePunchOutConfirmed"
  />
</template>
