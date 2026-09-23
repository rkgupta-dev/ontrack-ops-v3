<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import * as bookingDetailApi from '../../services/bookings/bookingDetail.api'
import * as endBookingApi from '../../services/bookings/endBooking.api'
import { useUiStore } from '../../stores/ui.store'
import { toUserMessage } from '../../utils/errorMessage'
import { formatCurrency } from '../../utils/currency'
import PendingKmBillsStep from '../../components/bookings/endBooking/PendingKmBillsStep.vue'
import TrafficViolationsList from '../../components/bookings/endBooking/TrafficViolationsList.vue'
import PaymentTicketsTab from '../../components/bookings/detail/PaymentTicketsTab.vue'
import EmptyState from '../../components/common/EmptyState.vue'

const route = useRoute()
const uiStore = useUiStore()
const bookingId = route.params.bookingId

const loading = ref(true)
const bookingData = ref(null)
const loadError = ref(null)
const currentStage = ref(1)
const feedbackMessage = ref(null)

async function loadBooking() {
  loading.value = true
  loadError.value = null
  try {
    bookingData.value = await bookingDetailApi.fetchBookingDetail(bookingId)
    penaltyCharge.value = bookingData.value?.customerData?.penaltyCharge || 0
    if (bookingData.value) await loadLineItems()
  } catch (error) {
    loadError.value = error
    uiStore.notify(toUserMessage(error, "Couldn't load this booking."), { type: 'error' })
  } finally {
    loading.value = false
  }
}

// Days-overdue banner, shown above the wizard regardless of step.
const bookingAlert = computed(() => {
  if (!bookingData.value?.endDate) return null
  const end = new Date(`${bookingData.value.endDate}T00:00:00Z`)
  const days = Math.round((Date.now() - end.getTime()) / 86400000)
  if (days < 0) {
    return {
      type: 'warning',
      text: `You are preclosing the booking as its end date is ${bookingData.value.endDate}. Please ensure to update if there was any refund on the booking > collection page before ending the booking.`,
    }
  }
  if (days === 0) {
    return { type: 'success', text: `The booking end date is ${bookingData.value.endDate}.` }
  }
  return {
    type: 'error',
    text: `The booking end date is ${bookingData.value.endDate}. This is an expired case. If the customer has extended the booking and it's not recorded, please extend it before ending the booking. If the amounts are settled in recovery, please mention it on the booking > collection page before ending the booking.`,
  }
})

// --- Step 2: drop PIN ---
const customerReceivedDropPIN = ref(false)
const absconding = ref(false)
const sendLinkToCustomerModal = ref(false)
const sendingLink = ref(false)

async function sendOTPGenerationLink() {
  sendingLink.value = true
  try {
    await endBookingApi.sendPinGenerationLink(bookingId)
    uiStore.notify('Link Shared Successfully', { type: 'success' })
    sendLinkToCustomerModal.value = false
  } catch {
    uiStore.notify('Cannot Share Link', { type: 'error' })
  } finally {
    sendingLink.value = false
  }
}
function copyDropPinLink() {
  const text = `https://book.on-track.in/feedback/${bookingData.value.bookingId}`
  navigator.clipboard.writeText(text).then(() => uiStore.notify('Copied', { type: 'success' }))
}

// --- Step 3: post-KM + comment ---
const bookingLineItems = ref(null)
const bookingLineItemId = ref(null)
const postKm = ref('')
const postBookingComment = ref('')

async function loadLineItems() {
  try {
    const data = await bookingDetailApi.fetchBookingLineItem(bookingData.value.id)
    bookingLineItems.value = data
    bookingLineItemId.value = data?.id ?? null
    postKm.value = data?.postKm ?? ''
    postBookingComment.value = data?.postComment ?? ''
  } catch {
    // non-fatal — the wizard can still proceed, later steps just show blanks
  }
}

const updatingLineItem = ref(false)
async function updateBookingLineItems() {
  updatingLineItem.value = true
  try {
    await endBookingApi.updatePostBookingData(bookingLineItemId.value, {
      postKm: postKm.value,
      postComment: postBookingComment.value,
    })
    currentStage.value++
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not save post-booking data.'), { type: 'error' })
  } finally {
    updatingLineItem.value = false
    await loadLineItems()
  }
}

