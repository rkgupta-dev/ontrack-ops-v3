<script setup>
defineProps({
  icon: { type: String, default: 'mdi-information-outline' },
  title: { type: String, required: true },
  message: { type: String, default: '' },
})
</script>

<template>
  <div class="d-flex flex-column align-center justify-center text-center py-10 px-4">
    <v-icon :icon="icon" size="48" color="medium-emphasis" class="mb-3" />
    <div class="text-subtitle-1 font-weight-medium mb-1">{{ title }}</div>
    <div v-if="message" class="text-body-2 text-medium-emphasis">{{ message }}</div>
    <slot />
  </div>
</template>
