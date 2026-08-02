'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Radio, Cpu, Webhook } from 'lucide-react'
import { SIDEBAR_WIDTH } from './Sidebar'

/** The design gives each section its own search affordance copy. */
const SEARCH_PLACEHOLDER: Record<string, string> = {
  '/': 'Global system search…',
  '/users': 'Search users by name, email or ID…',
  '/monitoring': 'Search logs, users, or trace IDs…',
  '/moderation': 'Search prompt context and flagged generations…',
  '/billing': 'Search invoices and plans…',
  '/analytics': 'Search metrics…',
  '/config': 'Search configuration keys…',
  '/support': 'Search the support queue…',
  '/logs': 'Search logs, users, or trace IDs…',
}

export function Topbar() {
  const pathname = usePathname()
  const placeholder = SEARCH_PLACEHOLDER[pathname] ?? 'Global system search…'

  return (
    <header
      className="fixed inset-x-0 top-0 z-20 h-[74px] border-b border-line bg-panel/95 backdrop-blur"
      style={{ left: SIDEBAR_WIDTH }}
    >
      <div className="flex h-full items-center gap-6 px-8">
        <Link href="/" className="shrink-0 text-xl font-bold tracking-tight text-fg">
          AI Admin
        </Link>

        <label className="relative min-w-0 max-w-[560px] flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-dim"
          />
          <input
            type="search"
            placeholder={placeholder}
            className="h-11 w-full rounded-lg border border-line bg-surface pl-10 pr-4 text-sm text-fg placeholder:text-dim focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
          />
        </label>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <IconButton label="Realtime feed"><Radio size={18} strokeWidth={1.75} /></IconButton>
          <IconButton label="Inference workers"><Cpu size={18} strokeWidth={1.75} /></IconButton>
          <IconButton label="Webhooks"><Webhook size={18} strokeWidth={1.75} /></IconButton>

          <span className="mx-3 h-6 w-px bg-line" />

          <Link
            href="/support"
            className="font-mono text-sm text-muted-foreground transition-colors hover:text-fg"
          >
            Support
          </Link>
          <Link
            href="/config"
            className="ml-3 rounded-md bg-accent-soft px-4 py-2 font-mono text-xs font-semibold text-[hsl(250_30%_10%)] transition-opacity hover:opacity-90"
          >
            Profile
          </Link>
        </div>
      </div>
    </header>
  )
}

function IconButton({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-fg"
    >
      {children}
    </button>
  )
}