// --- Step 4: post-booking images ---
const imagePreviewModal = ref(false)
const imagePreview = ref('')
const pendingImageFile = ref(null)
const imageUploadType = ref('')
const image1Input = ref(null)
const image2Input = ref(null)

function chooseImage(type) {
  ;(type === 'postImage1' ? image1Input : image2Input).value?.click()
}
function onFileSelected(event, type) {
  const file = event.target.files[0]
  if (!file) return
  imageUploadType.value = type
  pendingImageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
  imagePreviewModal.value = true
}
const uploadingImage = ref(false)
async function confirmUpload() {
  uploadingImage.value = true
  try {
    await endBookingApi.uploadMandatoryImage(
      bookingLineItemId.value,
      pendingImageFile.value,
      imageUploadType.value,
    )
    imagePreviewModal.value = false
    pendingImageFile.value = null
    imagePreview.value = ''
    await loadLineItems()
  } catch (error) {
    uiStore.notify(toUserMessage(error, 'Could not upload the image.'), { type: 'error' })
  } finally {
    uploadingImage.value = false
  }
}

// --- Step 5: penalty ---
const adjustPenaltyModal = ref(false)
const penaltyCharge = ref(0)
const savingPenalty = ref(false)
async function updatePenalty() {
  savingPenalty.value = true
  try {
    await endBookingApi.updateCustomerPenalty(
      bookingData.value.customerData.id,
      penaltyCharge.value,
    )
    await loadBooking()
    adjustPenaltyModal.value = false
  } catch {
    uiStore.notify('Something is wrong with the API', { type: 'error' })
  } finally {
    savingPenalty.value = false
  }
}

// --- Step 8: recovery ---
const forcefullyRecovered = ref(false)
const blacklist = ref(false)
const recoveryInfoModal = ref(false)

// --- Step 9: confirm ---
const otp = ref('')
const bookingEndComment = ref('')
const confirming = ref(false)

async function confirmEndBooking() {
  confirming.value = true
  try {
    const response = await endBookingApi.submitEndBooking({
      id: bookingData.value.id,
      blacklist: blacklist.value,
      forcefullyRecovered: forcefullyRecovered.value,
      absconding: absconding.value,
      otp: otp.value,
      bookingEndComment: `End Booking - ${bookingEndComment.value}`,
    })
    if (response.error === 0) {
      feedbackMessage.value = null
      currentStage.value++
    } else {
      feedbackMessage.value = response.message
      uiStore.notify(response.message, { type: 'error' })
    }
  } catch {
    uiStore.notify('Something is wrong with the API', { type: 'error' })
  } finally {
    confirming.value = false
  }
}

onMounted(loadBooking)
</script>

