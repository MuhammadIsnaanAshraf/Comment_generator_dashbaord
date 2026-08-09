'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { DEFAULT_LANDING } from '../../lib/auth-config'

/** Why the middleware sent the operator here. */
const REASONS: Record<string, string> = {
  signin: 'Please sign in to continue.',
  forbidden: 'That account does not have admin access.',
  config: 'Auth is not configured on this instance — see dashboard/.env.local.',
  expired: 'Your session expired. Please sign in again.',
}

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const reason = params.get('reason')
  const notice = reason ? REASONS[reason] : null

  /**
   * `next` is attacker-controllable via the query string, so only same-origin
   * absolute paths are honoured — anything else (`//evil.com`, `https://…`)
   * falls back to the landing page. Without this the login page is an open
   * redirect.
   */
  function safeNext(): string {
    const raw = params.get('next')
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return DEFAULT_LANDING
    return raw
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(body?.error ?? `Sign-in failed (${res.status}).`)
        return
      }

      router.replace(safeNext())
      // The console's pages are server-rendered behind the middleware, so force
      // a fresh fetch rather than serving them from the router cache.
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-line bg-surface px-7 py-7"
      noValidate
    >
      <h1 className="text-xl font-semibold tracking-tight text-fg">Sign in</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Operator access to the LinkedIn AI console.
      </p>

      {notice && !error && (
        <p className="mt-5 rounded-md border border-line bg-surface-2/60 px-3.5 py-2.5 font-mono text-2xs leading-relaxed text-muted-foreground">
          {notice}
        </p>
      )}

      {error && (
        <p className="mt-5 flex items-start gap-2.5 rounded-md border border-danger/40 bg-danger/[0.07] px-3.5 py-2.5 font-mono text-2xs leading-relaxed text-danger">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <label className="mt-6 block">
        <span className="font-mono text-2xs uppercase tracking-[0.06em] text-muted-foreground">
          Email
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
          className="mt-2 h-11 w-full rounded-md border border-line bg-surface-2 px-3.5 text-sm text-fg placeholder:text-dim focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
          placeholder="admin@example.com"
        />
      </label>

      <label className="mt-4 block">
        <span className="font-mono text-2xs uppercase tracking-[0.06em] text-muted-foreground">
          Password
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className="mt-2 h-11 w-full rounded-md border border-line bg-surface-2 px-3.5 text-sm text-fg placeholder:text-dim focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
          placeholder="••••••••"
        />
      </label>

      <button
        type="submit"
        disabled={busy || !email || !password}
        className="mt-7 h-11 w-full rounded-md bg-accent-soft font-mono text-xs font-semibold text-[hsl(250_30%_10%)] transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
