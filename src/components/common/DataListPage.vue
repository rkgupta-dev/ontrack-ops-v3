<script setup>
import { toUserMessage } from '../../utils/errorMessage'
import EmptyState from './EmptyState.vue'

const props = defineProps({
  title: { type: String, required: true },
  icon: { type: String, required: true },
  headers: { type: Array, required: true },
  items: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  page: { type: Number, default: 1 },
  itemsPerPage: { type: Number, default: 25 },
  search: { type: String, default: '' },
  searchLabel: { type: String, default: 'Search' },
  loading: { type: Boolean, default: false },
  error: { type: [Error, Object, null], default: null },
  emptyMessage: { type: String, default: 'No records found.' },
})

const emit = defineEmits(['update:page', 'update:search', 'retry'])

let searchDebounce
function onSearchInput(value) {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => emit('update:search', value), 350)
}
</script>

<template>
  <v-card elevation="2">
    <v-card-title class="d-flex align-center flex-wrap ga-3 py-4">
      <v-icon :icon="icon" class="mr-2" />
      <span>{{ title }}</span>
      <v-chip v-if="total" size="small" variant="tonal" class="ml-1">{{ total }}</v-chip>
      <slot name="actions" />
      <v-spacer />
      <v-text-field
        :model-value="search"
        :label="searchLabel"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        hide-details
        clearable
        style="max-width: 280px"
        @update:model-value="onSearchInput"
      />
    </v-card-title>
    <v-divider />

    <EmptyState
      v-if="error"
      icon="mdi-alert-circle-outline"
      :title="`Couldn't load ${props.title.toLowerCase()}`"
      :message="toUserMessage(error)"
    >
      <v-btn class="mt-4" variant="tonal" color="primary" @click="emit('retry')">Retry</v-btn>
    </EmptyState>

    <v-data-table-server
      v-else
      :headers="headers"
      :items="items"
      :items-length="total"
      :items-per-page="itemsPerPage"
      :page="page"
      :loading="loading"
      hide-default-footer
      @update:page="(value) => emit('update:page', value)"
    >
      <template v-for="(_, slotName) in $slots" #[slotName]="slotProps" :key="slotName">
        <slot :name="slotName" v-bind="slotProps" />
      </template>
      <template #no-data>
        <EmptyState
          icon="mdi-database-search-outline"
          title="Nothing here yet"
          :message="emptyMessage"
        />
      </template>
    </v-data-table-server>

    <v-divider v-if="!error" />
    <v-card-actions v-if="!error && total > itemsPerPage" class="justify-center py-3">
      <v-pagination
        :model-value="page"
        :length="Math.max(1, Math.ceil(total / itemsPerPage))"
        :total-visible="7"
        density="comfortable"
        @update:model-value="(value) => emit('update:page', value)"
      />
    </v-card-actions>
  </v-card>
</template>
