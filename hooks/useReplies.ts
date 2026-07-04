'use client'

import { useEffect } from 'react'
import { useCommentStore } from '../store/useCommentStore'

export function useReplies() {
  const { replies, loadReplies } = useCommentStore()

  useEffect(() => {
    loadReplies()
  }, [])

  return { replies }
}
