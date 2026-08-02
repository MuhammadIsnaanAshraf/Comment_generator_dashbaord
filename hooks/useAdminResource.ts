'use client'

import { useCallback, useEffect, useState } from 'react'

export interface AdminResource<T> {
  data: T | null
  status: 'loading' | 'ready' | 'error'
  error: string
  /** True when the failure was "Supabase isn't configured" (HTTP 503). */
  notConfigured: boolean
  reload: () => void
  /** Bumped on every completed load — handy as a "last refreshed" trigger. */
  loadedAt: Date | null
}

/**
 * Fetches one of the /api/* admin endpoints, with the shared loading/error
 * handling every console page needs. Errors carry the server's message so the
 * setup hint (missing service-role key, etc.) reaches the operator verbatim.
 */
export function useAdminResource<T>(url: string): AdminResource<T> {
  const [data, setData] = useState<T | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [notConfigured, setNotConfigured] = useState(false)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    setError('')
    setNotConfigured(false)
    try {
      const res = await fetch(url, { cache: 'no-store' })
      const body = await res.json()
      if (!res.ok) {
        setNotConfigured(res.status === 503)
        throw new Error(body?.error ?? `Request failed (${res.status}).`)
      }
      setData(body as T)
      setStatus('ready')
      setLoadedAt(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.')
      setStatus('error')
    }
  }, [url])

  useEffect(() => {
    load()
  }, [load])

  return { data, status, error, notConfigured, reload: load, loadedAt }
}
