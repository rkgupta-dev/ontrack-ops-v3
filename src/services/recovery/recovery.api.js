import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

/**
 * A-136 — GET /operations/recovery-list
 *
 * Query: `limit`, `offset`, `status` (0 = pending, 1 = recovered; omitted
 * for all), `search` (reg no / booking id / customer name), `expiredDays`.
 * Response — CONFIRMED live 2026-09-23: a **bare array** (no `{ count, rows }`
 * envelope, so there's no total — "has more" is inferred from a full page).
 * Each row: `id`, `booking`, `vehicle`, `status`, `comment`,
 * `closingComment`, `address`, `createdAt`, plus embedded `bookingData`
 * (with `customerData`) and `vehicleData` (with `modelData`).
 */
export async function fetchRecoveryList({ limit, offset, status, search, expiredDays } = {}) {
  const response = await v2Client.get(ENDPOINTS.RECOVERY_LIST, {
    params: {
      limit,
      offset,
      status: status ?? undefined,
      search: search || undefined,
      expiredDays: expiredDays ?? undefined,
    },
  })
  return Array.isArray(response.data) ? response.data : []
}

/**
 * A-137 — comments on one recovery record. Response `{ data: [...] }`, each
 * `{ id, comment, createdAt, agentData: { name } }` (old app's reads).
 */
export async function fetchRecoveryComments(recoveryId) {
  const response = await v2Client.get(ENDPOINTS.RECOVERY_COMMENTS(recoveryId))
  const rows = Array.isArray(response.data?.data) ? response.data.data : []
  return rows.map((c) => ({
    id: c.id,
    agent: c.agentData?.name || 'Unknown',
    text: c.comment,
    createdAt: c.createdAt,
  }))
}

/** A-138 — the old app prefixes every comment with "Recovery - ". */
export async function addRecoveryComment(recoveryId, comment) {
  const response = await v2Client.post(ENDPOINTS.RECOVERY_ADD_COMMENT, {
    recoveryId,
    comment: `Recovery - ${comment}`,
  })
  return response.data
}

/** A-135 — mark as recovered. `recoveryId` is the recovery record's id. */
export async function closeRecovery(recoveryId, closingComment) {
  const response = await v2Client.post(ENDPOINTS.RECOVERY_CLOSE(recoveryId), { closingComment })
  return response.data
}
