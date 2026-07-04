import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GeneratedComment, Reply, PostCategory } from '../types'
import {
  getAllComments,
  getAllReplies,
  deleteComment as dbDeleteComment,
  searchComments,
  getCommentsByCategory,
} from '../lib/storage'

interface CommentStore {
  comments: GeneratedComment[]
  replies: Reply[]
  isLoading: boolean
  error: string | null
  selectedCategory: PostCategory | 'all'
  searchQuery: string
  selectedComment: GeneratedComment | null

  loadComments: () => Promise<void>
  loadReplies: () => Promise<void>
  deleteComment: (id: string) => Promise<void>
  setCategory: (cat: PostCategory | 'all') => void
  setSearchQuery: (q: string) => void
  setSelectedComment: (c: GeneratedComment | null) => void

  filteredComments: () => GeneratedComment[]
}

export const useCommentStore = create<CommentStore>()(
  persist(
    (set, get) => ({
      comments: [],
      replies: [],
      isLoading: false,
      error: null,
      selectedCategory: 'all',
      searchQuery: '',
      selectedComment: null,

      loadComments: async () => {
        set({ isLoading: true, error: null })
        try {
          const { selectedCategory, searchQuery } = get()

          let comments: GeneratedComment[]
          if (searchQuery.trim()) {
            comments = await searchComments(searchQuery)
          } else if (selectedCategory !== 'all') {
            comments = await getCommentsByCategory(selectedCategory)
          } else {
            comments = await getAllComments()
          }

          set({ comments, isLoading: false })
        } catch (err: any) {
          set({ error: err?.message ?? 'Failed to load comments', isLoading: false })
        }
      },

      loadReplies: async () => {
        try {
          const replies = await getAllReplies()
          set({ replies })
        } catch (err: any) {
          set({ error: err?.message ?? 'Failed to load replies' })
        }
      },

      deleteComment: async (id: string) => {
        await dbDeleteComment(id)
        set((state) => ({
          comments: state.comments.filter((c) => c.id !== id),
          selectedComment:
            state.selectedComment?.id === id ? null : state.selectedComment,
        }))
      },

      setCategory: (cat) => {
        set({ selectedCategory: cat })
        get().loadComments()
      },

      setSearchQuery: (q) => {
        set({ searchQuery: q })
        get().loadComments()
      },

      setSelectedComment: (c) => set({ selectedComment: c }),

      filteredComments: () => get().comments,
    }),
    {
      name: 'lca-ui-prefs',
      partialize: (state) => ({
        selectedCategory: state.selectedCategory,
        searchQuery: state.searchQuery,
      }),
    }
  )
)
