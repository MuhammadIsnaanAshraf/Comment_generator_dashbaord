import 'server-only'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { ACCESS_COOKIE, REFRESH_COOKIE, isAdmin, type SupabaseUser } from './auth-config'
import { getUserFromToken, isSupabaseAuthConfigured, refreshSession } from './supabase-auth'

/**
 * Second, independent admin check for route handlers and server components.
 *
 * The middleware already gates these paths. This exists so that a matcher
 * mistake, a future `export const runtime` change, or a direct internal call
 * cannot expose service-role data on its own — the guard travels with the
 * handler rather than with the routing config.
 *
 * Note this does NOT rotate cookies when it refreshes: route handlers can set
 * cookies only on their own response, and the middleware has already handled
 * rotation for any request that reached here. The refresh below is a fallback
 * for the case where the access cookie died between middleware and handler.
 */

export async function getAdminUser(): Promise<SupabaseUser | null> {
  if (!isSupabaseAuthConfigured) return null

  const jar = cookies()
  const accessToken = jar.get(ACCESS_COOKIE)?.value

  if (accessToken) {
    const user = await getUserFromToken(accessToken)
    if (user) return isAdmin(user) ? user : null
  }

  const refreshToken = jar.get(REFRESH_COOKIE)?.value
  if (refreshToken) {
    const refreshed = await refreshSession(refreshToken)
    if (refreshed && isAdmin(refreshed.user)) return refreshed.user
  }

  return null
}

/**
 * Guard for API route handlers.
 *
 * Usage — bail out the moment it returns a response:
 *
 *   const denied = await requireAdmin()
 *   if (denied) return denied
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  if (!isSupabaseAuthConfigured) {
    return NextResponse.json(
      {
        error:
          'Auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in dashboard/.env.local.',
        code: 'auth_not_configured',
      },
      { status: 503 }
    )
  }

  const user = await getAdminUser()
  if (user) return null

  // 401 rather than 403 across the board: distinguishing "signed in but not an
  // admin" from "not signed in" here would leak whether a session is valid to
  // an unauthenticated caller. The middleware already draws that distinction
  // for requests it has verified.
  return NextResponse.json({ error: 'Not authorised.', code: 'unauthenticated' }, { status: 401 })
}
