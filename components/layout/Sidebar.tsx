'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutGrid,
  Users,
  Activity,
  FileCheck2,
  CreditCard,
  BarChart3,
  Settings,
  LifeBuoy,
  SquareTerminal,
} from 'lucide-react'
import { cn } from '../../lib/utils'

export const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutGrid },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/monitoring', label: 'Monitoring', icon: Activity },
  { href: '/moderation', label: 'RAG Moderation', icon: FileCheck2 },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/config', label: 'Config', icon: Settings },
  { href: '/support', label: 'Support', icon: LifeBuoy },
  { href: '/logs', label: 'Logs', icon: SquareTerminal },
] as const

export const SIDEBAR_WIDTH = 272

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 flex flex-col border-r border-line bg-panel"
      style={{ width: SIDEBAR_WIDTH }}
    >
      {/* Wordmark */}
      <div className="px-6 pb-7 pt-7">
        <p className="bg-gradient-to-r from-accent-soft to-accent bg-clip-text text-[28px] font-extrabold leading-none tracking-tight text-transparent">
          LinkedIn AI
        </p>
        <p className="mt-2 font-mono text-xs text-muted-foreground">Admin Console</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative mb-1 flex items-center gap-3 rounded-md px-3 py-2.5 font-mono text-sm transition-colors duration-150',
                active
                  ? 'bg-accent/[0.09] text-accent-soft'
                  : 'text-muted-foreground hover:bg-surface-2 hover:text-fg'
              )}
            >
              {/* Active rail sits on the sidebar edge, matching the design. */}
              {active && (
                <span className="absolute -right-3 inset-y-0 w-[3px] rounded-l-full bg-accent" />
              )}
              <Icon size={18} strokeWidth={1.75} className="shrink-0" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Operator */}
      <div className="flex items-center gap-3 border-t border-line px-5 py-4">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/15 font-mono text-xs font-semibold text-accent-soft">
          AD
        </div>
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-fg">Admin Avatar</p>
          <p className="truncate font-mono text-2xs text-dim">Primary Admin</p>
        </div>
      </div>
    </aside>
  )
}
