'use client'

import { useEffect } from 'react'
import { useCommentStore } from '../store/useCommentStore'

export function useComments() {
  const store = useCommentStore()

  useEffect(() => {
    store.loadComments()
  }, [])

  return {
    comments: store.filteredComments(),
    isLoading: store.isLoading,
    error: store.error,
    deleteComment: store.deleteComment,
    setCategory: store.setCategory,
    setSearchQuery: store.setSearchQuery,
    selectedCategory: store.selectedCategory,
    searchQuery: store.searchQuery,
  }
}
