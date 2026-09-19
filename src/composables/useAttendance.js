import { storeToRefs } from 'pinia'
import { useAttendanceStore } from '../stores/attendance.store'

/** Thin facade over the attendance store for page components. */
export function useAttendance() {
  const store = useAttendanceStore()
  const { todayRecord, loading, punching, error, status, punchInTime, punchOutTime } =
    storeToRefs(store)

  return {
    todayRecord,
    loading,
    punching,
    error,
    status,
    punchInTime,
    punchOutTime,
    fetchToday: store.fetchToday,
    punchIn: store.punchIn,
    punchOut: store.punchOut,
  }
}
