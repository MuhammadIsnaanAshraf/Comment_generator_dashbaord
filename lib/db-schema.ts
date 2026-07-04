import { openDB, type IDBPDatabase } from 'idb'
import type { GeneratedComment, Reply } from '../types'

export const DB_NAME = 'LinkedInCommentAssistant'
export const DB_VERSION = 1

export interface LCADatabase {
  comments: {
    key: string
    value: GeneratedComment
    indexes: {
      'by-timestamp': string
      'by-category': string
      'by-author': string
    }
  }
  replies: {
    key: string
    value: Reply
    indexes: {
      'by-timestamp': string
      'by-comment': string
    }
  }
}

let dbPromise: Promise<IDBPDatabase<LCADatabase>> | null = null

export function getDB(): Promise<IDBPDatabase<LCADatabase>> {
  if (!dbPromise) {
    dbPromise = openDB<LCADatabase>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('comments')) {
          const commentStore = db.createObjectStore('comments', { keyPath: 'id' })
          commentStore.createIndex('by-timestamp', 'timestamp')
          commentStore.createIndex('by-category', 'category')
          commentStore.createIndex('by-author', 'authorName')
        }

        if (!db.objectStoreNames.contains('replies')) {
          const replyStore = db.createObjectStore('replies', { keyPath: 'id' })
          replyStore.createIndex('by-timestamp', 'timestamp')
          replyStore.createIndex('by-comment', 'originalCommentId')
        }
      },
    })
  }
  return dbPromise
}
