import { NextResponse, type NextRequest } from 'next/server'
import {
  listAuthUsers,
  listBillingPlans,
  listInvoices,
  listSubscriptions,
  isMissingTable,
} from '../../../lib/admin-data'
import { getSupabaseAdmin } from '../../../lib/supabase-admin'
import { errorResponse } from '../../../lib/api-response'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TREND_MONTHS = 6

export async function GET() {
  try {
    const [plans, subscriptions, invoices, users] = await Promise.all([
      listBillingPlans(),
      listSubscriptions(),
      listInvoices(),
      listAuthUsers(),
    ])

    // Any missing table means the billing migration hasn't been applied.
    if (plans === null || subscriptions === null || invoices === null) {
      return NextResponse.json({
        available: false,
        migration: 'backend/supabase/migrations/20240301000000_create_billing_tables.sql',
        missing: [
          plans === null ? 'billing_plans' : null,
          subscriptions === null ? 'subscriptions' : null,
          invoices === null ? 'invoices' : null,
        ].filter(Boolean),
        totalUsers: users.length,
      })
    }

    const priceById = new Map(plans.map((p) => [p.id, Number(p.price_usd)]))
    const emailById = new Map(users.map((u) => [u.id, u.email]))

    const live = subscriptions.filter((s) => s.status !== 'canceled')
    const mrr = live.reduce((sum, s) => sum + (priceById.get(s.plan_id) ?? 0), 0)

    // MRR per month = the plan value of subscriptions live at each month end.
    // Derived from started_at/canceled_at, so it is a reconstruction of what
    // was billable, not a record of money actually collected.
    const trend = buildTrend(live, subscriptions, priceById)

    const distribution = plans.map((p) => ({
      planId: p.id,
      name: p.name,
      count: live.filter((s) => s.plan_id === p.id).length,
    }))
    const assigned = live.length

    return NextResponse.json({
      available: true,
      mrr,
      arr: mrr * 12,
      activeSubscriptions: assigned,
      unassignedUsers: users.length - assigned,
      totalUsers: users.length,
      trend,
      distribution,
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        priceUsd: Number(p.price_usd),
        userLimit: p.user_limit,
        apiRequestsPerMonth: p.api_requests_per_month,
        prioritySupport: p.priority_support,
        sortOrder: p.sort_order,
      })),
      recentSubscriptions: subscriptions.slice(0, 10).map((s) => ({
        id: s.id,
        email: emailById.get(s.user_id) ?? null,
        userId: s.user_id,
        planId: s.plan_id,
        planName: plans.find((p) => p.id === s.plan_id)?.name ?? s.plan_id,
        status: s.status,
        renewalDate: s.renewal_date,
        startedAt: s.started_at,
      })),
      failedPayments: invoices
        .filter((i) => i.status === 'failed' || i.status === 'dunning')
        .slice(0, 10)
        .map((i) => ({
          id: i.id,
          email: emailById.get(i.user_id) ?? null,
          userId: i.user_id,
          amountUsd: Number(i.amount_usd),
          status: i.status,
          attemptCount: i.attempt_count,
          failureReason: i.failure_reason,
          nextAttemptAt: i.next_attempt_at,
          createdAt: i.created_at,
        })),
    })
  } catch (err) {
    return errorResponse(err)
  }
}

/** Updates the plan catalogue the Plan Configuration table edits. */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const updates: unknown = body?.plans

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: '`plans` must be a non-empty array.' }, { status: 400 })
    }

    const rows = []
    for (const raw of updates) {
      const id = raw?.id
      if (typeof id !== 'string' || !id) {
        return NextResponse.json({ error: 'Every plan needs a string `id`.' }, { status: 400 })
      }

      const price = Number(raw?.priceUsd)
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json(
          { error: `Plan "${id}": priceUsd must be a non-negative number.` },
          { status: 400 }
        )
      }

      rows.push({
        id,
        name: typeof raw?.name === 'string' && raw.name ? raw.name : id,
        price_usd: price,
        user_limit: nullableInt(raw?.userLimit),
        api_requests_per_month: nullableInt(raw?.apiRequestsPerMonth),
        priority_support: Boolean(raw?.prioritySupport),
        sort_order: Number.isFinite(Number(raw?.sortOrder)) ? Number(raw.sortOrder) : 0,
        updated_at: new Date().toISOString(),
      })
    }

    const { error } = await getSupabaseAdmin()
      .from('billing_plans')
      .upsert(rows, { onConflict: 'id' })

    if (isMissingTable(error)) {
      return NextResponse.json(
        {
          error:
            'The billing_plans table does not exist yet. Apply backend/supabase/migrations/20240301000000_create_billing_tables.sql, then retry.',
          code: 'missing_table',
        },
        { status: 409 }
      )
    }
    if (error) throw new Error(error.message)

    return NextResponse.json({ updated: rows.length })
  } catch (err) {
    return errorResponse(err)
  }
}

function nullableInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
}

function buildTrend(
  live: Array<{ plan_id: string; started_at: string }>,
  all: Array<{ plan_id: string; started_at: string; canceled_at: string | null }>,
  priceById: Map<string, number>
): Array<{ month: string; mrr: number }> {
  const out: Array<{ month: string; mrr: number }> = []
  const now = new Date()

  for (let i = TREND_MONTHS - 1; i >= 0; i--) {
    // Last instant of that month, in UTC.
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0, 23, 59, 59))
    const iso = monthEnd.toISOString()

    const mrr = all.reduce((sum, s) => {
      if (s.started_at > iso) return sum
      if (s.canceled_at && s.canceled_at <= iso) return sum
      return sum + (priceById.get(s.plan_id) ?? 0)
    }, 0)

    out.push({ month: iso.slice(0, 7), mrr })
  }

  return out
}
