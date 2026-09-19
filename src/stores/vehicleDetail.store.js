import { defineStore } from 'pinia'
import * as vehicleDetailApi from '../services/vehicles/vehicleDetail.api'

/**
 * Single-vehicle working state for the detail hub
 * (src/pages/vehicles/VehicleDetailPage.vue) — mirrors bookingDetail.store.js's
 * shape: holds the current vehicle record plus every mutating action the
 * detail page's tabs/modals trigger, each refetching the vehicle afterwards.
 */
export const useVehicleDetailStore = defineStore('vehicleDetail', {
  state: () => ({
    vehicle: null,
    loading: false,
    error: null,
    actionPending: false,
  }),
  actions: {
    async fetch(vehicleId) {
      this.loading = true
      this.error = null
      try {
        this.vehicle = await vehicleDetailApi.fetchVehicleDetail(vehicleId)
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
        await this.fetch(this.vehicle.id)
        return result
      } finally {
        this.actionPending = false
      }
    },

    updateField(fields) {
      return this._mutate(() => vehicleDetailApi.updateVehicleField(this.vehicle.id, fields))
    },
    updateLocation(locationId) {
      return this._mutate(() => vehicleDetailApi.updateVehicleLocation(this.vehicle.id, locationId))
    },
    updateStatus(status) {
      return this._mutate(() => vehicleDetailApi.updateVehicleStatus(this.vehicle.id, status))
    },
    toggleGps(payload) {
      return this._mutate(() => vehicleDetailApi.toggleGpsStatus(this.vehicle.id, payload))
    },
    uploadImage(file, type) {
      return this._mutate(() => vehicleDetailApi.uploadVehicleImage(this.vehicle.id, file, type))
    },
    updateResale(payload) {
      return this._mutate(() => vehicleDetailApi.updateResaleListing(payload))
    },
    blockSwapKey() {
      return this._mutate(() => vehicleDetailApi.blockSwapKey(this.vehicle.swapKeyId))
    },
    unblockSwapKey() {
      return this._mutate(() => vehicleDetailApi.unblockSwapKey(this.vehicle.swapKeyId))
    },
  },
})
