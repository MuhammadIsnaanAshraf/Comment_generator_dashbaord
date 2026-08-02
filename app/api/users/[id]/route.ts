import { NextResponse } from 'next/server'
import {
  bucketByDay,
  daysAgoIso,
  likeOf,
  listBillingPlans,
  listGenerations,
  listSubscriptions,
  listUserProfiles,
  outcomeOf,
  tally,
} from '../../../../lib/admin-data'
import { getSupabaseAdmin } from '../../../../lib/supabase-admin'
import { assertConfigured } from '../../../../lib/admin-data'
import { errorResponse } from '../../../../lib/api-response'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WINDOW_DAYS = 30

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    assertConfigured()
    const supabase = getSupabaseAdmin()

    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(params.id)
    if (authError) return NextResponse.json({ error: authError.message }, { status: 404 })
    const authUser = authData.user
    if (!authUser) return NextResponse.json({ error: 'User not found.' }, { status: 404 })

    const [profiles, generations, subscriptions, plans] = await Promise.all([
      listUserProfiles(),
      listGenerations({ userId: params.id, sinceIso: daysAgoIso(WINDOW_DAYS) }),
      listSubscriptions(),
      listBillingPlans(),
    ])

    const profile = profiles.find((p) => p.user_id === params.id) ?? null

    const subscription = subscriptions?.find(
      (s) => s.user_id === params.id && s.status !== 'canceled'
    )
    const plan = plans?.find((p) => p.id === subscription?.plan_id) ?? null

    const rated = generations.map(likeOf).filter((v): v is 'liked' | 'disliked' => v !== null)

    return NextResponse.json({
      user: {
        id: authUser.id,
        email: authUser.email ?? null,
        createdAt: authUser.created_at,
        lastSignInAt: authUser.last_sign_in_at ?? null,
        confirmed: Boolean(authUser.email_confirmed_at ?? (authUser as any).confirmed_at),
        name: profile?.name ?? null,
        headline: profile?.headline ?? null,
      },
      profile: profile
        ? {
            background: profile.background_json ?? {},
            tonePreferences: profile.tone_preferences,
            updatedAt: profile.updated_at,
          }
        : null,
      usage: {
        windowDays: WINDOW_DAYS,
        perDay: bucketByDay(generations, WINDOW_DAYS),
        total: generations.length,
        used: generations.filter((g) => outcomeOf(g) === 'used').length,
        edited: generations.filter((g) => outcomeOf(g) === 'edited').length,
        unused: generations.filter((g) => outcomeOf(g) === 'unused').length,
        liked: rated.filter((v) => v === 'liked').length,
        disliked: rated.filter((v) => v === 'disliked').length,
        bmcUsed: generations.filter((g) => g.bmc_used).length,
        categories: tally(generations.map((g) => g.category)),
        stances: tally([
          ...generations.map((g) => g.stance_1),
          ...generations.map((g) => g.stance_2),
        ]),
        lastGenerationAt: generations[0]?.created_at ?? null,
      },
      billing: {
        // null means the billing migration has not been applied yet.
        available: plans !== null && subscriptions !== null,
        planName: plan?.name ?? null,
        priceUsd: plan ? Number(plan.price_usd) : null,
        apiRequestsPerMonth: plan?.api_requests_per_month ?? null,
        status: subscription?.status ?? null,
        renewalDate: subscription?.renewal_date ?? null,
      },
      recent: generations.slice(0, 10).map((g) => ({
        id: g.id,
        createdAt: g.created_at,
        category: g.category,
        stance: g.stance_1,
        postText: g.post_text,
        outcome: outcomeOf(g),
        like: likeOf(g),
      })),
    })
  } catch (err) {
    return errorResponse(err)
  }
}
