<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import * as recoveryApi from '../../services/recovery/recovery.api'
import { useUiStore } from '../../stores/ui.store'
import { toUserMessage } from '../../utils/errorMessage'
import { formatDateOnly, formatOrdinalDate } from '../../utils/date'
import EmptyState from '../../components/common/EmptyState.vue'
import RecoveryCommentsDialog from '../../components/recovery/RecoveryCommentsDialog.vue'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const { smAndDown } = useDisplay()

const LIMIT = 10

// `'all'` stands in for "no filter" (sent as an omitted param) — Vuetify's
// v-select doesn't display a `null`-valued item reliably.
const STATUS_OPTIONS = [
  { title: 'Pending', value: 0 },
  { title: 'Recovered', value: 1 },
  { title: 'All', value: 'all' },
]
const EXPIRY_DAY_OPTIONS = [
  { title: 'Any', value: 'all' },
  { title: '4 days', value: 4 },
  { title: '5 days', value: 5 },
  { title: '6 days', value: 6 },
]

// Status labels/colors from the old app's `Recovery/HomeVue.vue`.
const STATUS_META = {
  0: { label: 'Pending', color: 'warning' },
  1: { label: 'Recovered', color: 'success' },
  5: { label: 'Deleted', color: 'error' },
}
function statusMeta(status) {
  return STATUS_META[status] ?? { label: 'Unknown', color: 'secondary' }
}

function readNumberQuery(key, fallback) {
  const raw = route.query[key]
  if (raw === 'all') return 'all'
  const n = Number(raw)
  return raw !== undefined && raw !== '' && !Number.isNaN(n) ? n : fallback
}

const search = ref(typeof route.query.search === 'string' ? route.query.search : '')
const status = ref(readNumberQuery('status', 0))
const expiredDays = ref(readNumberQuery('expiredDays', 'all'))

const rows = ref([])
const loading = ref(false)
const error = ref(null)
const hasMore = ref(false)
let searchDebounce

function syncQuery() {
  const query = {}
  if (search.value) query.search = search.value
  if (status.value !== 0) query.status = String(status.value)
  if (expiredDays.value !== 'all') query.expiredDays = String(expiredDays.value)
  router.replace({ query })
}

async function fetchPage({ append = false } = {}) {
  loading.value = true
  error.value = null
  try {
    const page = await recoveryApi.fetchRecoveryList({
      limit: LIMIT,
      offset: append ? rows.value.length : 0,
      status: status.value === 'all' ? undefined : status.value,
      search: search.value,
      expiredDays: expiredDays.value === 'all' ? undefined : expiredDays.value,
    })
    rows.value = append ? [...rows.value, ...page] : page
    hasMore.value = page.length === LIMIT
  } catch (err) {
    if (append) {
      uiStore.notify(toUserMessage(err, 'Could not load more.'), { type: 'error' })
    } else {
      error.value = err
    }
  } finally {
    loading.value = false
  }
}

const filtersActive = computed(
  () => Boolean(search.value) || status.value !== 0 || expiredDays.value !== 'all',
)

const headingSubtitle = computed(() => {
  const statusText = {
    0: 'pending recovery',
    1: 'recovered',
    all: 'in recovery (all statuses)',
  }[status.value]
  const days = expiredDays.value === 'all' ? '' : ` · expired ${expiredDays.value} days`
  return `${statusText}${days}`
})

function refresh() {
  syncQuery()
  fetchPage()
}

function onSearchInput(value) {
  search.value = value ?? ''
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(refresh, 400)
}

function clearFilters() {
  clearTimeout(searchDebounce)
  search.value = ''
  status.value = 0
  expiredDays.value = 'all'
  refresh()
}

// --- Row helpers ---
function customerName(item) {
  const c = item.bookingData?.customerData
  return [c?.fName, c?.lName].filter(Boolean).join(' ') || '—'
}
function mobileOf(item) {
  return item.bookingData?.customerData?.mobile || null
}
function vehicleLink(item) {
  const reg = item.vehicleData?.registrationNumber
  return reg ? { name: 'vehicle-detail', params: { vehicleId: reg } } : undefined
}
function bookingLink(item) {
  const id = item.bookingData?.bookingId
  return id ? { name: 'booking-detail', params: { bookingId: id } } : undefined
}

function copyMobile(mobile) {
  navigator.clipboard
    .writeText(mobile)
    .then(() => uiStore.notify('Copied to clipboard.', { type: 'success', timeout: 1500 }))
    .catch(() => uiStore.notify("Couldn't copy.", { type: 'error' }))
}

