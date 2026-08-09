import { NextResponse } from 'next/server'
import { requireAdmin } from '../../../lib/require-admin'

// This route exists as a placeholder for future server-side API.
// Currently all data lives in IndexedDB (client-side only).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  return NextResponse.json({ message: 'Use IndexedDB via the client-side storage layer.' })
}
