import { NextResponse } from 'next/server'
import {
  daysAgoIso,
  likeOf,
  listAuthUsers,
  listGenerations,
  listUserProfiles,
} from '../../../lib/admin-data'
import { errorResponse } from '../../../lib/api-response'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WINDOW_DAYS = 30
const FLAG_LIMIT = 50

/**
 * "RAG moderation" in this project means the retrieved context that gets
 * injected into the generation prompt: each user's `user_profiles` row
 * (name / headline / background_json), plus the generations where that context
 * visibly leaked into the output (`bmc_used`) or drew negative feedback.
 */
export async function GET() {
  try {
    const [profiles, users, rows] = await Promise.all([
      listUserProfiles(),
      listAuthUsers(),
      listGenerations({ sinceIso: daysAgoIso(WINDOW_DAYS) }),
    ])

    const emailById = new Map(users.map((u) => [u.id, u.email]))

    const usageByUser = new Map<string, { total: number; bmc: number }>()
    for (const r of rows) {
      const s = usageByUser.get(r.user_id) ?? { total: 0, bmc: 0 }
      s.total += 1
      if (r.bmc_used) s.bmc += 1
      usageByUser.set(r.user_id, s)
    }

    const contexts = profiles.map((p) => {
      const s = usageByUser.get(p.user_id) ?? { total: 0, bmc: 0 }
      const fields = Object.keys(p.background_json ?? {})
      return {
        userId: p.user_id,
        email: emailById.get(p.user_id) ?? null,
        name: p.name,
        headline: p.headline,
        fieldCount: fields.length,
        fields,
        background: p.background_json ?? {},
        tonePreferences: p.tone_preferences,
        updatedAt: p.updated_at,
        generations: s.total,
        bmcUsed: s.bmc,
        bmcRate: s.total ? s.bmc / s.total : null,
      }
    })

    const usersWithoutProfile = users
      .filter((u) => !profiles.some((p) => p.user_id === u.id))
      .map((u) => ({ id: u.id, email: u.email, createdAt: u.createdAt }))

    const flagged = rows
      .filter((r) => r.bmc_used || likeOf(r) === 'disliked')
      .slice(0, FLAG_LIMIT)
      .map((r) => ({
        id: r.id,
        userId: r.user_id,
        email: emailById.get(r.user_id) ?? null,
        createdAt: r.created_at,
        category: r.category,
        postText: r.post_text,
        comment1: r.comment_1,
        comment2: r.comment_2,
        bmcUsed: r.bmc_used,
        like: likeOf(r),
        reasons: [
          r.bmc_used ? ('bmc-context' as const) : null,
          likeOf(r) === 'disliked' ? ('disliked' as const) : null,
        ].filter(Boolean) as Array<'bmc-context' | 'disliked'>,
      }))

    return NextResponse.json({
      contexts,
      usersWithoutProfile,
      flagged,
      windowDays: WINDOW_DAYS,
      totals: {
        profiles: profiles.length,
        generations: rows.length,
        bmcUsed: rows.filter((r) => r.bmc_used).length,
        disliked: rows.filter((r) => likeOf(r) === 'disliked').length,
      },
    })
  } catch (err) {
    return errorResponse(err)
  }
}
