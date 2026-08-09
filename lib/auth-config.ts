/**
 * Auth constants shared by the edge middleware, the route handlers and the
 * server components.
 *
 * This module must stay free of `server-only`, `next/headers` and any Node API
 * so `middleware.ts` (edge runtime) can import it.
 */

/**
 * Distinct from the web app's `nx_access` / `nx_refresh`. Cookies ignore port,
 * so on localhost the dashboard and the web app share a cookie jar — reusing
 * the same names would mean signing into the console clobbers a user's session
 * on the marketing site, and vice versa.
 */
export const ACCESS_COOKIE = 'lca_admin_access'
export const REFRESH_COOKIE = 'lca_admin_refresh'

export const LOGIN_PATH = '/login'
export const DEFAULT_LANDING = '/'

/** Value required at `app_metadata.role` for console access. */
export const ADMIN_ROLE = 'admin'

/** Supabase refresh tokens outlive access tokens; keep an operator signed in. */
export const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

/** Fallback access-token lifetime when Supabase omits `expires_at`. */
export const ACCESS_FALLBACK_MAX_AGE_SECONDS = 3600

export interface SupabaseUser {
  id: string
  email: string | null
  app_metadata?: Record<string, unknown> | null
  user_metadata?: Record<string, unknown> | null
}

/**
 * The single place that decides who is an admin.
 *
 * `app_metadata` is writable only with the service-role key (or from the
 * Supabase dashboard) — a user cannot set it on themselves, unlike
 * `user_metadata`. That is why the role lives there and why this check must
 * never fall back to `user_metadata`.
 */
export function isAdmin(user: SupabaseUser | null | undefined): boolean {
  if (!user) return false
  const role = user.app_metadata?.role
  return typeof role === 'string' && role.toLowerCase() === ADMIN_ROLE
}
