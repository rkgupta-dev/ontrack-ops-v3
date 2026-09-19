<script setup>
import { computed, ref } from 'vue'
import { useVehicleDetailStore } from '../../../stores/vehicleDetail.store'
import * as vehicleDetailApi from '../../../services/vehicles/vehicleDetail.api'
import { useUiStore } from '../../../stores/ui.store'
import { toUserMessage } from '../../../utils/errorMessage'
import { formatFullDate } from '../../../utils/date'

const props = defineProps({
  vehicle: { type: Object, required: true },
})

// This tab owns every field-level mutation on its own (location, RC,
// insurance dates, permit, swap key, the 4 document images) rather than
// lifting each into a dialog on the parent page the way BookingDetailPage
// does — there are simply too many of them here for that to stay readable,
// so SpecsTab talks to the store directly instead.
const store = useVehicleDetailStore()
const uiStore = useUiStore()

const isSwapKeyBlocked = computed(() => {
  const status = props.vehicle.swapKeyStatus
  if (!status) return null
  return !!status.blocked
})
const swapKeyStatusInfo = computed(() => {
  const status = props.vehicle.swapKeyStatus
  if (!status) return { color: 'secondary', text: 'Status Unknown' }
  if (status.blocked) return { color: 'error', text: 'Blocked' }
  return { color: 'success', text: (status.contractStatus || 'Active').toUpperCase() }
})
const swapKeyStatusDetails = computed(() => {
  const status = props.vehicle.swapKeyStatus
  if (!status?.lastAction) return ''
  let text = status.lastAction
  if (status.lastActionBy) text += ` by ${status.lastActionBy}`
  if (status.lastActionAt) text += ` on ${formatFullDate(status.lastActionAt)}`
  if (status.suspensionReasonType?.length) text += ` (${status.suspensionReasonType.join(', ')})`
  return text
})

// --- Simple single-field "Update" links (RC / insurance dates / permit) ---
const rcDialog = ref(false)
const rcExpiry = ref('')
function openRcDialog() {
  rcExpiry.value = props.vehicle.RCExpiry ?? ''
  rcDialog.value = true
}

const insuranceStartDialog = ref(false)
const insuranceDate = ref('')
function openInsuranceStartDialog() {
  insuranceDate.value = props.vehicle.insuranceDate ?? ''
  insuranceStartDialog.value = true
}

const insuranceEndDialog = ref(false)
const nextInsuranceDate = ref('')
function openInsuranceEndDialog() {
  nextInsuranceDate.value = props.vehicle.nextInsuranceDate ?? ''
  insuranceEndDialog.value = true
}

const permitDialog = ref(false)
const permitExpiry = ref('')
function openPermitDialog() {
  permitExpiry.value = props.vehicle.permitExpiry ?? ''
  permitDialog.value = true
}

const swapKeyDialog = ref(false)
const swapKeyId = ref('')
function openSwapKeyDialog() {
  swapKeyId.value = props.vehicle.swapKeyId ?? ''
  swapKeyDialog.value = true
}

const savingField = ref(false)
async function saveField(fields, closeDialog) {
  savingField.value = true
  try {
    await store.updateField(fields)
    closeDialog()
    uiStore.notify('Updated.', { type: 'success' })
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not save.'), { type: 'error' })
  } finally {
    savingField.value = false
  }
}

// --- Swap key block/unblock ---
const swapKeyActionLoading = ref(null)
const blockConfirmDialog = ref(false)
const unblockConfirmDialog = ref(false)
async function confirmBlockSwapKey() {
  swapKeyActionLoading.value = 'block'
  try {
    await store.blockSwapKey()
    uiStore.notify('Swap Key Blocked', { type: 'success' })
  } catch {
    uiStore.notify('Something is wrong with the API', { type: 'error' })
  } finally {
    swapKeyActionLoading.value = null
    blockConfirmDialog.value = false
  }
}
async function confirmUnblockSwapKey() {
  swapKeyActionLoading.value = 'unblock'
  try {
    await store.unblockSwapKey()
    uiStore.notify('Swap Key Unblocked. It can take up to 5 minutes to take effect.', {
      type: 'success',
    })
  } catch {
    uiStore.notify('Something is wrong with the API', { type: 'error' })
  } finally {
    swapKeyActionLoading.value = null
    unblockConfirmDialog.value = false
  }
}

