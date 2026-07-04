'use client'

import { useState } from 'react'
import type { GeneratedComment } from '../../types'
import { CategoryBadge } from './CategoryBadge'
import { format } from 'date-fns'
import { X, Copy, Check } from 'lucide-react'

interface Props {
  comment: GeneratedComment
  onClose: () => void
}

export function DetailModal({ comment, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  function copyComment() {
    const text = comment.selectedComment ?? comment.comment1
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
          <p className="text-sm font-semibold">Comment Detail</p>
          <button onClick={onClose} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Author */}
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1 uppercase tracking-wide">Author</p>
            <p className="text-sm font-medium">{comment.authorName}</p>
          </div>

          {/* Post content */}
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1 uppercase tracking-wide">Post Content</p>
            <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed bg-[hsl(var(--muted))] rounded-md px-3 py-2">
              {comment.postContent}
            </p>
          </div>

          {/* Selected comment */}
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1 uppercase tracking-wide">Used Comment</p>
            <p className="text-sm leading-relaxed border border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/5 rounded-md px-3 py-2">
              {comment.selectedComment ?? comment.comment1}
            </p>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3">
            <CategoryBadge category={comment.category} />
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {format(new Date(comment.timestamp), 'MMM d, yyyy HH:mm')}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[hsl(var(--border))] flex justify-end">
          <button
            onClick={copyComment}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-md hover:opacity-90 transition-opacity"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Comment'}
          </button>
        </div>
      </div>
    </div>
  )
}
