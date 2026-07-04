import type { Reply } from '../../types'
import { ReplyCard } from './ReplyCard'
import { Bell } from 'lucide-react'

interface Props {
  replies: Reply[]
}

export function ReplyFeed({ replies }: Props) {
  if (replies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-12 h-12 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center mb-4">
          <Bell size={20} className="text-[hsl(var(--muted-foreground))]" />
        </div>
        <p className="text-sm font-medium">No replies tracked yet</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 max-w-xs">
          Replies will appear here once synced from the extension.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[hsl(var(--border))]">
      {replies.map((r) => (
        <ReplyCard key={r.id} reply={r} />
      ))}
    </div>
  )
}
