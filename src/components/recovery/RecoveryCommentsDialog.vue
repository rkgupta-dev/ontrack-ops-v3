<script setup>
import { nextTick, ref, watch } from 'vue'
import * as recoveryApi from '../../services/recovery/recovery.api'
import { useUiStore } from '../../stores/ui.store'
import { toUserMessage } from '../../utils/errorMessage'
import { formatDateTime } from '../../utils/date'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  recovery: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue'])

const uiStore = useUiStore()
const comments = ref([])
const loading = ref(false)
const sending = ref(false)
const newComment = ref('')
const scrollBox = ref(null)

async function load() {
  loading.value = true
  try {
    comments.value = await recoveryApi.fetchRecoveryComments(props.recovery.id)
    await nextTick()
    if (scrollBox.value) scrollBox.value.scrollTop = scrollBox.value.scrollHeight
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Failed to load comments.'), { type: 'error' })
  } finally {
    loading.value = false
  }
}

async function send() {
  const text = newComment.value.trim()
  if (!text) return
  sending.value = true
  try {
    await recoveryApi.addRecoveryComment(props.recovery.id, text)
    newComment.value = ''
    uiStore.notify('Comment added.', { type: 'success' })
    await load()
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Failed to add comment.'), { type: 'error' })
  } finally {
    sending.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open && props.recovery) {
      comments.value = []
      newComment.value = ''
      load()
    }
  },
)
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="520"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card rounded="lg">
      <v-card-title class="d-flex align-center pt-4">
        <div style="min-width: 0">
          <div class="text-h6">Recovery Comments</div>
          <div v-if="recovery" class="text-caption text-medium-emphasis text-truncate">
            {{ recovery.vehicleData?.registrationNumber }} ·
            {{ recovery.bookingData?.bookingId }}
          </div>
        </div>
        <v-spacer />
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="emit('update:modelValue', false)"
        />
      </v-card-title>
      <v-divider />

      <v-card-text ref="scrollBox" class="comments-box pa-3">
        <div v-if="loading" class="d-flex justify-center py-8">
          <v-progress-circular indeterminate color="primary" size="28" />
        </div>
        <div v-else-if="comments.length === 0" class="text-center text-medium-emphasis py-8">
          No comments yet.
        </div>
        <div v-else class="d-flex flex-column ga-2">
          <v-sheet v-for="comment in comments" :key="comment.id" rounded="lg" border class="pa-3">
            <div class="d-flex justify-space-between ga-2 text-caption text-medium-emphasis">
              <span class="font-weight-medium">{{ comment.agent }}</span>
              <span class="text-no-wrap">{{ formatDateTime(comment.createdAt) }}</span>
            </div>
            <div class="text-body-2 mt-1" style="white-space: pre-wrap">{{ comment.text }}</div>
          </v-sheet>
        </div>
      </v-card-text>
      <v-divider />

      <div class="d-flex align-end ga-2 pa-3">
        <v-textarea
          v-model="newComment"
          placeholder="Type a comment..."
          rows="1"
          auto-grow
          max-rows="4"
          variant="outlined"
          density="compact"
          hide-details
          rounded="lg"
        />
        <v-btn
          color="primary"
          icon="mdi-send"
          rounded="lg"
          variant="flat"
          :loading="sending"
          :disabled="!newComment.trim()"
          aria-label="Send comment"
          @click="send"
        />
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.comments-box {
  min-height: 160px;
  max-height: 50vh;
}
</style>
