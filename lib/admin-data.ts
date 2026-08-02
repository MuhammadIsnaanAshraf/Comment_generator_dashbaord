import 'server-only'
import { getSupabaseAdmin, isSupabaseAdminConfigured } from './supabase-admin'
import type { AdminUser, GenerationRow, UserProfileRow } from '../types'

/**
 * Server-side reads for the admin console.
 *
 * Everything here goes through the service-role client, which bypasses RLS —
 * that is the point: an operator needs to see every user's rows, not just
 * their own. These functions must never be imported from a client component
 * (`server-only` above enforces it).
 */

/** Row cap for windowed reads. Keeps a busy project from pulling everything. */
export const WINDOW_ROW_CAP = 3000

/** Columns of generation_log the console renders. */
const GENERATION_COLUMNS =
  'id,user_id,post_url,post_id,post_text,category,stance_1,stance_2,comment_1,comment_2,bmc_used,created_at,comment_1_liked,comment_2_liked,used_comment,final_posted_text'

export class NotConfiguredError extends Error {
  constructor() {
    super(
      'Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to dashboard/.env.local.'
    )
    this.name = 'NotConfiguredError'
  }
}

export function assertConfigured() {
  if (!isSupabaseAdminConfigured) throw new NotConfiguredError()
}

export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

export function startOfTodayIso(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/* ------------------------------------------------------------------ Users */

const USERS_PER_PAGE = 200

export async function listAuthUsers(): Promise<AdminUser[]> {
  assertConfigured()
  const supabase = getSupabaseAdmin()

  const users: AdminUser[] = []
  let page = 1
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: USERS_PER_PAGE,
    })
    // Auth admin errors sometimes carry an empty message (e.g. a rejected
    // service-role key), which would surface as a blank alert in the UI.
    if (error) {
      throw new Error(
        error.message ||
          `Supabase Admin API rejected the request${error.status ? ` (HTTP ${error.status})` : ''} — check SUPABASE_SERVICE_ROLE_KEY.`
      )
    }

    for (const u of data.users) {
      users.push({
        id: u.id,
        email: u.email ?? null,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        confirmed: Boolean(u.email_confirmed_at ?? (u as any).confirmed_at),
        name: null,
        headline: null,
        generations: 0,
        used: 0,
        lastGenerationAt: null,
      })
    }

    if (data.users.length < USERS_PER_PAGE) break
    page += 1
  }

  users.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  return users
}

export async function listUserProfiles(): Promise<UserProfileRow[]> {
  assertConfigured()
  const { data, error } = await getSupabaseAdmin()
    .from('user_profiles')
    .select('user_id,name,headline,background_json,tone_preferences,created_at,updated_at')

  // user_profiles is optional — a project that hasn't applied the migration
  // still gets a usable console, just without display names.
  if (error) return []
  return (data ?? []) as UserProfileRow[]
}

/* ------------------------------------------------------------ Generations */

export interface GenerationQuery {
  sinceIso?: string
  limit?: number
  userId?: string
}

export async function listGenerations({
  sinceIso,
  limit = WINDOW_ROW_CAP,
  userId,
}: GenerationQuery = {}): Promise<GenerationRow[]> {
  assertConfigured()

  let query = getSupabaseAdmin()
    .from('generation_log')
    .select(GENERATION_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, WINDOW_ROW_CAP))

  if (sinceIso) query = query.gte('created_at', sinceIso)
  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as GenerationRow[]
}

/** Exact row count, optionally windowed — cheaper than pulling the rows. */
export async function countGenerations(sinceIso?: string): Promise<number> {
  assertConfigured()

  let query = getSupabaseAdmin()
    .from('generation_log')
    .select('id', { count: 'exact', head: true })

  if (sinceIso) query = query.gte('created_at', sinceIso)

  const { count, error } = await query
  if (error) throw new Error(error.message)
  return count ?? 0
}

/* --------------------------------------------------------------- Derived */

/** Outcome of a generation, derived from used_comment + like flags. */
export type Outcome = 'used' | 'edited' | 'unused'

export function outcomeOf(row: Pick<GenerationRow, 'used_comment'>): Outcome {
  if (row.used_comment === '1' || row.used_comment === '2') return 'used'
  if (row.used_comment === 'edited') return 'edited'
  return 'unused'
}

export function likeOf(
  row: Pick<GenerationRow, 'comment_1_liked' | 'comment_2_liked'>
): 'liked' | 'disliked' | null {
  const flags = [row.comment_1_liked, row.comment_2_liked].filter((v) => v != null)
  if (!flags.length) return null
  return flags.some((v) => v === true) ? 'liked' : 'disliked'
}

/**
 * Joins auth users with their profile and generation activity. The join runs in
 * memory rather than in SQL because auth.users is only reachable through the
 * Admin API, not through PostgREST.
 */
export function joinUserActivity(
  users: AdminUser[],
  profiles: UserProfileRow[],
  generations: GenerationRow[]
): AdminUser[] {
  const profileById = new Map(profiles.map((p) => [p.user_id, p]))

  const stats = new Map<string, { total: number; used: number; last: string | null }>()
  for (const g of generations) {
    const s = stats.get(g.user_id) ?? { total: 0, used: 0, last: null }
    s.total += 1
    if (outcomeOf(g) !== 'unused') s.used += 1
    if (!s.last || g.created_at > s.last) s.last = g.created_at
    stats.set(g.user_id, s)
  }

  return users.map((u) => {
    const p = profileById.get(u.id)
    const s = stats.get(u.id)
    return {
      ...u,
      name: p?.name ?? null,
      headline: p?.headline ?? null,
      generations: s?.total ?? 0,
      used: s?.used ?? 0,
      lastGenerationAt: s?.last ?? null,
    }
  })
}

