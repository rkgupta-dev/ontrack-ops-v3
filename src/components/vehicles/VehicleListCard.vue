<script setup>
import { computed } from 'vue'
import { formatDateOnly, isExpired } from '../../utils/date'
import VehicleStatusBadge from './VehicleStatusBadge.vue'

const props = defineProps({
  item: { type: Object, required: true },
})

const insuranceExpired = computed(() => isExpired(props.item.raw?.nextInsuranceDate))
const rcExpired = computed(() => isExpired(props.item.raw?.RCExpiry))
// `gps` (boolean — confirmed live on A-158 rows) doubles as the
// Active/Inactive signal per the user: gps === true means Active.
const isActive = computed(() => Boolean(props.item.raw?.gps))

const daysOldLabel = computed(() => {
  const value = props.item.raw?.createdAt
  if (!value) return null
  const created = new Date(value)
  if (Number.isNaN(created.getTime())) return null
  const days = Math.max(0, Math.floor((Date.now() - created.getTime()) / 86400000))
  return `${days} day${days === 1 ? '' : 's'} old`
})
</script>

<template>
  <v-card
    variant="outlined"
    rounded="lg"
    class="pa-4 vehicle-list-card"
    :to="
      item.registrationNumber
        ? { name: 'vehicle-detail', params: { vehicleId: item.registrationNumber } }
        : undefined
    "
    :link="Boolean(item.registrationNumber)"
  >
    <v-row class="align-center">
      <v-col cols="2">
        <!-- Thumbnail -->
        <v-img
          :src="item.raw?.modelData?.image"
          width="68"
          height="68"
          contain
          class="flex-shrink-0"
        >
          <template #placeholder>
            <div
              class="d-flex align-center justify-center fill-height bg-grey-lighten-4 rounded-lg"
            >
              <v-icon icon="mdi-motorbike" color="grey" size="32" />
            </div>
          </template>
          <template #error>
            <div
              class="d-flex align-center justify-center fill-height bg-grey-lighten-4 rounded-lg"
            >
              <v-icon icon="mdi-motorbike" color="grey" size="32" />
            </div>
          </template>
        </v-img>
      </v-col>
      <v-col cols="10">
        <!-- Main content: Image on Left + Info & Chips on Right -->
        <div class="d-flex align-center ga-4">
          <!-- Center & Right Block -->
          <div
            class="d-flex flex-grow-1 flex-column flex-sm-row justify-space-between align-start ga-2 min-w-0"
          >
            <!-- Vehicle Info Column -->
            <div class="min-w-0">
              <div class="text-h6 font-weight-bold text-truncate leading-tight">
                {{ item.registrationNumber ?? '—' }}
              </div>
              <div class="text-body-2 text-medium-emphasis mt-0-5 text-truncate">
                {{ item.model ?? '—' }}
              </div>
              <div class="text-subtitle-2 font-weight-bold text-truncate mt-0-5">
                {{ item.lessor ?? '—' }}
              </div>

              <!-- Badges -->
              <div class="d-flex ga-2 mt-2 flex-wrap align-center">
                <VehicleStatusBadge :status="item.statusCode" />
                <v-chip
                  size="x-small"
                  class="font-weight-medium px-2"
                  :color="isActive ? 'success' : 'error'"
                  variant="tonal"
                >
                  {{ isActive ? 'Active' : 'Inactive' }}
                </v-chip>
              </div>
            </div>

            <!-- Insurance & RC Chips -->
            <div class="d-flex ga-2 flex-wrap align-center mt-1 mt-sm-0">
              <v-chip
                size="small"
                :color="insuranceExpired ? 'error' : 'success'"
                variant="outlined"
                class="font-weight-medium"
                :prepend-icon="insuranceExpired ? 'mdi-close-circle' : 'mdi-check-circle'"
              >
                {{ insuranceExpired ? 'Insurance Expired' : 'Insurance' }}
              </v-chip>
              <v-chip
                size="small"
                :color="rcExpired ? 'error' : 'success'"
                variant="outlined"
                class="font-weight-medium"
                :prepend-icon="rcExpired ? 'mdi-close-circle' : 'mdi-check-circle'"
              >
                {{ rcExpired ? 'RC Expired' : 'RC' }}
              </v-chip>
            </div>
          </div>
        </div>

        <!-- Divider & Meta Footer -->
        <v-divider class="mt-4 mb-3" />
        <div class="text-caption text-medium-emphasis">
          {{ formatDateOnly(item.raw?.createdAt) }}
          <template v-if="daysOldLabel"> | {{ daysOldLabel }}</template>
        </div>
      </v-col>
    </v-row>
  </v-card>
</template>

<style scoped>
.vehicle-list-card {
  text-decoration: none;
  color: inherit;
  border-color: rgba(0, 0, 0, 0.12);
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.vehicle-list-card:hover {
  border-color: rgba(0, 0, 0, 0.24);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.leading-tight {
  line-height: 1.25;
}

.mt-0-5 {
  margin-top: 2px;
}
</style>
