import { defineStore } from 'pinia'
import * as bookingDetailApi from '../services/bookings/bookingDetail.api'

/**
 * Single-booking working state for the detail dashboard
 * (src/pages/bookings/BookingDetailPage.vue) — deliberately separate from
 * bookings.store.js (list-page state) rather than overloading it, per the
 * migration plan. Holds the current booking record plus every mutating
 * action the detail page's modals trigger; each action refetches the
 * booking afterwards so the page reflects the real server state rather
 * than a locally-patched guess.
 */
export const useBookingDetailStore = defineStore('bookingDetail', {
  state: () => ({
    booking: null,
    loading: false,
    error: null,
    actionPending: false,
  }),
  actions: {
    async fetch(bookingId) {
      this.loading = true
      this.error = null
      try {
        this.booking = await bookingDetailApi.fetchBookingDetail(bookingId)
      } catch (error) {
        this.error = error
        throw error
      } finally {
        this.loading = false
      }
    },

    async _mutate(fn) {
      this.actionPending = true
      try {
        const result = await fn()
        await this.fetch(this.booking.bookingId)
        return result
      } finally {
        this.actionPending = false
      }
    },

    cancelBooking(payload) {
      return this._mutate(() => bookingDetailApi.cancelBooking(this.booking.bookingId, payload))
    },
    reinitiateBooking(description) {
      return this._mutate(() =>
        bookingDetailApi.reinitiateBooking(this.booking.bookingId, description),
      )
    },
    addToRecovery(payload) {
      return this._mutate(() => bookingDetailApi.addToRecovery(this.booking.id, payload))
    },
    removeFromRecovery(recoveryId) {
      return this._mutate(() => bookingDetailApi.removeFromRecovery(recoveryId))
    },
    updatePayment(orderId) {
      return this._mutate(() => bookingDetailApi.updatePayment(this.booking.bookingId, orderId))
    },
    updatePenalty(outstanding) {
      return this._mutate(() =>
        bookingDetailApi.updatePenalty(
          this.booking.customerData.id,
          this.booking.bookingId,
          outstanding,
        ),
      )
    },
    updateDeliveryType(payload) {
      return this._mutate(() => bookingDetailApi.updateDeliveryType(payload))
    },
  },
})
