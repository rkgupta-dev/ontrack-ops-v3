<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useCustomersStore } from '../../stores/customers.store'
import { useUiStore } from '../../stores/ui.store'
import { toUserMessage } from '../../utils/errorMessage'
import { formatDateTime } from '../../utils/date'
import EmptyState from '../../components/common/EmptyState.vue'

const store = useCustomersStore()
const { rows, total, status, search, loading, loadingMore, error, hasMore } = storeToRefs(store)
const uiStore = useUiStore()

const statusOptions = [
  { value: 'halt', label: 'Halt' },
  { value: 'active', label: 'Active' },
]

const searchInput = ref(search.value)
let searchDebounce

function onSearchInput(value) {
  searchInput.value = value
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => load({ search: value }), 350)
}

function load({ search: nextSearch = search.value, status: nextStatus = status.value } = {}) {
  return store.fetchPage({ search: nextSearch, status: nextStatus }).catch((err) => {
    uiStore.notify(toUserMessage(err, "Couldn't load customers."), { type: 'error' })
  })
}

function onStatusChange(value) {
  if (value === status.value) return
  load({ status: value })
}

// Infinite scroll: load the next page once the sentinel at the bottom of
// the list scrolls into view. The sentinel only exists in the DOM once
// loading/error/empty states have all resolved (it's behind a v-if), so
// it has to be (re-)observed reactively rather than once at mount —
// observing the null value on the first tick would silently no-op.
const sentinel = ref(null)
const observer = new IntersectionObserver((entries) => {
  if (entries[0]?.isIntersecting) store.loadMore()
})

watch(sentinel, (el, previousEl) => {
  if (previousEl) observer.unobserve(previousEl)
  if (el) observer.observe(el)
})

onMounted(load)

onBeforeUnmount(() => {
  observer.disconnect()
})
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
      <h1 class="text-h5 font-weight-bold">Customers</h1>
      <v-btn
        color="primary"
        variant="flat"
        rounded="lg"
        prepend-icon="mdi-plus"
        :to="{ name: 'customer-create' }"
      >
        Add
      </v-btn>
    </div>

    <v-text-field
      :model-value="searchInput"
      placeholder="Search: First or Last name, Phone, Email, DL number, Address etc"
      density="comfortable"
      hide-details
      clearable
      class="mb-4"
      @update:model-value="onSearchInput"
    />

    <div class="d-flex ga-2 mb-4">
      <v-btn
        v-for="option in statusOptions"
        :key="option.value"
        :variant="status === option.value ? 'flat' : 'outlined'"
        :color="status === option.value ? 'primary' : undefined"
        rounded="pill"
        density="comfortable"
        @click="onStatusChange(option.value)"
      >
        {{ option.label }}
      </v-btn>
    </div>

    <div class="text-body-2 text-medium-emphasis mb-4">
      {{ rows.length }} / {{ total }} rows loaded
    </div>

    <div v-if="loading" class="d-flex flex-column ga-3">
      <v-skeleton-loader v-for="n in 4" :key="n" type="card" height="110" />
    </div>

    <EmptyState
      v-else-if="error"
      icon="mdi-alert-circle-outline"
      title="Couldn't load customers"
      :message="toUserMessage(error)"
    >
      <v-btn class="mt-2" variant="tonal" color="primary" @click="load()">Retry</v-btn>
    </EmptyState>

    <EmptyState
      v-else-if="rows.length === 0"
      icon="mdi-account-search-outline"
      title="No customers found"
      message="Try a different search or filter."
    />

    <div v-else class="d-flex flex-column ga-3">
      <v-card
        v-for="row in rows"
        :key="row.id"
        variant="outlined"
        rounded="lg"
        class="pa-4"
        :to="{ name: 'customer-detail', params: { customerId: row.id } }"
        link
      >
        <div class="d-flex justify-space-between ga-3">
          <div class="min-w-0">
            <div class="text-caption text-medium-emphasis">{{ row.id }}</div>
            <div class="text-subtitle-1 font-weight-bold">{{ row.name ?? '—' }}</div>
            <div class="text-body-2 text-medium-emphasis">
              {{ [row.phone, row.email].filter(Boolean).join(', ') || '—' }}
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
              {{ formatDateTime(row.createdAt) }}
            </div>
          </div>
          <div class="text-right flex-shrink-0">
            <v-chip :color="row.active ? 'success' : 'error'" size="small" variant="flat">
              {{ row.active ? 'Active' : 'Halt' }}
            </v-chip>
            <div v-if="row.source" class="text-caption text-medium-emphasis mt-1">
              Source: {{ row.source }}
            </div>
          </div>
        </div>
      </v-card>

      <div ref="sentinel" class="py-4 text-center">
        <v-progress-circular v-if="loadingMore" indeterminate color="primary" size="24" />
        <span v-else-if="!hasMore" class="text-caption text-medium-emphasis">
          All customers loaded.
        </span>
      </div>
    </div>
  </div>
</template>