/** Buckets rows into per-day counts, oldest first, with empty days filled. */
export function bucketByDay(
  rows: Array<{ created_at: string }>,
  days: number
): Array<{ date: string; count: number }> {
  const buckets = new Map<string, number>()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    buckets.set(d.toISOString().slice(0, 10), 0)
  }

  for (const r of rows) {
    const key = r.created_at.slice(0, 10)
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }

  return [...buckets.entries()].map(([date, count]) => ({ date, count }))
}

/* ------------------------------------------------ Optional (unmigrated) tables */

/**
 * PostgREST codes meaning "this table doesn't exist yet". The billing and
 * moderation-review tables ship as migration files the human applies manually
 * (see AGENTS.md), so every read of them must tolerate their absence rather
 * than fail the whole page.
 */
const MISSING_TABLE_CODES = new Set(['42P01', 'PGRST205', 'PGRST106'])

export class MissingTableError extends Error {
  constructor(readonly table: string) {
    super(`Table "${table}" does not exist yet — apply the pending migration in backend/supabase/migrations.`)
    this.name = 'MissingTableError'
  }
}

export function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code && MISSING_TABLE_CODES.has(error.code)) return true
  return /does not exist|could not find the table/i.test(error.message ?? '')
}

/* -------------------------------------------------------------- Billing */

export interface BillingPlanRow {
  id: string
  name: string
  price_usd: number | string
  user_limit: number | null
  api_requests_per_month: number | null
  priority_support: boolean
  sort_order: number
}

export interface SubscriptionRow {
  id: string
  user_id: string
  plan_id: string
  status: 'active' | 'trialing' | 'past_due' | 'canceled'
  renewal_date: string | null
  started_at: string
  canceled_at: string | null
}

export interface InvoiceRow {
  id: string
  user_id: string
  amount_usd: number | string
  status: 'paid' | 'open' | 'failed' | 'dunning' | 'refunded' | 'void'
  attempt_count: number
  failure_reason: string | null
  next_attempt_at: string | null
  created_at: string
}

export async function listBillingPlans(): Promise<BillingPlanRow[] | null> {
  assertConfigured()
  const { data, error } = await getSupabaseAdmin()
    .from('billing_plans')
    .select('id,name,price_usd,user_limit,api_requests_per_month,priority_support,sort_order')
    .order('sort_order', { ascending: true })

  if (isMissingTable(error)) return null
  if (error) throw new Error(error.message)
  return (data ?? []) as BillingPlanRow[]
}

export async function listSubscriptions(): Promise<SubscriptionRow[] | null> {
  assertConfigured()
  const { data, error } = await getSupabaseAdmin()
    .from('subscriptions')
    .select('id,user_id,plan_id,status,renewal_date,started_at,canceled_at')
    .order('started_at', { ascending: false })
    .limit(WINDOW_ROW_CAP)

  if (isMissingTable(error)) return null
  if (error) throw new Error(error.message)
  return (data ?? []) as SubscriptionRow[]
}

export async function listInvoices(limit = 200): Promise<InvoiceRow[] | null> {
  assertConfigured()
  const { data, error } = await getSupabaseAdmin()
    .from('invoices')
    .select('id,user_id,amount_usd,status,attempt_count,failure_reason,next_attempt_at,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (isMissingTable(error)) return null
  if (error) throw new Error(error.message)
  return (data ?? []) as InvoiceRow[]
}

/* ------------------------------------------------------ Moderation reviews */

export interface ModerationReviewRow {
  generation_id: string
  status: 'approved' | 'rejected'
  note: string | null
  reviewed_at: string
}

export async function listModerationReviews(): Promise<ModerationReviewRow[] | null> {
  assertConfigured()
  const { data, error } = await getSupabaseAdmin()
    .from('moderation_reviews')
    .select('generation_id,status,note,reviewed_at')
    .order('reviewed_at', { ascending: false })
    .limit(WINDOW_ROW_CAP)

  if (isMissingTable(error)) return null
  if (error) throw new Error(error.message)
  return (data ?? []) as ModerationReviewRow[]
}

export async function upsertModerationReviews(
  generationIds: string[],
  status: 'approved' | 'rejected',
  note?: string
): Promise<{ ok: true } | { ok: false; missingTable: true }> {
  assertConfigured()
  const nowIso = new Date().toISOString()

  const { error } = await getSupabaseAdmin().from('moderation_reviews').upsert(
    generationIds.map((generation_id) => ({
      generation_id,
      status,
      note: note ?? null,
      reviewed_at: nowIso,
    })),
    { onConflict: 'generation_id' }
  )

  if (isMissingTable(error)) return { ok: false, missingTable: true }
  if (error) throw new Error(error.message)
  return { ok: true }
}

export function tally<T extends string>(values: Array<T | null | undefined>) {
  const counts = new Map<string, number>()
  for (const v of values) {
    const key = v ?? 'unknown'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
}
