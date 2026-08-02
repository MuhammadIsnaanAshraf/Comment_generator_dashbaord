import { NextResponse, type NextRequest } from 'next/server'
import {
  daysAgoIso,
  likeOf,
  listAuthUsers,
  listGenerations,
  listModerationReviews,
  listUserProfiles,
  outcomeOf,
  tally,
  upsertModerationReviews,
} from '../../../../lib/admin-data'
import { errorResponse } from '../../../../lib/api-response'
import { bestRelevance } from '../../../../lib/relevance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WINDOW_DAYS = 90
/** Below this lexical relevance a comment reads as generic filler. */
const LOW_RELEVANCE = 0.15

export async function GET(request: NextRequest) {
  try {
    const days = clampInt(request.nextUrl.searchParams.get('days'), WINDOW_DAYS, 1, 365)

    const [rows, reviews, users, profiles] = await Promise.all([
      listGenerations({ sinceIso: daysAgoIso(days) }),
      listModerationReviews(),
      listAuthUsers(),
      listUserProfiles(),
    ])

    const emailById = new Map(users.map((u) => [u.id, u.email]))
    const nameById = new Map(profiles.map((p) => [p.user_id, p.name]))
    const reviewById = new Map((reviews ?? []).map((r) => [r.generation_id, r]))

    const entries = rows.map((r) => {
      const relevance = bestRelevance(r.post_text, r.comment_1, r.comment_2)
      const review = reviewById.get(r.id)
      const like = likeOf(r)

      const flags: string[] = []
      if (!r.comment_1 && !r.comment_2) flags.push('no-output')
      if (relevance != null && relevance < LOW_RELEVANCE) flags.push('low-relevance')
      if (r.bmc_used) flags.push('bmc-context')
      if (like === 'disliked') flags.push('disliked')

      return {
        id: r.id,
        userId: r.user_id,
        email: emailById.get(r.user_id) ?? null,
        name: nameById.get(r.user_id) ?? null,
        createdAt: r.created_at,
        category: r.category,
        stance: r.stance_1,
        postText: r.post_text,
        comment1: r.comment_1,
        comment2: r.comment_2,
        bmcUsed: r.bmc_used,
        like,
        outcome: outcomeOf(r),
        relevance,
        flags,
        status: review?.status ?? ('pending' as const),
        reviewedAt: review?.reviewed_at ?? null,
      }
    })

    const scored = entries
      .map((e) => e.relevance)
      .filter((s): s is number => s !== null)

    return NextResponse.json({
      entries,
      // null tells the UI the moderation_reviews migration is still pending.
      reviewsAvailable: reviews !== null,
      windowDays: days,
      summary: {
        total: entries.length,
        pending: entries.filter((e) => e.status === 'pending').length,
        approved: entries.filter((e) => e.status === 'approved').length,
        rejected: entries.filter((e) => e.status === 'rejected').length,
        flagged: entries.filter((e) => e.flags.length > 0).length,
        avgRelevance: scored.length
          ? scored.reduce((sum, s) => sum + s, 0) / scored.length
          : null,
        lowRelevance: entries.filter((e) => e.flags.includes('low-relevance')).length,
        bmcUsed: entries.filter((e) => e.bmcUsed).length,
        disliked: entries.filter((e) => e.like === 'disliked').length,
        noOutput: entries.filter((e) => e.flags.includes('no-output')).length,
        categories: tally(entries.map((e) => e.category)),
        stances: tally(entries.map((e) => e.stance)),
      },
    })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const ids: unknown = body?.ids
    const status: unknown = body?.status

    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string') || ids.length === 0) {
      return NextResponse.json({ error: '`ids` must be a non-empty array of strings.' }, { status: 400 })
    }
    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: '`status` must be "approved" or "rejected".' }, { status: 400 })
    }

    const result = await upsertModerationReviews(ids as string[], status, body?.note)
    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            'The moderation_reviews table does not exist yet. Apply backend/supabase/migrations/20240302000000_create_moderation_reviews.sql, then retry.',
          code: 'missing_table',
        },
        { status: 409 }
      )
    }

    return NextResponse.json({ updated: ids.length, status })
  } catch (err) {
    return errorResponse(err)
  }
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = raw == null ? NaN : Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}
