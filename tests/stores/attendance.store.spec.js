import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAttendanceStore } from '../../src/stores/attendance.store'
import { useAuthStore } from '../../src/stores/auth.store'
import * as attendanceApi from '../../src/services/attendance/attendance.api'
import * as geolocation from '../../src/services/geolocation'
import * as geocode from '../../src/services/geocode'

vi.mock('../../src/services/attendance/attendance.api')
vi.mock('../../src/services/geolocation')
vi.mock('../../src/services/geocode')

describe('attendance store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    geolocation.getCurrentPosition.mockResolvedValue({ lat: 1, long: 2 })
    geolocation.getDeviceInfo.mockReturnValue('test-device')
    geocode.reverseGeocode.mockResolvedValue('Somewhere, City')
  })

  it('fetchToday stores the record returned by the API (A-003)', async () => {
    attendanceApi.getToday.mockResolvedValue({ punchInTime: '2026-09-07T09:00:00Z' })
    const store = useAttendanceStore()

    await store.fetchToday()

    expect(store.todayRecord).toEqual({ punchInTime: '2026-09-07T09:00:00Z' })
    expect(store.status).toBe('punched_in')
  })

  it('fetchToday reflects "not punched in" when there is no record yet', async () => {
    attendanceApi.getToday.mockResolvedValue(null)
    const store = useAttendanceStore()

    await store.fetchToday()

    expect(store.todayRecord).toBeNull()
    expect(store.status).toBe('not_punched_in')
  })

  it('fetchToday surfaces API errors', async () => {
    attendanceApi.getToday.mockRejectedValue(new Error('network error'))
    const store = useAttendanceStore()

    await expect(store.fetchToday()).rejects.toThrow('network error')
    expect(store.error).toBeInstanceOf(Error)
  })

  it("punchIn captures device/location, sends them to the API (A-004), then re-fetches today's record", async () => {
    attendanceApi.punchIn.mockResolvedValue({ message: 'ok' })
    attendanceApi.getToday.mockResolvedValue({ punchInTime: '2026-09-18T09:00:00Z' })
    const store = useAttendanceStore()

    await store.punchIn()

    expect(attendanceApi.punchIn).toHaveBeenCalledWith({
      device: 'test-device',
      lat: 1,
      long: 2,
      place: 'Somewhere, City',
    })
    expect(attendanceApi.getToday).toHaveBeenCalled()
    expect(store.todayRecord).toEqual({ punchInTime: '2026-09-18T09:00:00Z' })
    expect(store.status).toBe('punched_in')
  })

  it("punchOut succeeds, re-fetches today's record, and does NOT log the user out", async () => {
    // The old app's profile.vue stays on the page after punch-out and shows
    // the day's final work duration — it does not end the session, despite
    // docs/api-reference.md's "dispatches authLogout" note for A-005 (that
    // turned out not to reflect this call site — confirmed against the
    // real running app).
    attendanceApi.punchOut.mockResolvedValue({ message: 'ok' })
    attendanceApi.getToday.mockResolvedValue({
      punchInTime: '2026-09-18T09:00:00Z',
      punchOutTime: '2026-09-18T17:00:00Z',
    })
    const authStore = useAuthStore()
    const logoutSpy = vi.spyOn(authStore, 'logout')
    const store = useAttendanceStore()

    await store.punchOut()

    expect(attendanceApi.punchOut).toHaveBeenCalledWith({
      device: 'test-device',
      lat: 1,
      long: 2,
      place: 'Somewhere, City',
    })
    expect(attendanceApi.getToday).toHaveBeenCalled()
    expect(store.punchInTime).toBe('2026-09-18T09:00:00Z')
    expect(store.punchOutTime).toBe('2026-09-18T17:00:00Z')
    expect(logoutSpy).not.toHaveBeenCalled()
    expect(store.status).toBe('punched_out')
  })

  it("punchOut surfaces API errors without touching today's record", async () => {
    attendanceApi.punchOut.mockRejectedValue(new Error('network error'))
    const authStore = useAuthStore()
    const logoutSpy = vi.spyOn(authStore, 'logout')
    const store = useAttendanceStore()

    await expect(store.punchOut()).rejects.toThrow('network error')

    expect(logoutSpy).not.toHaveBeenCalled()
    expect(attendanceApi.getToday).not.toHaveBeenCalled()
  })
})
