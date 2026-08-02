import { NextResponse } from 'next/server'
import {
  WINDOW_ROW_CAP,
  countGenerations,
  daysAgoIso,
  joinUserActivity,
  likeOf,
  listAuthUsers,
  listGenerations,
  listUserProfiles,
  outcomeOf,
  startOfTodayIso,
} from '../../../lib/admin-data'
import { errorResponse } from '../../../lib/api-response'
import { isSupabaseAdminConfigured } from '../../../lib/supabase-admin'
import type { OverviewResponse, ServiceStatus, SystemAlert } from '../../../types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WINDOW_DAYS = 30
/** Below this used-rate the console raises a quality alert. */
const LOW_USED_RATE = 0.25
/** BMC background appearing in more than this share of output is over-use. */
const BMC_OVERUSE_RATE = 0.5

export async function GET() {
  try {
    const sinceIso = daysAgoIso(WINDOW_DAYS)
    const todayIso = startOfTodayIso()

    const [users, profiles, window, generationsTotal, generationsToday] = await Promise.all([
      listAuthUsers(),
      listUserProfiles(),
      listGenerations({ sinceIso }),
      countGenerations(),
      countGenerations(todayIso),
    ])

    const enriched = joinUserActivity(users, profiles, window)

    const active7d = new Set(
      window.filter((g) => g.created_at >= daysAgoIso(7)).map((g) => g.user_id)
    )
    const active30d = new Set(window.map((g) => g.user_id))

    const withOutcome = window.filter((g) => g.used_comment !== null || g.comment_1 !== null)
    const usedCount = window.filter((g) => outcomeOf(g) !== 'unused').length
    const rated = window.map(likeOf).filter((v): v is 'liked' | 'disliked' => v !== null)
    const likedCount = rated.filter((v) => v === 'liked').length

    const alerts = buildAlerts(window, enriched)
    const services = buildServices(window, generationsTotal)

    const body: OverviewResponse = {
      totalUsers: users.length,
      newUsersToday: users.filter((u) => u.createdAt >= todayIso).length,
      newUsers7d: users.filter((u) => u.createdAt >= daysAgoIso(7)).length,
      activeUsers7d: active7d.size,
      activeUsers30d: active30d.size,
      generationsToday,
      generationsTotal,
      generations30d: window.length,
      usedRate: withOutcome.length ? usedCount / window.length : null,
      likeRate: rated.length ? likedCount / rated.length : null,
      recentSignups: enriched.slice(0, 5),
      alerts,
      services,
      windowTruncated: window.length >= WINDOW_ROW_CAP,
    }

    return NextResponse.json(body)
  } catch (err) {
    return errorResponse(err)
  }
}

/**
 * Alerts are derived from the data we actually record. There is no error/latency
 * telemetry in generation_log, so "generation failed" here means a row that was
 * written without any comment text — the observable failure signature.
 */
function buildAlerts(
  window: Awaited<ReturnType<typeof listGenerations>>,
  users: Awaited<ReturnType<typeof joinUserActivity>>
): SystemAlert[] {
  const alerts: SystemAlert[] = []

  const empty = window.filter((g) => !g.comment_1 && !g.comment_2)
  if (empty.length) {
    alerts.push({
      id: 'empty-generations',
      severity: 'critical',
      title: 'Generation produced no output',
      detail: `${empty.length} generation${empty.length === 1 ? '' : 's'} in the last ${WINDOW_DAYS} days were logged with no comment text.`,
      timestamp: empty[0].created_at,
    })
  }

  const disliked = window.filter((g) => likeOf(g) === 'disliked')
  if (disliked.length >= 3) {
    alerts.push({
      id: 'disliked',
      severity: 'warning',
      title: 'Negative feedback cluster',
      detail: `${disliked.length} generations were explicitly disliked in the last ${WINDOW_DAYS} days.`,
      timestamp: disliked[0].created_at,
    })
  }

  const bmc = window.filter((g) => g.bmc_used).length
  if (window.length >= 10 && bmc / window.length > BMC_OVERUSE_RATE) {
    alerts.push({
      id: 'bmc-overuse',
      severity: 'warning',
      title: 'BMC background over-used',
      detail: `BMC context appeared in ${Math.round((bmc / window.length) * 100)}% of generations — the suppression threshold may need tuning.`,
      timestamp: window[0]?.created_at ?? null,
    })
  }

  const used = window.filter((g) => outcomeOf(g) !== 'unused').length
  if (window.length >= 20 && used / window.length < LOW_USED_RATE) {
    alerts.push({
      id: 'low-used-rate',
      severity: 'warning',
      title: 'Low comment adoption',
      detail: `Only ${Math.round((used / window.length) * 100)}% of generated comments were used or edited into a post.`,
      timestamp: null,
    })
  }

  const unconfirmed = users.filter((u) => !u.confirmed).length
  if (unconfirmed) {
    alerts.push({
      id: 'unconfirmed',
      severity: 'info',
      title: 'Pending email confirmations',
      detail: `${unconfirmed} account${unconfirmed === 1 ? '' : 's'} have not confirmed their email address.`,
      timestamp: null,
    })
  }

  if (!alerts.length) {
    alerts.push({
      id: 'nominal',
      severity: 'info',
      title: 'No active alerts',
      detail: `Nothing anomalous in the last ${WINDOW_DAYS} days of generation activity.`,
      timestamp: null,
    })
  }

  return alerts
}

function buildServices(
  window: Awaited<ReturnType<typeof listGenerations>>,
  total: number
): ServiceStatus[] {
  const lastGeneration = window[0]?.created_at ?? null
  const hoursSince = lastGeneration
    ? (Date.now() - +new Date(lastGeneration)) / 3_600_000
    : null

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.BACKEND_URL ?? ''

  return [
    {
      id: 'supabase',
      label: 'Supabase',
      state: isSupabaseAdminConfigured ? 'ok' : 'down',
      detail: isSupabaseAdminConfigured ? 'service role connected' : 'not configured',
    },
    {
      id: 'generation-log',
      label: 'Generation log',
      state: 'ok',
      detail: `${total.toLocaleString()} rows`,
    },
    {
      id: 'pipeline',
      label: 'Generation pipeline',
      state: hoursSince === null ? 'unknown' : hoursSince < 24 ? 'ok' : 'degraded',
      detail:
        hoursSince === null
          ? 'no activity recorded'
          : hoursSince < 1
            ? 'active in the last hour'
            : `last run ${Math.round(hoursSince)}h ago`,
    },
    {
      id: 'backend',
      label: 'Backend API',
      state: backendUrl ? 'unknown' : 'down',
      detail: backendUrl ? backendUrl : 'BACKEND_URL not set',
    },
  ]
}
