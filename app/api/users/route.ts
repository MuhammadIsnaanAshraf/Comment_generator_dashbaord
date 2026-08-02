import { NextResponse } from 'next/server'
import {
  daysAgoIso,
  joinUserActivity,
  listAuthUsers,
  listGenerations,
  listUserProfiles,
} from '../../../lib/admin-data'
import { errorResponse } from '../../../lib/api-response'

// Uses the service-role key (Node APIs), so pin to the Node.js runtime.
export const runtime = 'nodejs'
// Always read fresh — the user list changes over time.
export const dynamic = 'force-dynamic'

const ACTIVITY_WINDOW_DAYS = 90

export async function GET() {
  try {
    const [users, profiles, generations] = await Promise.all([
      listAuthUsers(),
      listUserProfiles(),
      listGenerations({ sinceIso: daysAgoIso(ACTIVITY_WINDOW_DAYS) }),
    ])

    return NextResponse.json({
      users: joinUserActivity(users, profiles, generations),
      total: users.length,
      activityWindowDays: ACTIVITY_WINDOW_DAYS,
    })
  } catch (err) {
    return errorResponse(err)
  }
}
