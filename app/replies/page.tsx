'use client'

import { useEffect } from 'react'
import { useCommentStore } from '../../store/useCommentStore'
import { Header } from '../../components/layout/Header'
import { ReplyFeed } from '../../components/replies/ReplyFeed'

export default function RepliesPage() {
  const { replies, loadReplies } = useCommentStore()

  useEffect(() => {
    loadReplies()
  }, [])

  return (
    <div>
      <Header title="Replies Received" description="Track responses to your AI-generated comments." />

      {/* Notice banner */}
      <div className="mb-6 px-4 py-2.5 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-lg text-xs text-[hsl(var(--muted-foreground))]">
        Replies are manually logged — future version will auto-detect replies from LinkedIn notifications.
      </div>

      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg overflow-hidden">
        <ReplyFeed replies={replies} />
      </div>
    </div>
  )
}
