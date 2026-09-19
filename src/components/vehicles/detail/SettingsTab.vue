<script setup>
import { ref } from 'vue'
import { useVehicleDetailStore } from '../../../stores/vehicleDetail.store'
import * as vehicleDetailApi from '../../../services/vehicles/vehicleDetail.api'
import { useUiStore } from '../../../stores/ui.store'
import { toUserMessage } from '../../../utils/errorMessage'

const props = defineProps({
  vehicle: { type: Object, required: true },
})

const store = useVehicleDetailStore()
const uiStore = useUiStore()

// --- Change GPS status ---
const gpsDialog = ref(false)
const loadingVendors = ref(false)
const gpsVendors = ref([])
const gpsOn = ref(false)
const gpsVendorId = ref(null)
async function openGpsDialog() {
  gpsDialog.value = true
  gpsOn.value = Boolean(props.vehicle.gps)
  gpsVendorId.value = props.vehicle.gpsVendorId ?? null
  loadingVendors.value = true
  try {
    gpsVendors.value = await vehicleDetailApi.fetchGpsVendors()
  } catch {
    uiStore.notify('Failed to fetch vendors', { type: 'error' })
    gpsDialog.value = false
  } finally {
    loadingVendors.value = false
  }
}
const savingGps = ref(false)
async function saveGpsStatus() {
  savingGps.value = true
  try {
    await store.toggleGps({ gps: gpsOn.value, gpsVendor: gpsVendorId.value })
    gpsDialog.value = false
    uiStore.notify('Done!!', { type: 'success' })
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Something is wrong with API'), { type: 'error' })
  } finally {
    savingGps.value = false
  }
}

// --- Change Status ---
const STATUS_OPTIONS = [
  { title: 'Available', value: 0 },
  { title: 'Booked', value: 1 },
  { title: 'Service', value: 2 },
  { title: 'Not Working', value: 3 },
  { title: 'Ongoing Service', value: 4 },
  { title: 'Water Wash', value: 5 },
  { title: 'Returned', value: 6 },
  { title: 'Sold', value: 7 },
  { title: 'Scrapped', value: 8 },
]
const statusDialog = ref(false)
const statusValue = ref(0)
function openStatusDialog() {
  statusValue.value = props.vehicle.status
  statusDialog.value = true
}
const savingStatus = ref(false)
async function confirmStatusChange() {
  savingStatus.value = true
  try {
    await store.updateStatus(statusValue.value)
    statusDialog.value = false
    uiStore.notify('Status Changed.', { type: 'success' })
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Something is wrong with the API'), { type: 'error' })
  } finally {
    savingStatus.value = false
  }
}

// --- Update Insurance (policy + both dates together) ---
// See vehicleDetail.api.js::updateVehicleField for why this now goes
// through the same A-161 field-patch endpoint every other Specs-tab field
// uses, instead of the old app's hardcoded-legacy-URL bug.
const insuranceDialog = ref(false)
const insurancePolicy = ref('')
const insuranceStart = ref('')
const insuranceEnd = ref('')
function openInsuranceDialog() {
  insurancePolicy.value = props.vehicle.InsurancePolicy ?? ''
  insuranceStart.value = props.vehicle.insuranceDate ?? ''
  insuranceEnd.value = props.vehicle.nextInsuranceDate ?? ''
  insuranceDialog.value = true
}
const savingInsurance = ref(false)
async function saveInsurance() {
  savingInsurance.value = true
  try {
    await store.updateField({
      InsurancePolicy: insurancePolicy.value,
      insuranceDate: insuranceStart.value,
      nextInsuranceDate: insuranceEnd.value,
    })
    insuranceDialog.value = false
    uiStore.notify('Done!!', { type: 'success' })
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Something is wrong with API'), { type: 'error' })
  } finally {
    savingInsurance.value = false
  }
}

// --- Report Issue (sub-status flag) ---
// The old app's second "Report Issue" card (styled danger, wired to a
// deletVehicle() handler that unconditionally toasts "Not Authorized.")
// is dead/non-functional — every click fails the same way regardless of
// permissions — and is not ported. "Update Visibility" is also skipped:
// its modal in the old app literally says "The feature is under
// development" and was never implemented.
const SUB_STATUS_OPTIONS = [
  'Default',
  'Scrapped',
  'Showroom',
  'Engine Issue',
  'Engine Issue Resolved',
  'Accident Case',
  'Missing Vehicle',
  'Police Station',
]
const reportDialog = ref(false)
const subStatus = ref('Default')
function openReportDialog() {
  subStatus.value = props.vehicle.subStatus ?? 'Default'
  reportDialog.value = true
}
const savingSubStatus = ref(false)
async function saveSubStatus() {
  savingSubStatus.value = true
  try {
    await store.updateField({ subStatus: subStatus.value })
    reportDialog.value = false
    uiStore.notify('Updated.', { type: 'success' })
  } catch {
    uiStore.notify('Something went wrong.', { type: 'error' })
  } finally {
    savingSubStatus.value = false
  }
}
</script>

