'use client'

import { useEffect, useRef, useState } from 'react'
import { importFromExtensionStorage } from '../lib/storage'
import { useCommentStore } from '../store/useCommentStore'
import type { StorageData } from '../types'

export function useExtensionSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const { loadComments, loadReplies } = useCommentStore()
  const listenerAttached = useRef(false)

  useEffect(() => {
    if (listenerAttached.current) return
    listenerAttached.current = true

    async function handleMessage(event: MessageEvent) {
      if (event.source !== window) return
      if (event.data?.type !== 'SYNC_RECEIVED') return

      const data: StorageData = event.data.data
      if (!data) return

      setIsSyncing(true)
      try {
        await importFromExtensionStorage(data)
        await loadComments()
        await loadReplies()
        setLastSynced(new Date())
      } catch (err) {
        console.error('[LCA] Sync failed:', err)
      } finally {
        setIsSyncing(false)
      }
    }

    window.addEventListener('message', handleMessage)
    // Request initial sync on mount
    window.postMessage({ type: 'REQUEST_SYNC' }, '*')

    return () => window.removeEventListener('message', handleMessage)
  }, [])

  function syncNow() {
    setIsSyncing(true)
    window.postMessage({ type: 'REQUEST_SYNC' }, '*')
    // Resolve loading state after timeout if no response
    setTimeout(() => setIsSyncing(false), 3000)
  }

  return { syncNow, lastSynced, isSyncing }
}
