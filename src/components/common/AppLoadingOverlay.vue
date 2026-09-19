<script setup>
import { storeToRefs } from 'pinia'
import { useUiStore } from '../../stores/ui.store'

// A slim top-of-viewport progress bar, not a blocking full-screen overlay
// — the old app's per-component `<b-spinner>` copy-paste (see
// docs/api-reference.md-adjacent project notes) blocked interaction on
// every request, including background ones (e.g. Home's KPI fetches).
// This stays out of the way and just says "something's happening".
const { loading } = storeToRefs(useUiStore())
</script>

<template>
  <v-progress-linear
    :active="loading"
    indeterminate
    color="primary"
    height="3"
    style="position: fixed; top: 0; left: 0; right: 0; z-index: 3000"
  />
</template>
