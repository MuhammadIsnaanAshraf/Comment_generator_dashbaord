import type { Reply } from '../../types'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  reply: Reply
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function ReplyCard({ reply }: Props) {
  return (
    <div className="flex gap-4 px-5 py-4">
      {/* Avatar */}
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[hsl(var(--primary))]/20 flex items-center justify-center">
        <span className="text-xs font-semibold text-[hsl(var(--primary))]">
          {initials(reply.replyAuthor)}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        {/* Original comment (dimmed) */}
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1.5 line-clamp-1 italic">
          Your comment: "{reply.originalComment}"
        </p>
        {/* Reply */}
        <p className="text-sm leading-relaxed">{reply.replyText}</p>
        {/* Author + time */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">{reply.replyAuthor}</span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">·</span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            {formatDistanceToNow(new Date(reply.timestamp), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  )
}
