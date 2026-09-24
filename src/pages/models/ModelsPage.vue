<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import * as modelsApi from '../../services/models/models.api'
import { fetchLocations } from '../../services/home/home.api'
import { formatCurrency } from '../../utils/currency'
import { isPermissionDenied, toUserMessage } from '../../utils/errorMessage'
import { useUiStore } from '../../stores/ui.store'
import EmptyState from '../../components/common/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const { xs } = useDisplay()

// Port of the old app's `ModelsList.vue`. The location filter is kept in
// the URL (`?location=1`), same as the old page, so a filtered view
// survives a reload / can be shared.
const initialLocation = Number(route.query.location)
const locationFilter = ref(
  Number.isInteger(initialLocation) && initialLocation > 0 ? initialLocation : null,
)
const locationOptions = ref([{ title: 'All locations', value: null }])
const search = ref('')

const loading = ref(true)
const error = ref(null)
const rows = ref([])

// Client-side name search — new in v3; the old page had no search, and
// A-104 takes no search param.
const filteredRows = computed(() => {
  const term = (search.value ?? '').trim().toLowerCase()
  if (!term) return rows.value
  return rows.value.filter((row) => row.modelData.name?.toLowerCase().includes(term))
})

function isShown(row) {
  return Number(row.modelData.show) === 1
}

// Same status set as the old page's "Stock Count" popover.
function stockBreakdown(row) {
  return [
    { label: 'Available', count: row.available, color: 'success' },
    { label: 'Booked', count: row.booked, color: 'info' },
    { label: 'Under Service', count: row.underService, color: 'warning' },
    { label: 'Not Working', count: row.not_working, color: 'error' },
    { label: 'Ongoing Service', count: row.ongoingUnderService, color: 'primary' },
    { label: 'Under Water Wash', count: row.underWaterWash, color: 'secondary' },
    { label: 'Returned', count: row.returned, color: 'grey-darken-2' },
  ].map((item) => ({ ...item, count: Number(item.count) || 0 }))
}

async function loadModels() {
  loading.value = true
  error.value = null
  router.replace({ query: { ...route.query, location: locationFilter.value ?? undefined } })
  try {
    rows.value = await modelsApi.fetchModelsStock({ location: locationFilter.value })
  } catch (err) {
    error.value = err
  } finally {
    loading.value = false
  }
}

async function loadLocationOptions() {
  try {
    const locations = await fetchLocations()
    locationOptions.value = [
      { title: 'All locations', value: null },
      ...locations.map((location) => ({ title: location.name, value: location.id })),
    ]
  } catch {
    // Non-critical — the location filter just falls back to "All" only.
  }
}

// --- Edit dialog (A-110) ---
const editOpen = ref(false)
const editForm = ref(null)
const saving = ref(false)
const formRef = ref(null)
// Shown instead of a toast when a non-admin tries to save (A-110 is ADMIN-only).
const permissionDenied = ref(false)

const priceRules = [
  (v) => (v !== '' && v !== null && v !== undefined) || 'Required',
  (v) => Number(v) >= 0 || 'Must be 0 or more',
]

function openEdit(modelData) {
  editForm.value = {
    id: modelData.id,
    name: modelData.name,
    image: modelData.image300 || modelData.image,
    show: Number(modelData.show) === 1,
    price: modelData.price,
    oldPrice: modelData.old_price,
  }
  editOpen.value = true
}

async function submitEdit() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  saving.value = true
  try {
    await modelsApi.updateModel(editForm.value.id, {
      show: editForm.value.show ? 1 : 0,
      price: Number(editForm.value.price),
      oldPrice: Number(editForm.value.oldPrice),
    })
    uiStore.notify(`${editForm.value.name} updated`, { type: 'success' })
    editOpen.value = false
    loadModels()
  } catch (err) {
    if (isPermissionDenied(err)) {
      editOpen.value = false
      permissionDenied.value = true
    } else {
      uiStore.notify(toUserMessage(err), { type: 'error' })
    }
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadModels()
  loadLocationOptions()
})
</script>

