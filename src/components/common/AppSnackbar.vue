<script setup>
import { computed } from 'vue'
import { useUiStore } from '../../stores/ui.store'

const uiStore = useUiStore()

// Show one at a time, oldest first.
const current = computed(() => uiStore.queue[0] ?? null)

const colorForType = {
  info: 'info',
  success: 'success',
  error: 'error',
  warning: 'warning',
}

function close() {
  if (current.value) uiStore.dismiss(current.value.id)
}
</script>

<template>
  <v-snackbar
    :model-value="Boolean(current)"
    :color="current ? colorForType[current.type] : undefined"
    :timeout="current?.timeout ?? 4000"
    location="top"
    @update:model-value="(v) => !v && close()"
  >
    {{ current?.message }}
    <template #actions>
      <v-btn variant="text" size="small" @click="close">Close</v-btn>
    </template>
  </v-snackbar>
</template>
