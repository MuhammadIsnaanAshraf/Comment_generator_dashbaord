'use client'

import { useEffect, useState } from 'react'
import { useCommentStore } from '../store/useCommentStore'
import { Header } from '../components/layout/Header'
import { CategoryBadge } from '../components/history/CategoryBadge'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, TrendingUp, Tag, Bell } from 'lucide-react'

function StatsCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: any
}) {
  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
          {label}
        </p>
        <Icon size={16} className="text-[hsl(var(--muted-foreground))]" />
      </div>
      <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{value}</p>
    </div>
  )
}

function thisWeekCount(comments: any[]) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)
  return comments.filter((c) => new Date(c.timestamp) >= cutoff).length
}

function mostUsedCategory(comments: any[]): string {
  if (!comments.length) return '—'
  const counts: Record<string, number> = {}
  for (const c of comments) counts[c.category] = (counts[c.category] ?? 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

export default function OverviewPage() {
  const { comments, replies, loadComments, loadReplies } = useCommentStore()
  const [extensionDetected, setExtensionDetected] = useState<boolean | null>(null)

  useEffect(() => {
    loadComments()
    loadReplies()

    const timer = setTimeout(() => {
      if (extensionDetected === null) setExtensionDetected(false)
    }, 1500)

    window.addEventListener('message', (e) => {
      if (e.data?.type === 'SYNC_RECEIVED') {
        setExtensionDetected(true)
        clearTimeout(timer)
      }
    })

    window.postMessage({ type: 'REQUEST_SYNC' }, '*')

    return () => clearTimeout(timer)
  }, [])

  const recent = comments.slice(0, 5)

  return (
    <div>
      <Header title="Overview" description="Your LinkedIn AI comment activity at a glance." />

      {extensionDetected === false && (
        <div className="mb-6 px-4 py-3 bg-amber-900/30 border border-amber-700/50 rounded-lg text-sm text-amber-300">
          Extension not detected. Install the Chrome extension to sync comments.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatsCard label="Total Comments" value={comments.length} icon={MessageSquare} />
        <StatsCard label="This Week" value={thisWeekCount(comments)} icon={TrendingUp} />
        <StatsCard label="Top Category" value={mostUsedCategory(comments)} icon={Tag} />
        <StatsCard label="Replies Received" value={replies.length} icon={Bell} />
      </div>

      {/* Recent activity */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[hsl(var(--border))]">
          <p className="text-sm font-semibold">Recent Activity</p>
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[hsl(var(--muted-foreground))]">
            No comments yet. Use the extension on LinkedIn.
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--border))]">
            {recent.map((c) => (
              <div key={c.id} className="px-5 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.authorName}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] truncate mt-0.5">
                    {c.selectedComment ?? c.comment1}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <CategoryBadge category={c.category} />
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {formatDistanceToNow(new Date(c.timestamp), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