<template>
  <v-row>
    <v-col cols="12" md="6">
      <v-card
        variant="outlined"
        link
        class="pa-4 d-flex justify-space-between align-center"
        @click="openGpsDialog"
      >
        <strong>Change GPS Status</strong>
        <v-icon icon="mdi-chevron-right" />
      </v-card>
    </v-col>
    <v-col cols="12" md="6">
      <v-card
        variant="outlined"
        link
        class="pa-4 d-flex justify-space-between align-center"
        @click="openStatusDialog"
      >
        <strong>Change Status</strong>
        <v-icon icon="mdi-chevron-right" />
      </v-card>
    </v-col>
    <v-col cols="12" md="6">
      <v-card
        variant="outlined"
        link
        class="pa-4 d-flex justify-space-between align-center"
        @click="openInsuranceDialog"
      >
        <strong>Update Insurance</strong>
        <v-icon icon="mdi-chevron-right" />
      </v-card>
    </v-col>
    <v-col cols="12" md="6">
      <v-card
        variant="outlined"
        link
        class="pa-4 d-flex justify-space-between align-center"
        @click="openReportDialog"
      >
        <strong>Report Issue</strong>
        <v-icon icon="mdi-chevron-right" />
      </v-card>
    </v-col>
  </v-row>

  <!-- Change GPS Status -->
  <v-dialog v-model="gpsDialog" max-width="420">
    <v-card title="Change GPS status">
      <v-card-text>
        <v-switch v-model="gpsOn" label="Toggle to change GPS status" color="primary" />
        <div v-if="loadingVendors" class="d-flex justify-center py-3">
          <v-progress-circular indeterminate color="primary" />
        </div>
        <v-select
          v-else
          v-model="gpsVendorId"
          label="Vendor"
          :items="gpsVendors"
          item-title="name"
          item-value="id"
          rounded="lg"
          density="comfortable"
          variant="outlined"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" rounded="lg" @click="gpsDialog = false">Cancel</v-btn>
        <v-btn
          color="primary"
          rounded="lg"
          variant="flat"
          :loading="savingGps"
          @click="saveGpsStatus"
          >Change GPS Status</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Change Status -->
  <v-dialog v-model="statusDialog" max-width="380">
    <v-card title="Change Status">
      <v-card-text>
        <v-radio-group v-model="statusValue">
          <v-radio
            v-for="option in STATUS_OPTIONS"
            :key="option.value"
            :label="option.title"
            :value="option.value"
          />
        </v-radio-group>
        <v-alert v-if="!vehicle.gps" type="warning" variant="tonal" density="compact">
          You cannot change the status to available as this vehicle doesn't have the GPS installed.
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-btn variant="text" rounded="lg" @click="statusDialog = false">Cancel</v-btn>

        <v-btn
          color="primary"
          rounded="lg"
          variant="flat"
          :disabled="statusValue === vehicle.status"
          :loading="savingStatus"
          @click="confirmStatusChange"
        >
          Confirm
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Update Insurance -->
  <v-dialog v-model="insuranceDialog" max-width="420">
    <v-card title="Update Insurance">
      <v-card-text>
        <v-text-field v-model="insurancePolicy" label="Insurance Policy" rounded="lg" />
        <v-text-field v-model="insuranceStart" type="date" label="Insurance Start" rounded="lg" />
        <v-text-field v-model="insuranceEnd" type="date" label="Insurance End" rounded="lg" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" rounded="lg" @click="insuranceDialog = false">Cancel</v-btn>
        <v-btn
          color="primary"
          rounded="lg"
          variant="flat"
          :loading="savingInsurance"
          @click="saveInsurance"
          >Save</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Report Issue -->
  <v-dialog v-model="reportDialog" max-width="420">
    <v-card title="Report Issue">
      <v-card-text>
        <v-select v-model="subStatus" :items="SUB_STATUS_OPTIONS" rounded="lg" variant="outlined" />
        <v-alert
          :icon="false"
          rounded="lg"
          type="warning"
          variant="tonal"
          density="compact"
          class="mt-2"
        >
          This will flag the vehicle to the selected option; this could be found on the vehicle
          listing page.
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" rounded="lg" @click="reportDialog = false">Cancel</v-btn>
        <v-btn
          color="primary"
          rounded="lg"
          variant="flat"
          :loading="savingSubStatus"
          @click="saveSubStatus"
          >Save</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