// --- Comments dialog ---
const commentsOpen = ref(false)
const commentsFor = ref(null)
function openComments(item) {
  commentsFor.value = item
  commentsOpen.value = true
}

// --- Recover dialog ---
const recoverOpen = ref(false)
const confirmOpen = ref(false)
const selected = ref(null)
const closingComment = ref('')
const closing = ref(false)

function openRecover(item) {
  selected.value = item
  closingComment.value = item.closingComment || ''
  recoverOpen.value = true
}

function requestClose() {
  if (!closingComment.value.trim()) {
    uiStore.notify('Please enter a closing comment before closing.', { type: 'warning' })
    return
  }
  confirmOpen.value = true
}

async function confirmClose() {
  closing.value = true
  try {
    await recoveryApi.closeRecovery(selected.value.id, closingComment.value.trim())
    uiStore.notify('Vehicle marked as recovered.', { type: 'success' })
    confirmOpen.value = false
    recoverOpen.value = false
    fetchPage()
  } catch (err) {
    uiStore.notify(toUserMessage(err, 'Failed to close recovery. Please try again.'), {
      type: 'error',
    })
  } finally {
    closing.value = false
  }
}

onMounted(() => fetchPage())
</script>

<template>
  <div>
    <!-- Heading. A-136 returns no total, so the count is what's loaded so
         far, with a "+" while more pages remain. -->
    <div class="d-flex align-start ga-2 mb-4">
      <div class="flex-grow-1" style="min-width: 0">
        <div class="text-h6 text-sm-h5 font-weight-bold">
          <template v-if="loading && rows.length === 0">Loading…</template>
          <template v-else>
            {{ rows.length }}
            {{ rows.length === 1 && !hasMore ? 'vehicle' : 'vehicles' }}
          </template>
        </div>
        <div class="text-body-2 text-medium-emphasis">{{ headingSubtitle }}</div>
      </div>
      <v-btn
        v-if="filtersActive"
        variant="text"
        color="primary"
        size="small"
        class="text-none flex-shrink-0"
        prepend-icon="mdi-filter-remove-outline"
        @click="clearFilters"
      >
        Clear
      </v-btn>
    </div>

    <!-- Filters -->
    <div class="filters mb-5">
      <v-text-field
        :model-value="search"
        placeholder="Search reg no, booking ID or customer"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        rounded="lg"
        hide-details
        clearable
        @update:model-value="onSearchInput"
      />

      <v-btn-toggle
        v-model="status"
        color="primary"
        variant="outlined"
        divided
        mandatory
        rounded="lg"
        density="compact"
        class="filters__status"
        @update:model-value="refresh"
      >
        <v-btn
          v-for="opt in STATUS_OPTIONS"
          :key="opt.value"
          :value="opt.value"
          class="text-none"
          size="large"
        >
          {{ opt.title }}
        </v-btn>
      </v-btn-toggle>

      <div class="filters__expiry">
        <span class="text-caption text-medium-emphasis text-no-wrap">Expired</span>
        <v-chip-group
          v-model="expiredDays"
          mandatory
          selected-class="text-primary"
          class="py-0"
          @update:model-value="refresh"
        >
          <v-chip
            v-for="opt in EXPIRY_DAY_OPTIONS"
            :key="opt.value"
            :value="opt.value"
            size="small"
            variant="outlined"
            filter
          >
            {{ opt.title }}
          </v-chip>
        </v-chip-group>
      </div>
    </div>

    <!-- Loading / error / empty -->
    <div v-if="loading && rows.length === 0" class="d-flex flex-column ga-2">
      <v-skeleton-loader v-for="n in 5" :key="n" type="list-item-two-line" class="rounded-lg" />
    </div>
    <v-card v-else-if="error" variant="outlined" rounded="lg">
      <EmptyState
        icon="mdi-alert-circle-outline"
        title="Couldn't load recovery list"
        :message="toUserMessage(error)"
      >
        <v-btn class="mt-2" variant="tonal" color="primary" @click="fetchPage()">Retry</v-btn>
      </EmptyState>
    </v-card>
    <v-card v-else-if="rows.length === 0" variant="outlined" rounded="lg">
      <EmptyState
        icon="mdi-check-circle-outline"
        title="No recovery vehicles found"
        :message="filtersActive ? 'Try clearing the filters.' : 'Nothing pending right now.'"
      />
    </v-card>

    <!-- Phones / small tablets: cards -->
    <div v-else-if="smAndDown" class="d-flex flex-column ga-3">
      <v-card v-for="item in rows" :key="item.id" variant="outlined" rounded="lg" class="pa-4">
        <div class="d-flex align-start justify-space-between ga-2">
          <div style="min-width: 0">
            <router-link
              v-if="vehicleLink(item)"
              :to="vehicleLink(item)"
              class="text-subtitle-1 font-weight-bold text-primary text-decoration-none"
            >
              {{ item.vehicleData.registrationNumber }}
            </router-link>
            <div class="text-body-2 text-medium-emphasis text-truncate">
              {{ item.vehicleData?.modelData?.name || '—' }}
            </div>
          </div>
          <v-chip :color="statusMeta(item.status).color" size="small" variant="flat" label>
            {{ statusMeta(item.status).label }}
          </v-chip>
        </div>

        <div class="card-grid mt-3 text-body-2">
          <span class="text-medium-emphasis">Booking</span>
          <router-link
            v-if="bookingLink(item)"
            :to="bookingLink(item)"
            class="text-primary text-decoration-none"
          >
            {{ item.bookingData.bookingId }}
          </router-link>
          <span v-else>—</span>

          <span class="text-medium-emphasis">Expired</span>
          <span class="text-error font-weight-medium">
            {{ formatOrdinalDate(item.bookingData?.endDate) }}
          </span>

          <span class="text-medium-emphasis">Customer</span>
          <span class="text-truncate">{{ customerName(item) }}</span>
        </div>

        <div class="d-flex align-center ga-2 mt-4">
          <v-btn
            v-if="mobileOf(item)"
            :href="`tel:${mobileOf(item)}`"
            variant="tonal"
            color="primary"
            rounded="lg"
            class="text-none flex-grow-1"
            prepend-icon="mdi-phone"
          >
            {{ mobileOf(item) }}
          </v-btn>
          <v-btn
            :variant="item.status === 0 ? 'flat' : 'outlined'"
            :color="item.status === 0 ? 'success' : undefined"
            :disabled="item.status === 1"
            rounded="lg"
            class="text-none"
            @click="openRecover(item)"
          >
            Recover
          </v-btn>
          <v-btn
            icon="mdi-comment-text-outline"
            variant="outlined"
            rounded="lg"
            size="small"
            aria-label="Comments"
            @click="openComments(item)"
          />
        </div>
      </v-card>
    </div>

    <!-- Desktop: table -->
    <v-card v-else variant="outlined" rounded="lg">
      <v-table class="recovery-table text-no-wrap" hover>
        <thead>
          <tr>
            <th>Registration</th>
            <th>Booking</th>
            <th>Model</th>
            <th>Expired</th>
            <th>Customer</th>
            <th>Mobile</th>
            <th>Status</th>
            <th class="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in rows" :key="item.id">
            <td>
              <router-link
                v-if="vehicleLink(item)"
                :to="vehicleLink(item)"
                class="text-primary text-decoration-none font-weight-medium"
              >
                {{ item.vehicleData.registrationNumber }}
              </router-link>
              <span v-else>—</span>
            </td>
            <td>
              <router-link
                v-if="bookingLink(item)"
                :to="bookingLink(item)"
                class="text-primary text-decoration-none"
              >
                {{ item.bookingData.bookingId }}
              </router-link>
              <span v-else>—</span>
            </td>
            <td>{{ item.vehicleData?.modelData?.name || '—' }}</td>
            <td class="text-error">{{ formatOrdinalDate(item.bookingData?.endDate) }}</td>
            <td class="text-truncate" style="max-width: 200px" :title="customerName(item)">
              {{ customerName(item) }}
            </td>
            <td>
              <template v-if="mobileOf(item)">
                {{ mobileOf(item) }}
                <v-btn
                  icon="mdi-content-copy"
                  variant="text"
                  size="x-small"
                  color="primary"
                  aria-label="Copy mobile number"
                  @click="copyMobile(mobileOf(item))"
                />
              </template>
              <span v-else>—</span>
            </td>
            <td>
              <v-chip :color="statusMeta(item.status).color" size="small" variant="flat" label>
                {{ statusMeta(item.status).label }}
              </v-chip>
            </td>
            <td>
              <div class="d-flex justify-center ga-2">
                <v-btn
                  :variant="item.status === 0 ? 'flat' : 'outlined'"
                  :color="item.status === 0 ? 'success' : undefined"
                  :disabled="item.status === 1"
                  size="small"
                  rounded="lg"
                  class="text-none"
                  @click="openRecover(item)"
                >
                  Recover
                </v-btn>
                <v-btn
                  icon="mdi-comment-text-outline"
                  variant="outlined"
                  size="small"
                  rounded="lg"
                  density="comfortable"
                  aria-label="Comments"
                  @click="openComments(item)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <div v-if="rows.length && hasMore" class="text-center py-4">
      <v-btn
        variant="tonal"
        color="primary"
        rounded="lg"
        class="text-none"
        :loading="loading"
        @click="fetchPage({ append: true })"
      >
        Load More
      </v-btn>
    </div>

    <RecoveryCommentsDialog v-model="commentsOpen" :recovery="commentsFor" />

    <!-- Recovery details / mark as recovered -->
    <v-dialog v-model="recoverOpen" max-width="640" scrollable>
      <v-card v-if="selected" rounded="lg">
        <v-card-title class="d-flex align-center pt-4">
          <span class="text-h6">Recovery Details</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="recoverOpen = false" />
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-row dense>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Customer Name</div>
              <div class="font-weight-medium">{{ customerName(selected) }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Phone Number</div>
              <div class="font-weight-medium">{{ mobileOf(selected) || '—' }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Registration</div>
              <div class="font-weight-medium">
                {{ selected.vehicleData?.registrationNumber || '—' }}
              </div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Model</div>
              <div class="font-weight-medium">
                {{ selected.vehicleData?.modelData?.name || '—' }}
              </div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Booking ID</div>
              <div class="font-weight-medium">{{ selected.bookingData?.bookingId || '—' }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Added to Recovery</div>
              <div class="font-weight-medium">{{ formatDateOnly(selected.createdAt) }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Start Date</div>
              <div class="font-weight-medium text-success">
                {{ formatDateOnly(selected.bookingData?.startDate) }}
              </div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">End Date (Expired)</div>
              <div class="font-weight-medium text-error">
                {{ formatDateOnly(selected.bookingData?.endDate) }}
              </div>
            </v-col>
            <v-col cols="12">
              <div class="text-caption text-medium-emphasis">Address</div>
              <div class="font-weight-medium">
                {{
                  selected.address ||
                  selected.bookingData?.deliveryAddress ||
                  selected.bookingData?.customerData?.address ||
                  '—'
                }}
              </div>
            </v-col>
          </v-row>

          <v-textarea
            v-model="closingComment"
            label="Recovery Comment"
            :placeholder="
              selected.status === 0 ? 'Enter recovery details or comment...' : 'Comment on file'
            "
            :disabled="selected.status !== 0"
            variant="outlined"
            rounded="lg"
            rows="3"
            auto-grow
            class="mt-4"
            hide-details
          />
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" class="text-none" @click="recoverOpen = false">
            {{ selected.status === 0 ? 'Cancel' : 'Close' }}
          </v-btn>
          <v-btn
            v-if="selected.status === 0"
            color="success"
            variant="flat"
            rounded="lg"
            class="text-none"
            prepend-icon="mdi-check-circle-outline"
            :disabled="!closingComment.trim()"
            @click="requestClose"
          >
            Mark as Recovered
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="confirmOpen" max-width="400" :persistent="closing">
      <v-card rounded="lg">
        <v-card-title class="text-h6 pt-4">Confirm</v-card-title>
        <v-card-text>Are you sure you want to mark this recovery as Recovered?</v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" class="text-none" :disabled="closing" @click="confirmOpen = false">
            No
          </v-btn>
          <v-btn
            color="success"
            variant="flat"
            rounded="lg"
            class="text-none"
            :loading="closing"
            @click="confirmClose"
          >
            Yes, Recovered
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
/* Phones: search, status and expiry stack full-width. From md up: search +
   status share one row, expiry chips sit underneath. */
.filters {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.filters__status {
  width: 100%;
}

.filters__status :deep(.v-btn) {
  flex: 1 1 0;
  min-width: 0;
}

.filters__expiry {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

@media (min-width: 960px) {
  .filters {
    grid-template-columns: minmax(0, 1fr) 340px;
  }

  .filters__expiry {
    grid-column: 1 / -1;
  }
}

.card-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 16px;
  row-gap: 4px;
  min-width: 0;
}

.recovery-table th {
  font-weight: 600 !important;
}
</style>
