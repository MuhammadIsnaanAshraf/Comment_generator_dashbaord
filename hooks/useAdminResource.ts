'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LOGIN_PATH } from '../lib/auth-config'

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
  const router = useRouter()
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

      // The session died while the console was open (token revoked, admin role
      // removed). Bounce to login rather than showing a bare 401 in a panel.
      if (res.status === 401 || res.status === 403) {
        router.replace(`${LOGIN_PATH}?reason=${res.status === 403 ? 'forbidden' : 'expired'}`)
        router.refresh()
        return
      }

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
  }, [url, router])

  useEffect(() => {
    load()
  }, [load])

  return { data, status, error, notConfigured, reload: load, loadedAt }
}
