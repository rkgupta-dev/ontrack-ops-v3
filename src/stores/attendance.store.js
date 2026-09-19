import { defineStore } from 'pinia'
import * as attendanceApi from '../services/attendance/attendance.api'
import { getCurrentPosition, getDeviceInfo } from '../services/geolocation'
import { reverseGeocode } from '../services/geocode'
import { todayIsoDate } from '../utils/date'

// Candidate field names for "record has a punch-in/out timestamp" —
// defensive against the undocumented attendance-record response shape
// (docs/api-reference.md A-003/A-004/A-005: response fields were never
// captured). Extend this list once the real shape is confirmed.
const IN_FIELDS = ['punchInTime', 'punchInAt', 'inTime', 'checkInTime', 'punch_in']
const OUT_FIELDS = ['punchOutTime', 'punchOutAt', 'outTime', 'checkOutTime', 'punch_out']

function firstPresent(record, fields) {
  for (const field of fields) {
    if (record?.[field]) return record[field]
  }
  return null
}

export const useAttendanceStore = defineStore('attendance', {
  state: () => ({
    todayRecord: null,
    loading: false,
    punching: false,
    error: null,
    /** Set once a punch action succeeds this session, so the UI stays
     * correct even if the GET /attendance response shape doesn't match
     * any of the field names above. */
    localStatus: null, // null | 'in' | 'out'
  }),
  getters: {
    punchInTime: (state) => firstPresent(state.todayRecord, IN_FIELDS),
    punchOutTime: (state) => firstPresent(state.todayRecord, OUT_FIELDS),
    /** 'not_punched_in' | 'punched_in' | 'punched_out' | 'unknown' */
    status(state) {
      if (state.localStatus === 'in') return 'punched_in'
      if (state.localStatus === 'out') return 'punched_out'
      if (!state.todayRecord) return 'not_punched_in'
      if (this.punchOutTime) return 'punched_out'
      if (this.punchInTime) return 'punched_in'
      // A record exists but none of the known field names matched —
      // don't guess further than that.
      return 'unknown'
    },
  },
  actions: {
    /** A-003 — today's attendance record. */
    async fetchToday() {
      this.loading = true
      this.error = null
      try {
        this.todayRecord = await attendanceApi.getToday(todayIsoDate())
      } catch (error) {
        this.error = error
        throw error
      } finally {
        this.loading = false
      }
    },

    async _captureLocationPayload() {
      const { lat, long } = await getCurrentPosition()
      const place = await reverseGeocode(lat, long)
      return { device: getDeviceInfo(), lat, long, place }
    },

    /**
     * A-004 — punch in. `location` ({ lat, long, place }) is optional — the
     * page fetches + displays it up front (mirroring the old app's
     * "Location Detected" step) and passes it through here so punching in
     * doesn't re-prompt for geolocation; falls back to capturing fresh if
     * the caller doesn't have one yet.
     *
     * The punch endpoint's own response shape isn't documented ("not read,
     * or read indirectly"), so — matching the old app's profile.vue, which
     * always calls getAttendance() right after punching — this re-fetches
     * today's record from A-003 rather than trusting the punch response.
     */
    async punchIn(location) {
      this.punching = true
      this.error = null
      try {
        const payload = location
          ? {
              device: getDeviceInfo(),
              lat: location.lat,
              long: location.long,
              place: location.place,
            }
          : await this._captureLocationPayload()
        await attendanceApi.punchIn(payload)
        this.todayRecord = await attendanceApi.getToday(todayIsoDate())
        this.localStatus = 'in'
      } catch (error) {
        this.error = error
        throw error
      } finally {
        this.punching = false
      }
    },

    /**
     * A-005 — punch out. The old app's profile.vue does NOT log the agent
     * out or navigate away on punch-out — it stays on the page and shows
     * the day's final work duration (confirmed against the real running
     * app, 2026-09-18); docs/api-reference.md's "dispatches authLogout"
     * note turned out not to reflect that call site. See `punchIn` above
     * for why `location` is optional and why this re-fetches afterwards.
     */
    async punchOut(location) {
      this.punching = true
      this.error = null
      try {
        const payload = location
          ? {
              device: getDeviceInfo(),
              lat: location.lat,
              long: location.long,
              place: location.place,
            }
          : await this._captureLocationPayload()
        await attendanceApi.punchOut(payload)
        this.todayRecord = await attendanceApi.getToday(todayIsoDate())
        this.localStatus = 'out'
      } catch (error) {
        this.error = error
        throw error
      } finally {
        this.punching = false
      }
    },
  },
})