// --- Location picker ---
const locationDialog = ref(false)
const loadingLocations = ref(false)
const locations = ref([])
const selectedLocationId = ref(null)
async function openLocationDialog() {
  locationDialog.value = true
  selectedLocationId.value = props.vehicle.location ?? null
  loadingLocations.value = true
  try {
    locations.value = await vehicleDetailApi.fetchVehicleLocations()
  } catch {
    uiStore.notify('Failed to load locations', { type: 'error' })
    locationDialog.value = false
  } finally {
    loadingLocations.value = false
  }
}
const locationUpdating = ref(false)
async function saveLocation() {
  locationUpdating.value = true
  try {
    await store.updateLocation(selectedLocationId.value)
    locationDialog.value = false
    uiStore.notify('Location Updated', { type: 'success' })
  } catch {
    uiStore.notify('Something is wrong with the API', { type: 'error' })
  } finally {
    locationUpdating.value = false
  }
}

// --- Document images (insurance / PUCC / RC / permit) ---
const IMAGE_TYPES = {
  insurance: { field: 'insuranceImage', apiType: 'insuranceImage', label: 'Insurance' },
  pucc: { field: 'pucc', apiType: 'pucc', label: 'PUCC' },
  rc: { field: 'rcImage', apiType: 'rcImage', label: 'RC' },
  permit: { field: 'vehiclePermit', apiType: 'vehiclePermit', label: 'Permit' },
}
const imageDialog = ref(null) // key into IMAGE_TYPES, or null
const imagePreview = ref('')
const pendingImageFile = ref(null)
const fileInputs = ref({})

function chooseImage(key) {
  fileInputs.value[key]?.click()
}
function onFileSelected(event, key) {
  const file = event.target.files[0]
  if (!file) return
  pendingImageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
  imageDialog.value = key
}
const uploadingImage = ref(false)
async function confirmImageUpload() {
  uploadingImage.value = true
  try {
    await store.uploadImage(pendingImageFile.value, IMAGE_TYPES[imageDialog.value].apiType)
    uiStore.notify('Successfully Changed!', { type: 'success' })
    imageDialog.value = null
    pendingImageFile.value = null
    imagePreview.value = ''
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not upload the image.'), { type: 'error' })
  } finally {
    uploadingImage.value = false
  }
}
</script>

