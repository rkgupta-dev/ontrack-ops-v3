<script setup>
import { onMounted, ref } from 'vue'
import * as vehicleDetailApi from '../../../services/vehicles/vehicleDetail.api'
import EmptyState from '../../common/EmptyState.vue'

const props = defineProps({
  vehicleId: { type: [String, Number], required: true },
})

const loading = ref(true)
const vcr = ref(null)

onMounted(async () => {
  try {
    vcr.value = await vehicleDetailApi.fetchVcr(props.vehicleId)
  } catch {
    // A vehicle with no VCR on file 404s rather than returning null.
    vcr.value = null
  } finally {
    loading.value = false
  }
})

// Field key -> label, ported exactly from the old app's vcr.vue checklist.
const CHECKLIST = [
  ['ftcap', 'Front Tyre Condition & Air pressure'],
  ['frc', 'Front Rims Condition'],
  ['rrc', 'Rear Rims Condition'],
  ['fbc', 'Front Break Condition'],
  ['rbc', 'Rear Break Condition'],
  ['bc', 'Battery Condition'],
  ['hc', 'Headlamp Condition'],
  ['hdd', 'Headlight Dim & Dip'],
  ['tlc', 'Tail Lamp Condition'],
  ['ih', 'Indicators and Horn'],
  ['mcl', 'Meter/Console Light'],
  ['sso', 'Self start operation'],
  ['so', 'Switches operation'],
  ['mc', 'Mirrors Condition'],
  ['to', 'Throttle operation'],
  ['sffl', 'Suspension Front Fork Left'],
  ['srsr', 'Suspension Rear Shocks Right'],
  ['trans', 'Transmission'],
  ['csc', 'Center Stand Condition'],
  ['ssc', 'Side Stand Condition'],
  ['fmfkt', 'Floor Mat, Footrest, Key & Toolkit'],
  ['helc', 'Helmet Condition'],
  ['nmnvj', 'Not Making Noises, vibrations & jerking while running'],
]
</script>

<template>
  <div v-if="loading" class="d-flex justify-center py-6">
    <v-progress-circular indeterminate color="primary" />
  </div>
  <EmptyState v-else-if="!vcr" icon="mdi-clipboard-text-off-outline" title="No records found" />
  <div v-else>
    <v-alert :icon="false" rounded="lg" type="info" variant="tonal" density="compact" class="mb-4">
      This section is read-only — it only shows the vehicle condition report.
    </v-alert>
    <v-row>
      <v-col v-for="[key, label] in CHECKLIST" :key="key" cols="12" md="6">
        <div class="d-flex justify-space-between align-center py-1">
          <span>{{ label }}</span>
          <v-icon
            :icon="vcr[key] ? 'mdi-check-circle' : 'mdi-close-circle'"
            :color="vcr[key] ? 'success' : 'error'"
          />
        </div>
      </v-col>
    </v-row>
  </div>
</template>
