'use client'

import { format } from 'date-fns'
import { RefreshCw } from 'lucide-react'
import { useExtensionSync } from '../../hooks/useExtensionSync'
import { GhostButton } from '../ui/primitives'

/**
 * Pulls chrome.storage data from the extension into IndexedDB. Only meaningful
 * on the two extension-backed pages (/history, /replies) — the Supabase-backed
 * console pages refresh through their own API routes.
 */
export function ExtensionSyncButton() {
  const { syncNow, lastSynced, isSyncing } = useExtensionSync()

  return (
    <div className="flex items-center gap-3">
      {lastSynced && (
        <span className="font-mono text-2xs text-dim">
          synced {format(lastSynced, 'HH:mm')}
        </span>
      )}
      <GhostButton onClick={syncNow} disabled={isSyncing}>
        <span className="inline-flex items-center gap-2">
          <RefreshCw size={13} className={isSyncing ? 'animate-spin' : undefined} />
          {isSyncing ? 'Syncing…' : 'Sync from Extension'}
        </span>
      </GhostButton>
    </div>
  )
}
