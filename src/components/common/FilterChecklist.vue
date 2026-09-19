<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  items: { type: Array, default: () => [] }, // [{ title, value }]
  modelValue: { type: Array, default: () => [] },
  initialVisible: { type: Number, default: 8 },
})

const emit = defineEmits(['update:modelValue', 'clear'])

const expanded = ref(false)
const visibleItems = computed(() =>
  expanded.value ? props.items : props.items.slice(0, props.initialVisible),
)
const hasMore = computed(() => props.items.length > props.initialVisible)

function toggle(value) {
  const next = props.modelValue.includes(value)
    ? props.modelValue.filter((v) => v !== value)
    : [...props.modelValue, value]
  emit('update:modelValue', next)
}
</script>

<template>
  <v-card class="pa-4" variant="outlined">
    <div class="d-flex align-center justify-space-between mb-2">
      <span class="text-subtitle font-weight-bold">{{ title }}</span>
      <v-btn
        v-if="modelValue.length"
        variant="text"
        size="small"
        class="text-none"
        color="primary"
        @click="emit('clear')"
      >
        Clear all
      </v-btn>
    </div>
    <v-divider class="mb-2" />
    <div class="d-flex flex-column">
      <v-checkbox
        v-for="opt in visibleItems"
        :key="opt.value"
        :label="opt.title"
        :model-value="modelValue.includes(opt.value)"
        density="compact"
        hide-details
        class="filter-checkbox"
        @update:model-value="toggle(opt.value)"
      />
      <div v-if="!items.length" class="text-caption text-medium-emphasis py-1">No options.</div>
    </div>
    <v-btn
      v-if="hasMore"
      variant="text"
      size="small"
      class="text-none mt-2"
      color="primary"
      rounded="lg"
      @click="expanded = !expanded"
    >
      {{ expanded ? 'Show less' : 'Show more' }}
    </v-btn>
  </v-card>
</template>

<style scoped>
.filter-checkbox :deep(.v-selection-control) {
  min-height: 32px;
}
.filter-checkbox :deep(.v-label) {
  font-size: 0.875rem;
  opacity: 1;
}
</style>
