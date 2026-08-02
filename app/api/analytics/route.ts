import { NextResponse, type NextRequest } from 'next/server'
import {
  WINDOW_ROW_CAP,
  bucketByDay,
  daysAgoIso,
  listGenerations,
  outcomeOf,
  tally,
} from '../../../lib/admin-data'
import { errorResponse } from '../../../lib/api-response'
import type { AnalyticsResponse } from '../../../types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_WINDOW_DAYS = 30

export async function GET(request: NextRequest) {
  try {
    const raw = Number.parseInt(request.nextUrl.searchParams.get('days') ?? '', 10)
    const days = Number.isFinite(raw) ? Math.min(90, Math.max(7, raw)) : DEFAULT_WINDOW_DAYS

    const rows = await listGenerations({ sinceIso: daysAgoIso(days) })

    const body: AnalyticsResponse = {
      perDay: bucketByDay(rows, days),
      categories: tally(rows.map((r) => r.category)),
      // stance_1 and stance_2 are two independent draws from the same space,
      // so both count toward the distribution.
      stances: tally([...rows.map((r) => r.stance_1), ...rows.map((r) => r.stance_2)]),
      outcomes: tally(rows.map((r) => outcomeOf(r))),
      bmcUsed: rows.filter((r) => r.bmc_used).length,
      total: rows.length,
      windowDays: days,
      windowTruncated: rows.length >= WINDOW_ROW_CAP,
    }

    return NextResponse.json(body)
  } catch (err) {
    return errorResponse(err)
  }
}
