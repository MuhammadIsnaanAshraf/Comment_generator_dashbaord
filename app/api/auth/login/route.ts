import { NextResponse, type NextRequest } from 'next/server'
import {
  ACCESS_COOKIE,
  ACCESS_FALLBACK_MAX_AGE_SECONDS,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE_SECONDS,
  isAdmin,
} from '../../../../lib/auth-config'
import {
  isSupabaseAuthConfigured,
  signInWithPassword,
  signOut,
} from '../../../../lib/supabase-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Signs an operator in and stores the Supabase session in httpOnly cookies.
 *
 * The tokens never reach the browser's JS: any XSS on the console would
 * otherwise walk away with a long-lived refresh token for a service-role-backed
 * admin tool.
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseAuthConfigured) {
    return NextResponse.json(
      {
        error:
          'Auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in dashboard/.env.local.',
      },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const email = typeof (body as any)?.email === 'string' ? (body as any).email.trim().toLowerCase() : ''
  const password = typeof (body as any)?.password === 'string' ? (body as any).password : ''

  // Generic message on purpose — never reveal which field was wrong, or whether
  // the address exists.
  const invalid = NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })

  if (!EMAIL_PATTERN.test(email) || !password) return invalid

  const result = await signInWithPassword(email, password)
  if (!result) return invalid

  if (!isAdmin(result.user)) {
    // Valid credentials, wrong privileges. Drop the session we just minted so a
    // non-admin is not left holding live tokens for this origin.
    await signOut(result.session.access_token)
    return NextResponse.json(
      {
        error: 'This account does not have admin access.',
        code: 'forbidden',
      },
      { status: 403 }
    )
  }

  const response = NextResponse.json({
    user: { id: result.user.id, email: result.user.email },
  })

  const accessMaxAge = result.session.expires_at
    ? Math.max(0, result.session.expires_at - Math.floor(Date.now() / 1000))
    : ACCESS_FALLBACK_MAX_AGE_SECONDS

  const options = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }

  response.cookies.set(ACCESS_COOKIE, result.session.access_token, {
    ...options,
    maxAge: accessMaxAge,
  })
  response.cookies.set(REFRESH_COOKIE, result.session.refresh_token, {
    ...options,
    maxAge: REFRESH_MAX_AGE_SECONDS,
  })

  return response
}
