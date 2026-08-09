import { Suspense } from 'react'
import type { Metadata } from 'next'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = {
  title: 'Sign in — AI Admin',
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen place-items-center px-6 py-16">
      <div className="w-full max-w-[400px]">
        <div className="mb-9 text-center">
          <p className="bg-gradient-to-r from-accent-soft to-accent bg-clip-text text-[32px] font-extrabold leading-none tracking-tight text-transparent">
            LinkedIn AI
          </p>
          <p className="mt-2.5 font-mono text-xs text-muted-foreground">Admin Console</p>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        {/* <p className="mt-6 text-center font-mono text-2xs leading-relaxed text-dim">
          Access requires{' '}
          <span className="text-muted-foreground">app_metadata.role = &quot;admin&quot;</span> on
          the Supabase account.
        </p> */}
      </div>
    </div>
  )
}
