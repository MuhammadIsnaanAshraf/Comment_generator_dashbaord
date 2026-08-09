import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../../../../lib/auth-config'
import { signOut } from '../../../../lib/supabase-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const accessToken = cookies().get(ACCESS_COOKIE)?.value

  // Global scope so the refresh token can't be replayed after logout. Failure
  // is non-fatal — clearing the cookies below is what actually ends the session
  // for this browser.
  if (accessToken) await signOut(accessToken)

  const response = NextResponse.json({ ok: true })
  const options = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  }
  response.cookies.set(ACCESS_COOKIE, '', options)
  response.cookies.set(REFRESH_COOKIE, '', options)
  return response
}
