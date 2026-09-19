<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { fetchTrackedVehicles } from '../../services/vehicles/gpsTracker.api'
import { loadGoogleMaps } from '../../services/googleMapsLoader'
import { useUiStore } from '../../stores/ui.store'
import { toUserMessage } from '../../utils/errorMessage'
import EmptyState from '../../components/common/EmptyState.vue'

const uiStore = useUiStore()

// Bangalore — this app's operating city — replaces the old app's hardcoded
// London fallback (its actual default before geolocation resolves, or when
// the browser denies/lacks it).
const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 }
const DEFAULT_ZOOM = 12

const STATUS_OPTIONS = [
  { label: 'All', value: null },
  { label: 'Upcoming', value: 0 },
  { label: 'Active', value: 1 },
  { label: 'Expired', value: 3 },
]

const searchQuery = ref('')
const selectedStatus = ref(1)
const vehicles = ref([])
const page = ref(1)
const loading = ref(false)
const myLocation = ref(null)

const vehiclesWithGpsData = computed(() =>
  vehicles.value.filter((v) => v.gpsData?.lat && v.gpsData?.lng),
)

async function loadVehicles(reset = false) {
  loading.value = true
  try {
    if (reset) {
      page.value = 1
      vehicles.value = []
    }
    const rows = await fetchTrackedVehicles({
      status: selectedStatus.value,
      searchQuery: searchQuery.value,
      limit: page.value * 10,
      offset: vehicles.value.length,
    })
    page.value += 1
    vehicles.value = [...vehicles.value, ...rows]
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not load tracked vehicles.'), { type: 'error' })
  } finally {
    loading.value = false
  }
}

watch(selectedStatus, () => loadVehicles(true))

// --- Map (raw google.maps API — see googleMapsLoader.js for why no
// Vue-Maps wrapper library is used) ---
const mapEl = ref(null)
const mapsUnavailable = ref(false)
const mapsError = ref('')
let mapsApi = null // the `google.maps` namespace, set once loadGoogleMaps() resolves
let map = null
let markers = []
let myLocationMarker = null

function clearMarkers() {
  markers.forEach((m) => m.setMap(null))
  markers = []
}

// Fixes a real bug: the old app's marker v-if referenced `vehicle` at a
// scope where it wasn't defined yet (a <span> wrapping the v-for, checking
// `vehicle.gpsData.lat` before `vehicle` existed) — likely a runtime error
// on every render, probably why this page seems broken in production
// today. Markers are synced imperatively here instead, one per vehicle
// that actually has gpsData, torn down and rebuilt on every list change.
function syncMarkers() {
  if (!map || !mapsApi) return
  clearMarkers()
  for (const vehicle of vehiclesWithGpsData.value) {
    const marker = new mapsApi.Marker({
      map,
      position: { lat: vehicle.gpsData.lat, lng: vehicle.gpsData.lng },
      clickable: true,
    })
    marker.addListener('click', () => selectVehicle(vehicle))
    markers.push(marker)
  }
}
watch(vehiclesWithGpsData, syncMarkers)

function selectVehicle(vehicle) {
  // Bug fix: the old app read `vehicle.lat`/`vehicle.lng` here, but the
  // vehicle's real coordinates live at `vehicle.gpsData.lat`/`.lng` (same
  // field the marker itself is positioned from) — `vehicle.lat`/`.lng`
  // don't exist on the real response, so this always centered on
  // undefined/undefined and silently did nothing.
  if (vehicle.isTraceable && vehicle.gpsData?.lat && vehicle.gpsData?.lng) {
    map?.panTo({ lat: vehicle.gpsData.lat, lng: vehicle.gpsData.lng })
    map?.setZoom(16)
    scrollToVehicle(vehicle)
  }
}

function scrollToVehicle(vehicle) {
  requestAnimationFrame(() => {
    // Bug fix: the old app looked up `vehicle-${vehicle.id}`, but list
    // items are rendered with `id="vehicle-${vehicle.vehicleId}"` — `.id`
    // doesn't exist on the real response, so this never found the element.
    const el = document.getElementById(`vehicle-${vehicle.vehicleId}`)
    const container = document.querySelector('.vehicle-list-scroll')
    if (el && container) {
      container.scrollTo({ top: el.offsetTop - container.offsetTop, behavior: 'smooth' })
    }
  })
}

