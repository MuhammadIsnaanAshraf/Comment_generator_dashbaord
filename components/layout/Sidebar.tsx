'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, MessageSquare, Bell, Settings } from 'lucide-react'
import { useExtensionSync } from '../../hooks/useExtensionSync'
import { format } from 'date-fns'

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/history', label: 'Comment History', icon: MessageSquare },
  { href: '/replies', label: 'Replies Received', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { syncNow, lastSynced, isSyncing } = useExtensionSync()

  return (
    <aside
      className="fixed top-0 left-0 h-full flex flex-col bg-[hsl(240_10%_5%)] border-r border-[hsl(var(--border))]"
      style={{ width: 240 }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[hsl(var(--border))]">
        <p className="text-sm font-bold text-white tracking-tight">LCA Dashboard</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">LinkedIn AI Comments</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-150',
                active
                  ? 'text-white border-l-2 border-[hsl(var(--primary))] bg-[hsl(240_10%_10%)] pl-[10px]'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-[hsl(240_10%_8%)]',
              ].join(' ')}
            >
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Sync footer */}
      <div className="px-4 py-4 border-t border-[hsl(var(--border))]">
        <button
          onClick={syncNow}
          disabled={isSyncing}
          className="w-full text-xs py-2 px-3 bg-[hsl(240_10%_10%)] hover:bg-[hsl(240_10%_14%)] text-[hsl(var(--muted-foreground))] hover:text-white border border-[hsl(var(--border))] rounded-md transition-colors duration-150 disabled:opacity-50"
        >
          {isSyncing ? 'Syncing…' : 'Sync from Extension'}
        </button>
        {lastSynced && (
          <p className="text-xs text-[hsl(var(--muted-foreground))] text-center mt-2">
            Last synced {format(lastSynced, 'HH:mm')}
          </p>
        )}
      </div>
    </aside>
  )
}
