import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

function normalize(data) {
  const list = (value) => (Array.isArray(value) ? value : [])
  return {
    totals: list(data?.totals),
    attributedCount: data?.attributedCount ?? null,
    bySource: list(data?.bySource),
    bySourceMedium: list(data?.bySourceMedium),
    bySourceCampaign: list(data?.bySourceCampaign),
    byPlatform: list(data?.byPlatform),
    byAttributionType: list(data?.byAttributionType),
  }
}

/**
 * A-016 — GET attribution/analytics/traffic-attribution
 *
 * Query: `startDate`, `endDate` — epoch ms (local start/end of day).
 * Response — CONFIRMED 2026-09-24: `{ success, type, totals[3], attributedCount,
 * bySource, bySourceMedium, bySourceCampaign, byPlatform, byAttributionType }`.
 * `totals` are Traffic / Signed Up / Converted with `count`, `previousCount`,
 * `change`, `changePercent`, `trend` ('up'|'down'); every group row adds
 * `label`, `signedUp`, `converted`. The previous period is computed server-side.
 */
export async function fetchTrafficAttribution({ startDate, endDate }) {
  const response = await v2Client.get(ENDPOINTS.TRAFFIC_ATTRIBUTION, {
    params: { startDate, endDate },
  })
  return normalize(response.data)
}

/**
 * A-017 — GET attribution/analytics/traffic-attribution-by-value
 *
 * Query: `startDate`, `endDate` (epoch ms), `sortBy` ('count' | 'signedUp' |
 * 'converted'), `sortOrder` ('asc' | 'desc'). Same envelope as A-016, per the
 * backend controller (`getTrafficAttributionStatsByValue`): group rows carry
 * `signup_conversion_rate` / `booking_conversion_rate` as "12.34" strings and
 * no trend fields; the Signed Up / Converted totals carry
 * `signed_up_conversion_rate` / `booking_conversion_rate`.
 */
export async function fetchTrafficAttributionByValue({ startDate, endDate, sortBy, sortOrder }) {
  const response = await v2Client.get(ENDPOINTS.TRAFFIC_ATTRIBUTION_BY_VALUE, {
    params: { startDate, endDate, sortBy, sortOrder },
  })
  return normalize(response.data)
}
