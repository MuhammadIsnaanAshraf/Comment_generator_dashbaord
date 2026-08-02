/**
 * Lexical relevance between a post and a generated comment.
 *
 * This project stores no embeddings, so there is no vector similarity to
 * report. What we can compute honestly is content-word overlap (a Jaccard
 * coefficient over stemmed-ish tokens), which is a usable proxy for "is this
 * comment actually about the post" — it catches generic filler, which is the
 * failure mode moderation is looking for. It is NOT cosine similarity, and the
 * UI labels it "Relevance", not "similarity score".
 */

const STOP_WORDS = new Set([
  'a', 'about', 'all', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'been', 'but', 'by',
  'can', 'do', 'does', 'for', 'from', 'get', 'had', 'has', 'have', 'how', 'i', 'if', 'in',
  'into', 'is', 'it', 'its', 'just', 'like', 'me', 'more', 'most', 'my', 'no', 'not', 'of',
  'on', 'one', 'or', 'our', 'out', 'so', 'some', 'than', 'that', 'the', 'their', 'them',
  'then', 'there', 'these', 'they', 'this', 'to', 'up', 'very', 'was', 'we', 'were', 'what',
  'when', 'which', 'who', 'will', 'with', 'would', 'you', 'your',
])

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
      // Crude suffix trim so "scaling"/"scale" and "models"/"model" match.
      .map((w) => w.replace(/(ing|ers|ed|es|s)$/u, ''))
      .filter((w) => w.length > 2)
  )
}

/** 0–1, or null when either side has no content words to compare. */
export function relevanceScore(post: string | null, comment: string | null): number | null {
  if (!post || !comment) return null

  const a = tokenize(post)
  const b = tokenize(comment)
  if (!a.size || !b.size) return null

  let shared = 0
  for (const token of b) if (a.has(token)) shared += 1

  // Recall against the comment, not full Jaccard: a short on-topic comment
  // about a long post should not be penalised for the post's extra vocabulary.
  return shared / b.size
}

/** Best relevance across the two generated variants. */
export function bestRelevance(
  post: string | null,
  comment1: string | null,
  comment2: string | null
): number | null {
  const scores = [relevanceScore(post, comment1), relevanceScore(post, comment2)].filter(
    (s): s is number => s !== null
  )
  return scores.length ? Math.max(...scores) : null
}
