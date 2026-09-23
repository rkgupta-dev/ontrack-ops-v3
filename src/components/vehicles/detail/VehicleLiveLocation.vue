<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { fetchCurrentLocation } from '../../../services/vehicles/vehicleDetail.api'
import { loadGoogleMaps } from '../../../services/googleMapsLoader'
import { formatRelativeTime } from '../../../utils/date'

// Port of the old app's `components/vehicles/gpsTracker.vue` (A-072): a
// live map pin that re-polls on its own — every 2 minutes while the
// vehicle is STOPPED, every 20 seconds otherwise (same cadence as the old
// app). Fixes over the old component:
// - one timer only: "Refresh now" reschedules instead of starting a
//   second polling chain, and the timer is cleared on unmount;
// - the map can be panned freely (the old one snapped back to the pin on
//   every `center_changed`); it only re-centres when the position changes;
// - a failed poll retries on the slow interval instead of stopping for good.
const props = defineProps({
  registrationNumber: { type: String, required: true },
})

const STOPPED_INTERVAL = 120_000
const MOVING_INTERVAL = 20_000

const location = ref(null)
const loading = ref(false)
const loaded = ref(false) // at least one poll finished
const error = ref(null)
const nextRefreshAt = ref(null)
const mapsError = ref(null)

const mapEl = ref(null)
let mapsApi = null
let map = null
let marker = null
let timer = null
let requestSeq = 0

// Seconds matter on a 20-second refresh, so not utils/date's formatTime.
function formatClock(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const isStopped = computed(() => location.value?.movementStatus === 'STOPPED')

const directionsUrl = computed(() =>
  location.value
    ? `https://www.google.com/maps/dir/?api=1&destination=${location.value.lat},${location.value.lng}`
    : null,
)

function schedule(interval) {
  clearTimeout(timer)
  nextRefreshAt.value = new Date(Date.now() + interval)
  timer = setTimeout(poll, interval)
}

async function poll() {
  clearTimeout(timer)
  const seq = ++requestSeq
  loading.value = true
  try {
    const result = await fetchCurrentLocation(props.registrationNumber)
    if (seq !== requestSeq) return
    error.value = null
    location.value = result
    if (result) {
      schedule(result.movementStatus === 'STOPPED' ? STOPPED_INTERVAL : MOVING_INTERVAL)
    } else {
      // No tracking for this vehicle — nothing to keep polling for.
      nextRefreshAt.value = null
    }
  } catch (err) {
    if (seq !== requestSeq) return
    error.value = err
    schedule(STOPPED_INTERVAL)
  } finally {
    if (seq === requestSeq) {
      loading.value = false
      loaded.value = true
    }
  }
}

async function syncMap() {
  const position = location.value && { lat: location.value.lat, lng: location.value.lng }
  if (!position) {
    // The map element unmounts with the location; start fresh next time.
    marker?.setMap(null)
    map = marker = null
    return
  }
  if (mapsError.value) return
  await nextTick() // the map element only renders once there's a location
  if (!mapEl.value) return
  try {
    mapsApi ??= await loadGoogleMaps()
  } catch (err) {
    mapsError.value = err.message
    return
  }
  if (!map) {
    map = new mapsApi.Map(mapEl.value, {
      center: position,
      zoom: 15,
      streetViewControl: false,
      mapTypeControl: false,
    })
    marker = new mapsApi.Marker({ map, position, title: props.registrationNumber })
    return
  }
  const current = marker.getPosition()
  if (current?.lat() !== position.lat || current?.lng() !== position.lng) {
    marker.setPosition(position)
    map.panTo(position)
  }
}

watch(location, syncMap)

watch(
  () => props.registrationNumber,
  () => {
    location.value = null
    loaded.value = false
    error.value = null
    poll()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  clearTimeout(timer)
  requestSeq++ // drop any in-flight response
  marker?.setMap(null)
})
</script>

<template>
  <div>
    <v-skeleton-loader v-if="!loaded" type="image" height="260" />

    <div
      v-else-if="!location"
      class="d-flex flex-column align-center justify-center text-center text-medium-emphasis pa-6 live-location__empty"
    >
      <v-icon icon="mdi-map-marker-off-outline" size="36" class="mb-2" />
      <div v-if="error">
        Couldn't load the live location.
        <v-btn variant="text" size="small" color="primary" :loading="loading" @click="poll">
          Retry
        </v-btn>
      </div>
      <div v-else>No tracking available</div>
    </div>

    <template v-else>
      <div v-if="mapsError" class="live-location__empty d-flex align-center justify-center pa-4">
        <div class="text-center text-body-2 text-medium-emphasis">
          Map unavailable ({{ mapsError }})<br />
          {{ location.lat }}, {{ location.lng }}
        </div>
      </div>
      <div v-else ref="mapEl" class="live-location__map" />

      <div class="d-flex flex-wrap ga-2 mt-2">
        <v-chip size="x-small" :color="isStopped ? undefined : 'success'" variant="tonal">
          {{ location.movementStatus || 'Unknown' }}
        </v-chip>
        <v-chip v-if="location.ignition" size="x-small" variant="tonal">
          Ignition {{ location.ignition }}
        </v-chip>
        <v-chip v-if="!isStopped && location.speed != null" size="x-small" variant="tonal">
          Speed {{ location.speed }}
        </v-chip>
        <v-chip v-if="location.batteryValue != null" size="x-small" variant="tonal">
          Battery {{ location.batteryValue }} {{ location.batteryUnit }}
        </v-chip>
        <v-chip v-if="location.lastUpdated" size="x-small" variant="tonal">
          Updated {{ formatRelativeTime(location.lastUpdated) }}
        </v-chip>
      </div>

      <div class="d-flex align-center flex-wrap ga-2 mt-2 text-caption">
        <v-chip size="x-small" color="error" variant="flat" class="live-location__live">
          <span class="live-location__dot" /> Live
        </v-chip>
        <span v-if="error" class="text-error">Refresh failed.</span>
        <span v-if="nextRefreshAt" class="text-medium-emphasis">
          Next refresh at {{ formatClock(nextRefreshAt) }}
        </span>
        <v-btn variant="text" size="x-small" color="primary" :loading="loading" @click="poll">
          Refresh now
        </v-btn>
        <v-btn
          variant="text"
          size="x-small"
          color="primary"
          prepend-icon="mdi-directions"
          :href="directionsUrl"
          target="_blank"
          rel="noopener"
        >
          Directions
        </v-btn>
      </div>
    </template>
  </div>
</template>

<style scoped>
.live-location__map,
.live-location__empty {
  width: 100%;
  height: 260px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.live-location__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  margin-right: 4px;
  animation: live-pulse 1.4s ease-in-out infinite;
}
@keyframes live-pulse {
  50% {
    opacity: 0.2;
  }
}
@media (prefers-reduced-motion: reduce) {
  .live-location__dot {
    animation: none;
  }
}
</style>
