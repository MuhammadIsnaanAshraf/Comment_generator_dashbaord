'use client'

import type { ReactNode } from 'react'
import { GhostButton, Panel } from './primitives'

/**
 * Renders the loading / error / not-configured states shared by every console
 * page, and the children only once data has arrived.
 */
export function ResourceState({
  status,
  error,
  notConfigured,
  onRetry,
  children,
}: {
  status: 'loading' | 'ready' | 'error'
  error: string
  notConfigured: boolean
  onRetry: () => void
  children: ReactNode
}) {
  if (status === 'loading') {
    return (
      <Panel className="grid place-items-center py-24">
        <p className="font-mono text-xs text-muted-foreground">Loading…</p>
      </Panel>
    )
  }

  if (status === 'error') {
    return (
      <Panel className="px-6 py-16 text-center">
        <p className="text-sm text-danger">{error}</p>
        {notConfigured && (
          <p className="mx-auto mt-3 max-w-lg text-xs leading-relaxed text-dim">
            Set <code className="font-mono text-muted-foreground">SUPABASE_URL</code> and{' '}
            <code className="font-mono text-muted-foreground">SUPABASE_SERVICE_ROLE_KEY</code> in{' '}
            <code className="font-mono text-muted-foreground">dashboard/.env.local</code>, then
            restart the dev server.
          </p>
        )}
        <div className="mt-5">
          <GhostButton onClick={onRetry}>Retry</GhostButton>
        </div>
      </Panel>
    )
  }

  return <>{children}</>
}
