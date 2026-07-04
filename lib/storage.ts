'use client'

import { getDB } from './db-schema'
import type { GeneratedComment, Reply, PostCategory, StorageData } from '../types'

// ── Comments ──────────────────────────────────────────────────────────

export async function saveComment(c: GeneratedComment): Promise<void> {
  try {
    const db = await getDB()
    await db.put('comments', c)
  } catch {
    const raw = localStorage.getItem('lca_comments')
    const existing: GeneratedComment[] = raw ? JSON.parse(raw) : []
    const updated = [c, ...existing.filter((x) => x.id !== c.id)]
    localStorage.setItem('lca_comments', JSON.stringify(updated))
  }
}

export async function getAllComments(): Promise<GeneratedComment[]> {
  try {
    const db = await getDB()
    const all = await db.getAll('comments')
    return all.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1))
  } catch {
    const raw = localStorage.getItem('lca_comments')
    return raw ? JSON.parse(raw) : []
  }
}

export async function getCommentsByCategory(cat: PostCategory): Promise<GeneratedComment[]> {
  try {
    const db = await getDB()
    const all = await db.getAllFromIndex('comments', 'by-category', cat)
    return all.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1))
  } catch {
    const all = await getAllComments()
    return all.filter((c) => c.category === cat)
  }
}

export async function searchComments(query: string): Promise<GeneratedComment[]> {
  const all = await getAllComments()
  if (!query.trim()) return all
  const q = query.toLowerCase()
  return all.filter(
    (c) =>
      c.authorName.toLowerCase().includes(q) ||
      c.postContent.toLowerCase().includes(q) ||
      (c.selectedComment ?? '').toLowerCase().includes(q) ||
      c.comment1.toLowerCase().includes(q) ||
      c.comment2.toLowerCase().includes(q)
  )
}

export async function deleteComment(id: string): Promise<void> {
  try {
    const db = await getDB()
    await db.delete('comments', id)
  } catch {
    const raw = localStorage.getItem('lca_comments')
    const existing: GeneratedComment[] = raw ? JSON.parse(raw) : []
    localStorage.setItem('lca_comments', JSON.stringify(existing.filter((c) => c.id !== id)))
  }
}

export async function deleteAllComments(): Promise<void> {
  try {
    const db = await getDB()
    const tx = db.transaction('comments', 'readwrite')
    await tx.store.clear()
    await tx.done
  } catch {
    localStorage.removeItem('lca_comments')
  }
}

// ── Replies ───────────────────────────────────────────────────────────

export async function saveReply(r: Reply): Promise<void> {
  try {
    const db = await getDB()
    await db.put('replies', r)
  } catch {
    const raw = localStorage.getItem('lca_replies')
    const existing: Reply[] = raw ? JSON.parse(raw) : []
    const updated = [r, ...existing.filter((x) => x.id !== r.id)]
    localStorage.setItem('lca_replies', JSON.stringify(updated))
  }
}

export async function getAllReplies(): Promise<Reply[]> {
  try {
    const db = await getDB()
    const all = await db.getAll('replies')
    return all.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1))
  } catch {
    const raw = localStorage.getItem('lca_replies')
    return raw ? JSON.parse(raw) : []
  }
}

export async function getRepliesByComment(commentId: string): Promise<Reply[]> {
  try {
    const db = await getDB()
    const all = await db.getAllFromIndex('replies', 'by-comment', commentId)
    return all.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1))
  } catch {
    const all = await getAllReplies()
    return all.filter((r) => r.originalCommentId === commentId)
  }
}

export async function deleteReply(id: string): Promise<void> {
  try {
    const db = await getDB()
    await db.delete('replies', id)
  } catch {
    const raw = localStorage.getItem('lca_replies')
    const existing: Reply[] = raw ? JSON.parse(raw) : []
    localStorage.setItem('lca_replies', JSON.stringify(existing.filter((r) => r.id !== id)))
  }
}

// ── Sync ──────────────────────────────────────────────────────────────

export async function importFromExtensionStorage(data: StorageData): Promise<void> {
  const { comments = [], replies = [] } = data

  try {
    const db = await getDB()
    const tx1 = db.transaction('comments', 'readwrite')
    for (const c of comments) {
      const existing = await tx1.store.get(c.id)
      if (!existing) await tx1.store.put(c)
    }
    await tx1.done

    const tx2 = db.transaction('replies', 'readwrite')
    for (const r of replies) {
      const existing = await tx2.store.get(r.id)
      if (!existing) await tx2.store.put(r)
    }
    await tx2.done
  } catch {
    // Fallback to localStorage
    for (const c of comments) {
      await saveComment(c)
    }
    for (const r of replies) {
      await saveReply(r)
    }
  }
}