<template>
  <div>
    <v-row>
      <v-col cols="12" md="6">
        <div class="text-caption text-medium-emphasis">Location</div>
        <div class="d-flex align-center ga-2">
          <span>{{ vehicle.locationData?.name ?? 'NA' }}</span>
          <v-btn icon="mdi-pencil" size="x-small" variant="outlined" @click="openLocationDialog" />
        </div>
      </v-col>
      <v-col cols="12" md="6">
        <div class="text-caption text-medium-emphasis">Owner</div>
        <div>{{ vehicle.lessorData?.name ?? '—' }}</div>
      </v-col>

      <v-col cols="12" md="6">
        <div class="text-caption text-medium-emphasis">Insurance Policy</div>
        <div>{{ vehicle.InsurancePolicy ?? '—' }}</div>
      </v-col>
      <v-col cols="6" md="3">
        <div class="text-caption text-medium-emphasis">Insurance Start</div>
        <div>{{ formatFullDate(vehicle.insuranceDate) }}</div>
        <v-btn
          variant="text"
          size="small"
          color="primary"
          class="px-0"
          @click="openInsuranceStartDialog"
        >
          Update
        </v-btn>
      </v-col>
      <v-col cols="6" md="3">
        <div class="text-caption text-medium-emphasis">Insurance End</div>
        <div>{{ formatFullDate(vehicle.nextInsuranceDate) }}</div>
        <v-btn
          variant="text"
          size="small"
          color="primary"
          class="px-0"
          @click="openInsuranceEndDialog"
        >
          Update
        </v-btn>
      </v-col>

      <v-col cols="6" md="3">
        <div class="text-caption text-medium-emphasis">Engine Number</div>
        <div>{{ vehicle.engineNo ?? '—' }}</div>
      </v-col>
      <v-col cols="6" md="3">
        <div class="text-caption text-medium-emphasis">Chassis Number</div>
        <div>{{ vehicle.chassisNo ?? '—' }}</div>
      </v-col>
      <v-col cols="6" md="3">
        <div class="text-caption text-medium-emphasis">Manufacture Date</div>
        <div>{{ formatFullDate(vehicle.manufactureDate) }}</div>
      </v-col>
      <v-col cols="6" md="3">
        <div class="text-caption text-medium-emphasis">RC Expiry</div>
        <div>{{ formatFullDate(vehicle.RCExpiry) }}</div>
        <v-btn variant="text" size="small" color="primary" class="px-0" @click="openRcDialog">
          Update
        </v-btn>
      </v-col>

      <v-col cols="12" md="6">
        <div class="text-caption text-medium-emphasis">Swap Key ID</div>
        <div class="d-flex align-center ga-2 flex-wrap">
          <span>{{ vehicle.swapKeyId || '-' }}</span>
          <v-chip v-if="vehicle.swapKeyId" size="small" :color="swapKeyStatusInfo.color">
            <v-icon v-if="isSwapKeyBlocked" icon="mdi-lock" size="14" start />
            {{ swapKeyStatusInfo.text }}
          </v-chip>
        </div>
        <div v-if="swapKeyStatusDetails" class="text-caption text-medium-emphasis">
          {{ swapKeyStatusDetails }}
        </div>
        <v-btn variant="text" size="small" color="primary" class="px-0" @click="openSwapKeyDialog">
          Update
        </v-btn>
        <div v-if="vehicle.swapKeyId" class="mt-2">
          <v-btn
            size="small"
            color="error"
            rounded="lg"
            variant="flat"
            class="mr-2"
            :disabled="Boolean(swapKeyActionLoading) || isSwapKeyBlocked === true"
            :loading="swapKeyActionLoading === 'block'"
            @click="blockConfirmDialog = true"
          >
            Block Swap Key
          </v-btn>
          <v-btn
            size="small"
            color="success"
            rounded="lg"
            variant="flat"
            :disabled="Boolean(swapKeyActionLoading) || isSwapKeyBlocked === false"
            :loading="swapKeyActionLoading === 'unblock'"
            @click="unblockConfirmDialog = true"
          >
            Unblock Swap Key
          </v-btn>
        </div>
      </v-col>

      <v-col cols="6" md="3">
        <div class="text-caption text-medium-emphasis">Permit Expiry</div>
        <div>{{ formatFullDate(vehicle.permitExpiry) }}</div>
        <v-btn variant="text" size="small" color="primary" class="px-0" @click="openPermitDialog">
          Update
        </v-btn>
      </v-col>

      <v-col v-for="(meta, key) in IMAGE_TYPES" :key="key" cols="6" md="3">
        <div class="text-caption text-medium-emphasis">{{ meta.label }}</div>
        <div class="d-flex ga-1">
          <v-btn icon="mdi-pencil" size="x-small" variant="outlined" @click="chooseImage(key)" />
          <v-btn
            icon="mdi-eye"
            size="x-small"
            variant="outlined"
            :disabled="!vehicle[meta.field]"
            :href="vehicle[meta.field]"
            target="_blank"
          />
        </div>
        <input
          :ref="(el) => (fileInputs[key] = el)"
          type="file"
          accept="image/*"
          style="display: none"
          @change="(e) => onFileSelected(e, key)"
        />
      </v-col>
    </v-row>

    <v-divider class="my-4" />

    <v-row>
      <v-col cols="6" md="3">
        <div class="font-weight-medium">Mileage</div>
        <div>{{ vehicle.modelData?.mileage ?? '—' }} kmpl</div>
      </v-col>
      <v-col cols="6" md="3">
        <div class="font-weight-medium">Power</div>
        <div>{{ vehicle.modelData?.power ?? '—' }} hp</div>
      </v-col>
      <v-col cols="6" md="3">
        <div class="font-weight-medium">Fuel Cap</div>
        <div>{{ vehicle.modelData?.fuelCapacity ?? '—' }} ltr</div>
      </v-col>
      <v-col cols="6" md="3">
        <div class="font-weight-medium">Speed</div>
        <div>{{ vehicle.modelData?.speed ?? '—' }} kmph</div>
      </v-col>
    </v-row>
    <div v-if="vehicle.modelData?.tyre_date" class="mt-3">
      <div class="font-weight-medium">Tyres & Batteries</div>
      <div>Tyre Changed on, {{ vehicle.modelData.tyre_date || 'Not Available' }}.</div>
      <div>Battery changed on, {{ vehicle.modelData.battery_date || 'Not Available' }}</div>
    </div>

    <!-- Simple single-field update dialogs -->
    <v-dialog v-model="rcDialog" max-width="380">
      <v-card title="Update RC Expiry">
        <v-card-text><v-text-field v-model="rcExpiry" type="date" /></v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="rcDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="savingField"
            @click="saveField({ RCExpiry: rcExpiry }, () => (rcDialog = false))"
          >
            Update
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="insuranceStartDialog" max-width="380">
      <v-card title="Update Insurance Start">
        <v-card-text><v-text-field v-model="insuranceDate" type="date" /></v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="insuranceStartDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="savingField"
            @click="saveField({ insuranceDate }, () => (insuranceStartDialog = false))"
          >
            Update
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="insuranceEndDialog" max-width="380">
      <v-card title="Update Insurance End">
        <v-card-text><v-text-field v-model="nextInsuranceDate" type="date" /></v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="insuranceEndDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="savingField"
            @click="saveField({ nextInsuranceDate }, () => (insuranceEndDialog = false))"
          >
            Update
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="permitDialog" max-width="380">
      <v-card title="Update Permit Expiry">
        <v-card-text><v-text-field v-model="permitExpiry" type="date" /></v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="permitDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="savingField"
            @click="saveField({ permitExpiry }, () => (permitDialog = false))"
          >
            Update
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="swapKeyDialog" max-width="380">
      <v-card title="Update Swap Key ID">
        <v-card-text
          ><v-text-field v-model="swapKeyId" placeholder="Enter Swap Key Id"
        /></v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="swapKeyDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            rounded="lg"
            variant="flat"
            :disabled="!swapKeyId"
            :loading="savingField"
            @click="saveField({ swapKeyId }, () => (swapKeyDialog = false))"
          >
            Update
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="locationDialog" max-width="380">
      <v-card title="Update Location">
        <v-card-text>
          <div v-if="loadingLocations" class="d-flex justify-center py-3">
            <v-progress-circular indeterminate color="primary" />
          </div>
          <v-select
            v-else
            v-model="selectedLocationId"
            :items="locations"
            item-title="name"
            item-value="id"
            variant="outlined"
            rounded="lg"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="locationDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            rounded="lg"
            variant="flat"
            :disabled="!selectedLocationId"
            :loading="locationUpdating"
            @click="saveLocation"
          >
            Update
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Swap key block/unblock confirmations -->
    <v-dialog v-model="blockConfirmDialog" max-width="420">
      <v-card title="Block Swap Key?">
        <v-card-text>
          This will immediately suspend swap key "{{ vehicle.swapKeyId }}". The vehicle's key will
          stop working until it's unblocked.
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" rounded="lg" @click="blockConfirmDialog = false">Cancel</v-btn>

          <v-btn
            color="error"
            variant="flat"
            rounded="lg"
            :loading="swapKeyActionLoading === 'block'"
            @click="confirmBlockSwapKey"
          >
            Block Key
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="unblockConfirmDialog" max-width="420">
      <v-card title="Unblock Swap Key?">
        <v-card-text>
          This will unblock swap key "{{ vehicle.swapKeyId }}". Note: it can take up to 5 minutes
          for the key to start working again.
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" rounded="lg" @click="unblockConfirmDialog = false">Cancel</v-btn>

          <v-btn
            color="success"
            rounded="lg"
            variant="flat"
            :loading="swapKeyActionLoading === 'unblock'"
            @click="confirmUnblockSwapKey"
          >
            Unblock Key
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Image upload preview -->
    <v-dialog
      :model-value="Boolean(imageDialog)"
      max-width="420"
      @update:model-value="imageDialog = null"
    >
      <v-card :title="`Upload ${imageDialog ? IMAGE_TYPES[imageDialog].label : ''} Image`">
        <v-card-text>
          <v-img v-if="imagePreview" :src="imagePreview" />
          <div class="text-right mt-3">
            <v-btn color="primary" :loading="uploadingImage" @click="confirmImageUpload"
              >Confirm</v-btn
            >
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>
