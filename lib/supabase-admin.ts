import 'server-only'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import WebSocket from 'ws'

/**
 * SERVER-ONLY Supabase admin client.
 *
 * Uses the service-role key, which grants full admin access (listing users,
 * etc.) — it must NEVER reach the browser. The `server-only` import above makes
 * the build fail if this file is ever pulled into a client component.
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

export const isSupabaseAdminConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)

export function getSupabaseAdmin(): SupabaseClient {
  if (!isSupabaseAdminConfigured) {
    throw new Error(
      'Supabase admin is not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the dashboard .env.local.'
    )
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    // supabase-js eagerly constructs a Realtime client that needs a WebSocket;
    // Node < 22 has no native one, so provide `ws`. We never open a realtime
    // connection here — this only satisfies construction.
    realtime: { transport: WebSocket as unknown as any },
  })
}
