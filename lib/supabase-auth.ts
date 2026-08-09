import type { SupabaseUser } from './auth-config'

/**
 * Thin `fetch` wrappers over Supabase's GoTrue REST API.
 *
 * Deliberately not `@supabase/supabase-js`: this module is imported by
 * `middleware.ts`, which runs on the edge runtime where supabase-js drags in a
 * Realtime client and a WebSocket shim it cannot use. Plain fetch works in
 * every runtime the app targets.
 *
 * All calls use the **anon** key. The service-role key must never touch an
 * auth flow — anon is what GoTrue expects for sign-in, refresh and user
 * lookup, and it carries no privilege of its own.
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? ''

export const isSupabaseAuthConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export interface SupabaseSession {
  access_token: string
  refresh_token: string
  /** Unix seconds. */
  expires_at?: number
}

function authUrl(path: string): string {
  return `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1${path}`
}

function headers(token?: string): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token ?? SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Verifies an access token by asking Supabase who it belongs to.
 *
 * This is a network round trip rather than a local JWT signature check, and
 * that is the point: a locally-verified JWT still looks valid after the user is
 * deleted, banned, or signed out globally. For an internal console the extra
 * hop is worth catching revocation.
 *
 * Returns null for any invalid/expired token — callers must treat null as
 * "not authenticated", never as "skip the check".
 */
export async function getUserFromToken(accessToken: string): Promise<SupabaseUser | null> {
  if (!isSupabaseAuthConfigured || !accessToken) return null

  try {
    const res = await fetch(authUrl('/user'), {
      method: 'GET',
      headers: headers(accessToken),
      cache: 'no-store',
    })
    if (!res.ok) return null

    const user = (await res.json()) as SupabaseUser | null
    return user?.id ? user : null
  } catch {
    // Network failure must fail closed — never grant access on an error.
    return null
  }
}

export interface RefreshResult {
  session: SupabaseSession
  user: SupabaseUser
}

/** Exchanges a refresh token for a fresh session. Null if it is no longer valid. */
export async function refreshSession(refreshToken: string): Promise<RefreshResult | null> {
  if (!isSupabaseAuthConfigured || !refreshToken) return null

  try {
    const res = await fetch(authUrl('/token?grant_type=refresh_token'), {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
    })
    if (!res.ok) return null

    const body = (await res.json()) as SupabaseSession & { user?: SupabaseUser }
    if (!body?.access_token || !body?.refresh_token || !body.user?.id) return null

    return {
      session: {
        access_token: body.access_token,
        refresh_token: body.refresh_token,
        expires_at: body.expires_at,
      },
      user: body.user,
    }
  } catch {
    return null
  }
}

export interface PasswordSignInResult {
  session: SupabaseSession
  user: SupabaseUser
}

/** Email + password sign-in. Null on bad credentials — callers must not reveal which field failed. */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<PasswordSignInResult | null> {
  if (!isSupabaseAuthConfigured) return null

  try {
    const res = await fetch(authUrl('/token?grant_type=password'), {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    })
    if (!res.ok) return null

    const body = (await res.json()) as SupabaseSession & { user?: SupabaseUser }
    if (!body?.access_token || !body?.refresh_token || !body.user?.id) return null

    return {
      session: {
        access_token: body.access_token,
        refresh_token: body.refresh_token,
        expires_at: body.expires_at,
      },
      user: body.user,
    }
  } catch {
    return null
  }
}

/**
 * Best-effort global sign-out so the refresh token cannot be replayed after
 * logout. Failure is non-fatal — the caller clears the cookies regardless.
 */
export async function signOut(accessToken: string): Promise<void> {
  if (!isSupabaseAuthConfigured || !accessToken) return
  try {
    await fetch(authUrl('/logout?scope=global'), {
      method: 'POST',
      headers: headers(accessToken),
      cache: 'no-store',
    })
  } catch {
    // Ignored on purpose.
  }
}
