<script setup>
import { useRouter } from 'vue-router'
import EmptyState from '../components/common/EmptyState.vue'

const router = useRouter()
</script>

<template>
  <v-row justify="center" class="mt-10">
    <v-col cols="12" sm="8" md="6">
      <EmptyState
        icon="mdi-compass-off-outline"
        title="Page not found"
        message="The page you're looking for doesn't exist."
      >
        <v-btn variant="flat" rounded="lg" class="mt-4" color="primary" @click="router.push('/')"
          >Go home</v-btn
        >
      </EmptyState>
    </v-col>
  </v-row>
</template>
