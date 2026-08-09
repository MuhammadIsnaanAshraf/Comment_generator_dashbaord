import { NextResponse, type NextRequest } from 'next/server'
import {
  ACCESS_COOKIE,
  ACCESS_FALLBACK_MAX_AGE_SECONDS,
  DEFAULT_LANDING,
  LOGIN_PATH,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE_SECONDS,
  isAdmin,
  type SupabaseUser,
} from './lib/auth-config'
import {
  getUserFromToken,
  isSupabaseAuthConfigured,
  refreshSession,
  type SupabaseSession,
} from './lib/supabase-auth'

/**
 * Admin gate for the whole console.
 *
 * Unlike the web app's middleware — which only sniffs for a cookie and lets the
 * layout do the real check — this one is a genuine security boundary, because
 * every `/api/*` route behind it reads Supabase with the **service-role key**.
 * An unauthenticated request that got through would dump every user in the
 * project. So the token is verified against Supabase here, and the role is read
 * from `app_metadata` (which a user cannot write to themselves).
 *
 * Route handlers additionally call `requireAdmin()` — see lib/require-admin.ts.
 * That redundancy is deliberate: a mistake in the matcher below must not be
 * enough on its own to expose the data.
 *
 * Failure modes all deny:
 *  - Supabase unreachable  → denied (getUserFromToken returns null on throw)
 *  - Supabase not configured → denied, with a distinct message so the operator
 *    can tell "misconfigured" from "not allowed"
 */

/** Paths that must stay reachable while signed out. */
const PUBLIC_PATHS = [LOGIN_PATH, '/api/auth/login', '/api/auth/logout']

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function isApi(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (isSupabaseAuthConfigured === false) {
    // Nothing can be verified, so nothing is allowed through. Say why.
    if (isApi(pathname)) {
      return NextResponse.json(
        {
          error:
            'Auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in dashboard/.env.local.',
          code: 'auth_not_configured',
        },
        { status: 503 }
      )
    }
    if (isPublic(pathname)) return NextResponse.next()
    return redirectToLogin(request, 'config')
  }

  if (isPublic(pathname)) {
    // Already a valid admin? Skip the login form.
    if (pathname === LOGIN_PATH) {
      const user = await resolveUser(request)
      if (user.outcome === 'admin') {
        return NextResponse.redirect(new URL(DEFAULT_LANDING, request.url))
      }
    }
    return NextResponse.next()
  }

  const resolved = await resolveUser(request)

  if (resolved.outcome === 'admin') {
    const response = NextResponse.next()
    // A refresh happened mid-request — persist the rotated tokens.
    if (resolved.refreshed) attachSession(response, resolved.refreshed)
    return response
  }

  if (isApi(pathname)) {
    const denied = resolved.outcome === 'not-admin'
    const response = NextResponse.json(
      {
        error: denied
          ? 'This account is not an admin.'
          : 'Not signed in.',
        code: denied ? 'forbidden' : 'unauthenticated',
      },
      { status: denied ? 403 : 401 }
    )
    if (!denied) clearSession(response)
    return response
  }

  const response = redirectToLogin(
    request,
    resolved.outcome === 'not-admin' ? 'forbidden' : 'signin',
    `${pathname}${search}`
  )
  // A signed-in non-admin keeps their (valid) session; only a dead session is
  // cleared, so the login page doesn't keep retrying a token that cannot work.
  if (resolved.outcome === 'anonymous') clearSession(response)
  return response
}

type Resolution =
  | { outcome: 'admin'; user: SupabaseUser; refreshed?: SupabaseSession }
  | { outcome: 'not-admin'; user: SupabaseUser }
  | { outcome: 'anonymous' }

/**
 * Verifies the access cookie and, if it has expired, transparently spends the
 * refresh cookie for a new session.
 */
async function resolveUser(request: NextRequest): Promise<Resolution> {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value

  if (accessToken) {
    const user = await getUserFromToken(accessToken)
    if (user) return isAdmin(user) ? { outcome: 'admin', user } : { outcome: 'not-admin', user }
  }

  if (refreshToken) {
    const refreshed = await refreshSession(refreshToken)
    if (refreshed) {
      return isAdmin(refreshed.user)
        ? { outcome: 'admin', user: refreshed.user, refreshed: refreshed.session }
        : { outcome: 'not-admin', user: refreshed.user }
    }
  }

  return { outcome: 'anonymous' }
}

function redirectToLogin(request: NextRequest, reason: string, next?: string) {
  const url = new URL(LOGIN_PATH, request.url)
  url.searchParams.set('reason', reason)
  // Don't bounce back to the landing page — it's where login lands anyway.
  if (next && next !== DEFAULT_LANDING) url.searchParams.set('next', next)
  return NextResponse.redirect(url)
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }
}

function attachSession(response: NextResponse, session: SupabaseSession) {
  const maxAge = session.expires_at
    ? Math.max(0, session.expires_at - Math.floor(Date.now() / 1000))
    : ACCESS_FALLBACK_MAX_AGE_SECONDS

  response.cookies.set(ACCESS_COOKIE, session.access_token, { ...cookieOptions(), maxAge })
  response.cookies.set(REFRESH_COOKIE, session.refresh_token, {
    ...cookieOptions(),
    maxAge: REFRESH_MAX_AGE_SECONDS,
  })
}

function clearSession(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, '', { ...cookieOptions(), maxAge: 0 })
  response.cookies.set(REFRESH_COOKIE, '', { ...cookieOptions(), maxAge: 0 })
}

export const config = {
  /**
   * Everything except Next's own assets and the favicon. Written as an
   * exclusion rather than a list of protected routes on purpose: a new page
   * added later is protected by default, and forgetting to register it cannot
   * silently open a hole.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