<template>
  <div v-if="loading" class="d-flex justify-center py-10">
    <v-progress-circular indeterminate color="primary" />
  </div>

  <EmptyState
    v-else-if="loadError || !bookingData"
    icon="mdi-alert-circle-outline"
    title="Couldn't load this booking"
    :message="toUserMessage(loadError)"
  >
    <v-btn class="mt-4" variant="tonal" color="primary" @click="loadBooking">Retry</v-btn>
  </EmptyState>

  <div v-else>
    <div class="mb-2">Request for ending the booking - {{ bookingData.bookingId }}</div>
    <div class="font-weight-bold">
      {{ bookingData.vehicleData?.registrationNumber }} - {{ bookingData.modelData?.name }}
    </div>
    <div>
      {{ bookingData.customerData?.fName }} {{ bookingData.customerData?.lName }} -
      <a :href="`tel:${bookingData.customerData?.mobile}`">{{
        bookingData.customerData?.mobile
      }}</a>
    </div>
    <v-alert
      v-if="bookingAlert"
      :type="bookingAlert.type"
      variant="tonal"
      class="mt-3"
      :icon="false"
      rounded="lg"
    >
      {{ bookingAlert.text }}
    </v-alert>

    <v-card class="mt-4 pa-4">
      <div class="text-caption text-medium-emphasis mb-2">Step: {{ currentStage }}/10</div>
      <v-alert v-if="feedbackMessage" type="error" variant="tonal" density="compact" class="mb-3">
        {{ feedbackMessage }}
      </v-alert>

      <!-- Step 1: pending KM bills -->
      <div v-if="currentStage === 1">
        <h3 class="text-h6 mb-1">KM Bills</h3>
        <div class="text-medium-emphasis mb-3">This is only for EV Vehicles.</div>
        <PendingKmBillsStep :booking-id="bookingData.id" @next="currentStage++" />
      </div>

      <!-- Step 2: generate PIN -->
      <div v-else-if="currentStage === 2">
        <h3 class="text-h6 mb-1">Generate PIN</h3>
        <div class="text-medium-emphasis mb-3">
          A 4-digit 'Drop PIN' is required to end the booking.
        </div>

        <v-alert
          v-if="bookingData.customerData?.dropPin"
          type="success"
          variant="tonal"
          class="mb-3"
          :icon="false"
        >
          A 4-digit 'Drop PIN' has already been generated for this user. Please request the customer
          to share the PIN and use it at the final stage.
          <div class="mt-2">
            <v-btn size="small" color="warning" @click="sendLinkToCustomerModal = true"
              >Request Again</v-btn
            >
          </div>
        </v-alert>
        <v-alert v-else type="error" variant="tonal" :icon="false" class="mb-3">
          A 4-digit 'Drop PIN' has not yet been generated for this user. Please ask the customer to
          generate the PIN using the provided link and enter it at the final stage.
          <strong class="d-block mt-1">Note: The PIN is required to complete the booking.</strong>
          <div class="mt-2">
            <v-btn
              rounded="lg"
              variant="flat"
              size="small"
              color="warning"
              @click="sendLinkToCustomerModal = true"
              >Send Link to Customer</v-btn
            >
          </div>
        </v-alert>

        <v-checkbox
          v-model="customerReceivedDropPIN"
          label="The customer has received the 'DROP PIN' and wishes to end the booking."
          density="compact"
        />
        <v-checkbox
          v-model="absconding"
          label="The customer is in absconding/recovery status."
          density="compact"
        />

        <div class="text-right mt-4">
          <v-btn
            color="success"
            variant="flat"
            rounded="lg"
            :disabled="!customerReceivedDropPIN && !absconding"
            @click="currentStage++"
          >
            Next
          </v-btn>
        </div>
      </div>

      <!-- Step 3: post-booking KM + comment -->
      <div v-else-if="currentStage === 3">
        <h3 class="text-h6 mb-4">Enter Post Booking Data</h3>
        <v-text-field v-model="postKm" label="KM Reading" rounded="lg" />
        <v-textarea
          v-model="postBookingComment"
          maxlength="250"
          label="Comment"
          variant="outlined"
          rounded="lg"
          placeholder="Describe the condition of the vehicle. Mention any damages or dents."
        />
        <div class="text-right mt-2">
          <v-btn
            variant="flat"
            rounded="lg"
            color="success"
            :loading="updatingLineItem"
            @click="updateBookingLineItems"
            >Next</v-btn
          >
        </div>
      </div>

      <!-- Step 4: post-booking images -->
      <div v-else-if="currentStage === 4">
        <h3 class="text-h6 mb-4">Post Booking Images</h3>
        <v-row>
          <v-col cols="12" md="6">
            <h4 class="text-subtitle-1 mb-2">Image 1</h4>
            <template v-if="bookingLineItems?.postImage1">
              <v-img :src="bookingLineItems.postImage1" height="150" rounded="lg" cover />
              <v-btn
                variant="text"
                color="primary"
                size="small"
                class="mt-1"
                @click="chooseImage('postImage1')"
              >
                Upload New
              </v-btn>
            </template>
            <v-card v-else class="py-8 text-center" link @click="chooseImage('postImage1')">
              <v-icon icon="mdi-image-outline" class="mb-1" /> Choose
            </v-card>
            <input
              ref="image1Input"
              type="file"
              accept="image/*"
              style="display: none"
              @change="(e) => onFileSelected(e, 'postImage1')"
            />
          </v-col>
          <v-col cols="12" md="6">
            <h4 class="text-subtitle-1 mb-2">Image 2</h4>
            <template v-if="bookingLineItems?.postImage2">
              <v-img :src="bookingLineItems.postImage2" height="150" rounded="lg" cover />
              <v-btn
                variant="text"
                color="primary"
                size="small"
                class="mt-1"
                @click="chooseImage('postImage2')"
              >
                Upload New
              </v-btn>
            </template>
            <v-card v-else class="py-8 text-center" link @click="chooseImage('postImage2')">
              <v-icon icon="mdi-image-outline" class="mb-1" /> Choose
            </v-card>
            <input
              ref="image2Input"
              type="file"
              accept="image/*"
              style="display: none"
              @change="(e) => onFileSelected(e, 'postImage2')"
            />
          </v-col>
        </v-row>
        <div class="text-right mt-4">
          <v-btn color="success" @click="currentStage++">Next</v-btn>
        </div>
      </div>

      <!-- Step 5: penalty check -->
      <div v-else-if="currentStage === 5">
        <div class="text-caption text-medium-emphasis">Penalty</div>
        <template v-if="bookingData.customerData?.penaltyCharge > 0">
          <div class="text-h4 text-error my-2">
            {{ formatCurrency(bookingData.customerData.penaltyCharge) }}
          </div>
          <v-alert type="error" variant="tonal">
            <strong>Customer has an outstanding penalty charge.</strong>
            <div class="mt-1">
              Note: This is just the penalties. If any rental amounts are due or the customer is a
              defaulter/expired customer, check the exact due amount.
            </div>
            <div class="mt-2">
              <v-btn size="small" color="warning" @click="adjustPenaltyModal = true">Adjust</v-btn>
            </div>
          </v-alert>
        </template>
        <v-alert v-else type="error" variant="tonal" class="mt-2">
          <div>No penalties have been detected.</div>
          <div class="mt-2">
            <v-btn size="small" color="warning" @click="adjustPenaltyModal = true">Adjust</v-btn>
          </div>
        </v-alert>
        <div class="text-right mt-4">
          <v-btn color="success" @click="currentStage++">Skip &gt;&gt;</v-btn>
        </div>
      </div>

      <!-- Step 6: traffic violations -->
      <div v-else-if="currentStage === 6">
        <h3 class="text-h6 mb-4">Traffic Violations</h3>
        <TrafficViolationsList :booking-id="bookingData.bookingId" />
        <div class="text-right mt-4">
          <v-btn color="success" @click="currentStage++">Next &gt;&gt;</v-btn>
        </div>
      </div>

      <!-- Step 7: payment ticket -->
      <div v-else-if="currentStage === 7">
        <h3 class="text-h6 mb-4">Payment Ticket</h3>
        <v-alert type="warning" variant="tonal" class="mb-3">
          If there is any pending amount with the customer, please add it here. If the customer has
          a due amount, remember a separate team is allocated to deal with this.
          <div class="mt-1">
            Note: This will not show up to the customer when they make a new booking again.
          </div>
        </v-alert>
        <PaymentTicketsTab :booking-id="bookingData.bookingId" />
        <div class="text-right mt-4">
          <v-btn color="success" @click="currentStage++">Next &gt;&gt;</v-btn>
        </div>
      </div>

      <!-- Step 8: recovery details -->
      <div v-else-if="currentStage === 8">
        <h3 class="text-h6 mb-4">Recovery Details</h3>
        <v-switch
          v-model="forcefullyRecovered"
          label="Forcefully Recovered"
          color="primary"
          density="compact"
        />
        <v-switch
          v-model="blacklist"
          label="Blacklist Customer"
          color="primary"
          density="compact"
        />
        <v-btn variant="text" color="primary" class="pl-0" @click="recoveryInfoModal = true">
          Click for more info
        </v-btn>
        <div class="text-right mt-4">
          <v-btn color="success" @click="currentStage++">Next &gt;&gt;</v-btn>
        </div>
      </div>

      <!-- Step 9: verify + confirm -->
      <div v-else-if="currentStage === 9">
        <div class="d-flex justify-space-between align-center mb-2">
          <h3 class="text-h6">Verify Drop</h3>
          <v-btn size="small" color="warning" @click="sendLinkToCustomerModal = true"
            >Send PIN Link</v-btn
          >
        </div>

        <template v-if="!absconding">
          <v-alert type="info" variant="tonal" class="my-3">
            Please enter the 4-digit 'Drop PIN' that was generated for this user during the first
            step. The booking will only be completed with a valid PIN.
          </v-alert>
          <v-text-field v-model="otp" label="Enter 4-digit DROP PIN" />
        </template>
        <v-alert v-else type="error" variant="tonal" class="my-3">
          You have marked this as an absconding/recovery case, you are not required to enter the
          Drop Pin here, please add complete brief before closing.
          <v-textarea v-model="bookingEndComment" placeholder="enter comment" class="mt-2" />
          <div class="mt-2">If you think there is a mistake please click on the button below.</div>
          <v-btn color="error" class="mt-2" @click="currentStage = 1">Start Over</v-btn>
        </v-alert>

        <div class="text-right mt-4">
          <v-btn color="success" :loading="confirming" @click="confirmEndBooking"
            >Confirm &amp; End Booking</v-btn
          >
        </div>
      </div>

      <!-- Step 10: done -->
      <div v-else class="text-center py-6">
        <v-icon icon="mdi-check-circle" color="success" size="48" class="mb-3" />
        <div class="font-weight-bold mb-4">Booking Ended</div>
        <v-btn :to="{ name: 'bookings' }" color="success">Go Back to Bookings</v-btn>
      </div>
    </v-card>

    <!-- Send drop-PIN link dialog -->
    <v-dialog v-model="sendLinkToCustomerModal" max-width="420">
      <v-card title="Send Link">
        <v-card-text>
          A link will be sent to the customer. If they haven't generated a PIN yet, they will be
          able to do so through this link. The customer needs to share the generated PIN to confirm
          ending the booking.
          <div class="mt-3">
            <div class="text-caption text-medium-emphasis">Link:</div>
            <code>https://book.on-track.in/feedback/{{ bookingData.bookingId }}</code>
          </div>
          <div class="d-flex ga-2 mt-4">
            <v-btn color="success" :loading="sendingLink" @click="sendOTPGenerationLink">
              Send SMS{{
                bookingData.customerData?.fName ? ` to ${bookingData.customerData.fName}` : ''
              }}
            </v-btn>
            <v-btn color="success" variant="tonal" @click="copyDropPinLink">Copy Link</v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Image upload preview dialog -->
    <v-dialog v-model="imagePreviewModal" max-width="420">
      <v-card title="Upload Image">
        <v-card-text>
          <v-img v-if="imagePreview" :src="imagePreview" />
          <div v-if="imagePreview" class="text-right mt-3">
            <v-btn color="success" :loading="uploadingImage" @click="confirmUpload">Confirm</v-btn>
          </div>
          <div v-else>Please select an image first.</div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Adjust penalty dialog -->
    <v-dialog v-model="adjustPenaltyModal" max-width="380">
      <v-card title="Adjust Penalty">
        <v-card-text>
          <v-text-field
            v-model.number="penaltyCharge"
            type="number"
            label="How much is the penalty?"
          />
        </v-card-text>
        <v-card-actions>
          <v-btn variant="outlined" @click="adjustPenaltyModal = false">Cancel</v-btn>
          <v-spacer />
          <v-btn color="primary" :loading="savingPenalty" @click="updatePenalty">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Recovery info dialog -->
    <v-dialog v-model="recoveryInfoModal" max-width="480" scrollable>
      <v-card title="About these flags">
        <v-card-text>
          <div class="font-weight-bold">Forcefully Recovered</div>
          <p class="text-body-2 mb-3">
            Indicates that the recovery of the item, payment, or asset was achieved through direct
            and potentially aggressive means, rather than through regular channels — standard
            procedures were bypassed in favor of more assertive actions (legal intervention,
            repossession, etc.), highlighting minimal or nonexistent cooperation from the other
            party.
          </p>
          <div class="font-weight-bold">Blacklist Customer</div>
          <p class="text-body-2 mb-3">
            Marks a customer banned from engaging with the business due to past behavior —
            non-payment, fraud, repeated violations, or other unacceptable conduct. A blacklisted
            customer is generally prohibited from future transactions or accessing services.
          </p>
          <div class="font-weight-bold">Absconding</div>
          <p class="text-body-2">
            Identifies an individual who has deliberately avoided contact or responsibility,
            typically to evade obligations such as debt repayment or legal proceedings — critical
            for record-keeping and alerting relevant parties to the need for further investigation.
          </p>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>
