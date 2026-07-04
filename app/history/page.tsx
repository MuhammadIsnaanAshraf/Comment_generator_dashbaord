'use client'

import { useEffect } from 'react'
import { useCommentStore } from '../../store/useCommentStore'
import { Header } from '../../components/layout/Header'
import { SearchBar } from '../../components/history/SearchBar'
import { FilterBar } from '../../components/history/FilterBar'
import { CommentTable } from '../../components/history/CommentTable'

export default function HistoryPage() {
  const {
    comments,
    isLoading,
    selectedCategory,
    searchQuery,
    loadComments,
    deleteComment,
    setCategory,
    setSearchQuery,
  } = useCommentStore()

  useEffect(() => {
    loadComments()
  }, [])

  return (
    <div>
      <Header
        title="Comment History"
        description="All AI-generated comments you've used on LinkedIn."
      />

      {/* Controls */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center gap-3">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <span className="text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">
            {isLoading ? 'Loading…' : `Showing ${comments.length} comment${comments.length !== 1 ? 's' : ''}`}
          </span>
        </div>
        <FilterBar selected={selectedCategory} onChange={setCategory} />
      </div>

      {/* Table */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Loading…
          </div>
        ) : (
          <CommentTable comments={comments} onDelete={deleteComment} />
        )}
      </div>
    </div>
  )
}
