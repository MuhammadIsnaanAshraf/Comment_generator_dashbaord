import { NextResponse } from 'next/server'
import { isSupabaseAdminConfigured } from '../../../lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Reports how this dashboard instance is configured. Only ever returns whether
 * a secret is *present* and, for URLs, its value — never the secret itself.
 */
export async function GET() {
  const supabaseUrl = process.env.SUPABASE_URL ?? ''
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.BACKEND_URL ?? ''

  return NextResponse.json({
    env: [
      {
        key: 'SUPABASE_URL',
        set: Boolean(supabaseUrl),
        value: supabaseUrl || null,
        secret: false,
        required: true,
        description: 'Supabase project the console reads users and generations from.',
      },
      {
        key: 'SUPABASE_SERVICE_ROLE_KEY',
        set: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        value: null,
        secret: true,
        required: true,
        description: 'Service-role key. Server-side only — bypasses RLS.',
      },
      {
        key: 'BACKEND_URL',
        set: Boolean(backendUrl),
        value: backendUrl || null,
        secret: false,
        required: false,
        description: 'Express backend base URL, used for the health probe.',
      },
    ],
    services: {
      supabase: isSupabaseAdminConfigured,
      backend: Boolean(backendUrl),
    },
    // Generation-pipeline constants, mirrored from the backend for visibility.
    // These are read-only here: they live in backend/src/services/generation-log.ts
    // and are changed by editing that file, not from this console.
    pipeline: [
      {
        key: 'LOOKBACK_ROWS',
        value: '10',
        description: 'Rows of history examined when deciding BMC suppression.',
      },
      {
        key: 'RECENT_WINDOW',
        value: '8',
        description: 'Most-recent used generations counted within the lookback.',
      },
      {
        key: 'BMC_THRESHOLD',
        value: '3',
        description: 'BMC mentions in the window that trigger suppression.',
      },
      {
        key: 'MODEL',
        value: 'llama-3.3-70b-versatile (Groq)',
        description: 'LLM used for comment generation.',
      },
      {
        key: 'WHISPER_MODEL',
        value: 'whisper-large-v3 (Groq)',
        description: 'Model used to transcribe video posts before generation.',
      },
    ],
  })
}