<template>
  <div>
    <!-- Location filter (A-104 `location`) + client-side name search -->
    <v-row dense class="mb-2">
      <v-col cols="12" sm="5" md="4" lg="3">
        <v-select
          v-model="locationFilter"
          :items="locationOptions"
          density="compact"
          variant="outlined"
          hide-details
          rounded="lg"
          bg-color="surface"
          @update:model-value="loadModels"
        />
      </v-col>
      <v-col cols="12" sm="7" md="5" lg="4">
        <v-text-field
          v-model="search"
          placeholder="Search model"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          rounded="lg"
          bg-color="surface"
        />
      </v-col>
    </v-row>

    <div v-if="!loading && !error" class="text-body-2 text-medium-emphasis mb-3">
      {{ filteredRows.length }} {{ filteredRows.length === 1 ? 'model' : 'models' }}
    </div>

    <v-row v-if="loading && rows.length === 0" :dense="xs">
      <v-col v-for="n in 12" :key="n" cols="6" sm="4" md="3" xl="2">
        <v-skeleton-loader type="image, list-item-two-line" class="rounded-lg" />
      </v-col>
    </v-row>
    <EmptyState
      v-else-if="error"
      icon="mdi-alert-circle-outline"
      title="Couldn't load models"
      :message="toUserMessage(error)"
    >
      <v-btn class="mt-2" variant="tonal" color="primary" @click="loadModels">Retry</v-btn>
    </EmptyState>
    <EmptyState
      v-else-if="filteredRows.length === 0"
      icon="mdi-motorbike"
      title="No models found"
    />

    <v-row v-else :dense="xs" :class="{ 'opacity-60': loading }">
      <v-col v-for="row in filteredRows" :key="row.model" cols="6" sm="4" md="3" xl="2">
        <v-card class="model-card h-100 d-flex flex-column bg-surface">
          <!-- Image with visibility badge + edit action overlaid -->
          <div class="model-card__media" :class="{ 'model-card__media--hidden': !isShown(row) }">
            <v-img
              :src="row.modelData.image300 || row.modelData.image"
              :alt="row.modelData.name"
              aspect-ratio="4/3"
              class="model-card__img"
            >
              <template #error>
                <div class="d-flex align-center justify-center fill-height">
                  <v-icon icon="mdi-motorbike" size="40" color="grey-lighten-1" />
                </div>
              </template>
            </v-img>
            <v-chip
              class="model-card__badge"
              :color="isShown(row) ? 'success' : 'error'"
              :prepend-icon="isShown(row) ? 'mdi-eye-outline' : 'mdi-eye-off-outline'"
              size="x-small"
              variant="flat"
            >
              {{ isShown(row) ? 'Shown' : 'Hidden' }}
            </v-chip>
            <v-btn
              class="model-card__edit"
              icon="mdi-pencil-outline"
              size="small"
              density="comfortable"
              variant="tonal"
              color="primary"
              elevation="0"
              :aria-label="`Edit ${row.modelData.name}`"
              @click="openEdit(row.modelData)"
            />
          </div>

          <div class="pa-3 flex-grow-1 d-flex flex-column">
            <div class="model-card__name font-weight-bold mb-2" :title="row.modelData.name">
              {{ row.modelData.name }}
            </div>

            <div class="d-flex justify-space-between align-baseline text-body-2">
              <span class="text-medium-emphasis">Rental</span>
              <span class="font-weight-bold">{{ formatCurrency(row.modelData.price) }}</span>
            </div>
            <div class="d-flex justify-space-between align-baseline text-body-2">
              <span class="text-medium-emphasis">Extension</span>
              <span class="font-weight-medium">{{ formatCurrency(row.modelData.old_price) }}</span>
            </div>
          </div>

          <v-divider />

          <!-- Stock summary — hover on desktop, tap on mobile -->
          <v-menu
            open-on-hover
            open-on-click
            location="top"
            :close-on-content-click="false"
            max-width="280"
          >
            <template #activator="{ props }">
              <button v-bind="props" type="button" class="model-card__stock">
                <span
                  class="text-body-2 font-weight-medium"
                  :class="row.available > 0 ? 'text-success' : 'text-medium-emphasis'"
                >
                  <v-icon icon="mdi-circle" size="8" class="mr-1" />
                  {{ row.available }} available
                </span>
                <span class="text-caption text-primary d-flex align-center">
                  Stock
                  <v-icon icon="mdi-chevron-up" size="16" />
                </span>
              </button>
            </template>

            <v-card class="bg-surface" variant="elevated" min-width="240">
              <div class="d-flex justify-space-between align-center px-4 pt-3 pb-2">
                <span class="text-subtitle-2 font-weight-bold">Stock count</span>
                <span class="text-caption text-medium-emphasis">{{ row.total }} total</span>
              </div>
              <v-list density="compact" class="py-0 pb-2">
                <v-list-item
                  v-for="item in stockBreakdown(row)"
                  :key="item.label"
                  min-height="30"
                  class="px-4"
                >
                  <template #prepend>
                    <v-icon icon="mdi-circle" :color="item.color" size="10" class="mr-n4" />
                  </template>
                  <v-list-item-title class="text-body-2">{{ item.label }}</v-list-item-title>
                  <template #append>
                    <span
                      class="text-body-2 font-weight-bold"
                      :class="{ 'text-disabled': item.count === 0 }"
                    >
                      {{ item.count }}
                    </span>
                  </template>
                </v-list-item>
              </v-list>
            </v-card>
          </v-menu>
        </v-card>
      </v-col>
    </v-row>

    <!-- Edit model (A-110) -->
    <v-dialog v-model="editOpen" max-width="460" :fullscreen="xs" scrollable>
      <v-card v-if="editForm" :rounded="xs ? 0 : 'lg'">
        <div class="d-flex align-center ga-3 pa-4 pb-2">
          <v-avatar :image="editForm.image" rounded="lg" size="48" color="grey-lighten-4" />
          <div class="flex-grow-1 min-w-0">
            <div class="text-caption text-medium-emphasis">Update model</div>
            <div class="text-subtitle-1 font-weight-bold text-truncate">{{ editForm.name }}</div>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            density="comfortable"
            aria-label="Close"
            :disabled="saving"
            @click="editOpen = false"
          />
        </div>

        <v-card-text class="pt-2">
          <v-form ref="formRef" @submit.prevent="submitEdit">
            <v-card variant="tonal" color="primary" class="px-4 py-1 mb-5">
              <v-switch
                v-model="editForm.show"
                color="primary"
                inset
                hide-details
                density="compact"
              >
                <template #label>
                  <div class="text-body-2 text-high-emphasis">
                    <div class="font-weight-medium">Show this model</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ editForm.show ? 'Visible to customers' : 'Hidden from customers' }}
                    </div>
                  </div>
                </template>
              </v-switch>
            </v-card>

            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="editForm.price"
                  label="Rental price"
                  type="number"
                  inputmode="numeric"
                  prefix="₹"
                  density="compact"
                  rounded="lg"
                  :rules="priceRules"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="editForm.oldPrice"
                  label="Extension price"
                  type="number"
                  inputmode="numeric"
                  prefix="₹"
                  density="compact"
                  rounded="lg"
                  :rules="priceRules"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="text" rounded="lg" :disabled="saving" @click="editOpen = false"
            >Cancel</v-btn
          >
          <v-btn color="primary" variant="flat" rounded="lg" :loading="saving" @click="submitEdit">
            Save changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="permissionDenied" max-width="400">
      <v-card rounded="lg" class="pa-2">
        <div class="d-flex flex-column align-center text-center pa-4 pb-2">
          <v-avatar color="warning" variant="tonal" size="56" class="mb-3">
            <v-icon icon="mdi-shield-lock-outline" size="30" />
          </v-avatar>
          <div class="text-h6 font-weight-bold mb-1">Admin access required</div>
          <div class="text-body-2 text-medium-emphasis">
            Only admins can change a model's price or visibility. Ask an admin to make this change.
          </div>
        </div>
        <v-card-actions class="justify-center pb-4">
          <v-btn
            color="primary"
            variant="flat"
            rounded="lg"
            class="text-none px-6"
            @click="permissionDenied = false"
          >
            OK
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.model-card {
  overflow: hidden;
  transition:
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}
.model-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.model-card__media {
  position: relative;
}
.model-card__img {
  margin: 0 8%;
}
.model-card__media--hidden .model-card__img {
  opacity: 0.45;
  filter: grayscale(0.6);
}
.model-card__badge {
  position: absolute;
  top: 8px;
  left: 8px;
}
.model-card__edit {
  position: absolute;
  top: 6px;
  right: 6px;
}

/* Always reserve two lines so prices line up across a row of cards */
.model-card__name {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.3;
  min-height: 2.6em;
}

.model-card__stock {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  width: 100%;
  padding: 10px 12px;
  cursor: pointer;
  text-align: left;
}
.model-card__stock:hover {
  background: rgba(var(--v-theme-primary), 0.04);
}

.min-w-0 {
  min-width: 0;
}
</style>
