<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AuthLayout from './layouts/AuthLayout.vue'
import AppLayout from './layouts/AppLayout.vue'
import AppSnackbar from './components/common/AppSnackbar.vue'
import AppLoadingOverlay from './components/common/AppLoadingOverlay.vue'

const route = useRoute()
const layout = computed(() => (route.meta.layout === 'app' ? AppLayout : AuthLayout))
</script>

<template>
  <v-app>
    <AppLoadingOverlay />
    <component :is="layout">
      <router-view />
    </component>
    <AppSnackbar />
  </v-app>
</template>
