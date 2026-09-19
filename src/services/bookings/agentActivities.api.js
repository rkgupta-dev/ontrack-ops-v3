import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

/**
 * A-008 — GET /operations/agentActivities
 *
 * Response envelope matches the old app's read: `{ rows, count }`. Row
 * fields it reads: `type`, `description`, `createdAt`, `userAgentData.name`.
 */
export async function fetchAgentActivities({ bookingId, page = 1, limit = 10 }) {
  const response = await v2Client.get(ENDPOINTS.AGENT_ACTIVITIES, {
    params: { bookingId, limit, offset: (page - 1) * limit },
  })
  const data = response.data ?? {}
  return { rows: Array.isArray(data.rows) ? data.rows : [], total: data.count ?? 0 }
}
