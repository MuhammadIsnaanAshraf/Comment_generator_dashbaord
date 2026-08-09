'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { LOGIN_PATH } from '../../lib/auth-config'

export function SignOutButton({ label }: { label?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function signOut() {
    setBusy(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // The cookies are httpOnly, so the client can't clear them itself. If the
      // request failed the session is still live — send them to /login anyway,
      // where the middleware will re-evaluate and route them correctly.
    } finally {
      router.replace(LOGIN_PATH)
      router.refresh()
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      title="Sign out"
      aria-label="Sign out"
      className="grid size-8 shrink-0 place-items-center rounded-md text-dim transition-colors hover:bg-surface-2 hover:text-danger disabled:opacity-50"
    >
      {label ? <span className="font-mono text-xs">{label}</span> : <LogOut size={15} />}
    </button>
  )
}