function centerMapOnMyLocation() {
  if (myLocation.value) {
    map?.panTo(myLocation.value)
    map?.setZoom(DEFAULT_ZOOM)
  }
}

onMounted(async () => {
  // Geolocation resolves independently of the Maps API load below (either
  // can finish first) — `placeMyLocationMarker()` is safe to call from
  // both places and only actually places a marker once both are ready.
  function placeMyLocationMarker() {
    if (!map || !mapsApi || !myLocation.value) return
    myLocationMarker?.setMap(null)
    myLocationMarker = new mapsApi.Marker({
      map,
      position: myLocation.value,
      icon: { url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' },
    })
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        myLocation.value = { lat: position.coords.latitude, lng: position.coords.longitude }
        map?.panTo(myLocation.value)
        placeMyLocationMarker()
      },
      () => {
        // Denied/unavailable — map just stays on DEFAULT_CENTER, same as
        // the old app's silent console.error fallback.
      },
    )
  }

  try {
    mapsApi = await loadGoogleMaps()
    map = new mapsApi.Map(mapEl.value, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      mapTypeId: 'roadmap',
    })
    syncMarkers()
    placeMyLocationMarker()
  } catch (error) {
    mapsUnavailable.value = true
    mapsError.value = error.message
  }

  loadVehicles()
})

onBeforeUnmount(() => {
  clearMarkers()
  myLocationMarker?.setMap(null)
})
</script>

<template>
  <div class="gps-tracker-page">
    <v-card class="vehicle-list-panel" elevation="4">
      <v-card-text class="pb-2">
        <v-text-field
          v-model="searchQuery"
          label="Search bookingId..."
          density="compact"
          hide-details
          clearable
          @keyup.enter="loadVehicles(true)"
        />
        <v-btn block size="small" class="mt-2" @click="loadVehicles(true)">Search</v-btn>

        <v-radio-group v-model="selectedStatus" density="compact" hide-details class="mt-2">
          <v-radio
            v-for="option in STATUS_OPTIONS"
            :key="String(option.value)"
            :label="option.label"
            :value="option.value"
          />
        </v-radio-group>

        <v-btn
          v-if="myLocation"
          block
          size="small"
          variant="tonal"
          class="mt-2"
          prepend-icon="mdi-crosshairs-gps"
          @click="centerMapOnMyLocation"
        >
          My Location
        </v-btn>
      </v-card-text>
      <v-divider />

      <div class="vehicle-list-scroll">
        <EmptyState
          v-if="vehicles.length === 0 && !loading"
          icon="mdi-map-marker-off-outline"
          title="No vehicles found"
        />
        <v-list v-else density="compact">
          <v-list-item
            v-for="vehicle in vehicles"
            :id="`vehicle-${vehicle.vehicleId}`"
            :key="vehicle.vehicleId"
            :title="vehicle.bookingId"
            :subtitle="vehicle.vehicleData?.registrationNumber ?? ''"
            @click="selectVehicle(vehicle)"
          >
            <template #append>
              <v-icon
                v-if="vehicle.gpsData?.lat"
                icon="mdi-map-marker"
                color="primary"
                size="small"
              />
            </template>
          </v-list-item>
        </v-list>
        <div class="text-center py-2">
          <v-btn variant="text" size="small" :loading="loading" @click="loadVehicles()">
            Load More
          </v-btn>
        </div>
      </div>
    </v-card>

    <div ref="mapEl" class="gps-map"></div>
    <EmptyState
      v-if="mapsUnavailable"
      class="gps-map-fallback"
      icon="mdi-map-marker-alert-outline"
      title="Map unavailable"
      :message="mapsError || 'Set VITE_GOOGLE_MAPS_API_KEY to enable the map.'"
    />
  </div>
</template>

<style scoped>
.gps-tracker-page {
  position: relative;
  height: calc(100vh - 120px);
  min-height: 500px;
}
.vehicle-list-panel {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1;
  width: 280px;
  max-height: calc(100% - 24px);
  display: flex;
  flex-direction: column;
}
.vehicle-list-scroll {
  overflow-y: auto;
  flex: 1;
}
.gps-map {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  background: #eee;
}
.gps-map-fallback {
  position: absolute;
  inset: 0;
  background: rgb(var(--v-theme-surface));
  border-radius: 8px;
}
</style>
