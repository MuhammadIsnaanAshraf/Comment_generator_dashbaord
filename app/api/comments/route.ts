import { NextResponse } from 'next/server'

// This route exists as a placeholder for future server-side API.
// Currently all data lives in IndexedDB (client-side only).

export async function GET() {
  return NextResponse.json({ message: 'Use IndexedDB via the client-side storage layer.' })
}
