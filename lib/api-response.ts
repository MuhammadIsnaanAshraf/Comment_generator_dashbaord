import 'server-only'
import { NextResponse } from 'next/server'
import { NotConfiguredError } from './admin-data'

/**
 * Single error shape for every admin route: `{ error }`, with 503 reserved for
 * "Supabase isn't wired up yet" so the UI can show setup guidance instead of a
 * generic failure.
 */
export function errorResponse(err: unknown) {
  if (err instanceof NotConfiguredError) {
    return NextResponse.json({ error: err.message, code: 'not_configured' }, { status: 503 })
  }
  // Never return an empty string — the UI would render a blank error box.
  const message = (err instanceof Error && err.message) || 'Request failed.'
  return NextResponse.json({ error: message }, { status: 500 })
}
