import { NextResponse, type NextRequest } from 'next/server'
import {
  WINDOW_ROW_CAP,
  daysAgoIso,
  likeOf,
  listAuthUsers,
  listGenerations,
  listUserProfiles,
  outcomeOf,
} from '../../../lib/admin-data'
import { errorResponse } from '../../../lib/api-response'
import type { GenerationFeedItem } from '../../../types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 100
const DEFAULT_WINDOW_DAYS = 30

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const limit = clampInt(params.get('limit'), DEFAULT_LIMIT, 1, WINDOW_ROW_CAP)
    const days = clampInt(params.get('days'), DEFAULT_WINDOW_DAYS, 1, 365)
    const userId = params.get('userId') ?? undefined

    const [rows, users, profiles] = await Promise.all([
      listGenerations({ sinceIso: daysAgoIso(days), limit, userId }),
      listAuthUsers(),
      listUserProfiles(),
    ])

    const emailById = new Map(users.map((u) => [u.id, u.email]))
    const nameById = new Map(profiles.map((p) => [p.user_id, p.name]))

    const items: GenerationFeedItem[] = rows.map((r) => ({
      ...r,
      userEmail: emailById.get(r.user_id) ?? null,
      userName: nameById.get(r.user_id) ?? null,
      outcome: outcomeOf(r),
      like: likeOf(r),
    }))

    return NextResponse.json({ items, total: items.length, windowDays: days })
  } catch (err) {
    return errorResponse(err)
  }
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = raw == null ? NaN : Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}
