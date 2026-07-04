'use client'

import { useState } from 'react'
import type { GeneratedComment } from '../../types'
import { CategoryBadge } from './CategoryBadge'
import { DetailModal } from './DetailModal'
import { format } from 'date-fns'
import { Eye, Trash2 } from 'lucide-react'

interface Props {
  comments: GeneratedComment[]
  onDelete: (id: string) => void
}

export function CommentTable({ comments, onDelete }: Props) {
  const [viewComment, setViewComment] = useState<GeneratedComment | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function handleDelete(id: string) {
    onDelete(id)
    setConfirmDelete(null)
  }

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center mb-4">
          <span className="text-2xl">💬</span>
        </div>
        <p className="text-sm font-medium text-[hsl(var(--foreground))]">No comments yet</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
          Use the extension on LinkedIn to generate comments.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              {['Author', 'Post Preview', 'Category', 'Comment', 'Date', ''].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {comments.map((c) => (
              <tr key={c.id} className="hover:bg-[hsl(var(--muted))]/30 transition-colors">
                <td className="px-4 py-3 font-medium max-w-[120px] truncate">{c.authorName}</td>
                <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] max-w-[160px] truncate">
                  {c.postContent.slice(0, 80)}
                </td>
                <td className="px-4 py-3">
                  <CategoryBadge category={c.category} />
                </td>
                <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] max-w-[200px] truncate">
                  {c.selectedComment ?? c.comment1}
                </td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                  {format(new Date(c.timestamp), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewComment(c)}
                      className="p-1.5 rounded hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                      title="View"
                    >
                      <Eye size={14} />
                    </button>
                    {confirmDelete === c.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 py-1 text-xs bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(c.id)}
                        className="p-1.5 rounded hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-sm font-medium">{c.authorName}</p>
              <CategoryBadge category={c.category} />
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2 line-clamp-2">
              {c.selectedComment ?? c.comment1}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                {format(new Date(c.timestamp), 'MMM d, yyyy')}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setViewComment(c)} className="text-xs text-[hsl(var(--primary))]">View</button>
                <button onClick={() => handleDelete(c.id)} className="text-xs text-red-400">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {viewComment && (
        <DetailModal comment={viewComment} onClose={() => setViewComment(null)} />
      )}
    </>
  )
}
