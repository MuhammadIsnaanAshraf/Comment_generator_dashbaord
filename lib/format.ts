import { format, formatDistanceToNowStrict } from 'date-fns'

export function fmtDate(iso: string | null | undefined): string {
  return iso ? format(new Date(iso), 'yyyy.MM.dd') : '—'
}

export function fmtDateTime(iso: string | null | undefined): string {
  return iso ? format(new Date(iso), 'yyyy.MM.dd HH:mm:ss') : '—'
}

export function fmtTime(iso: string | null | undefined): string {
  return iso ? format(new Date(iso), 'HH:mm:ss') : '—'
}

export function fmtAgo(iso: string | null | undefined): string {
  return iso ? `${formatDistanceToNowStrict(new Date(iso))} ago` : '—'
}

export function fmtPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${(value * 100).toFixed(digits)}%`
}

export function fmtCount(value: number | null | undefined): string {
  if (value == null) return '—'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${(value / 1000).toFixed(1)}k`
  return value.toLocaleString()
}

/** Initials for an avatar chip: prefers a display name, falls back to email. */
export function initials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.split('@')[0]?.replace(/[._-]+/g, ' ') || '?'
  const parts = source.split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2)
  return letters.toUpperCase()
}

export function truncate(text: string | null | undefined, max: number): string {
  if (!text) return '—'
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length <= max ? clean : `${clean.slice(0, max)}…`
}

/** Short trace-style rendering of a UUID: `0x8829 … f1a`. */
export function traceId(id: string): string {
  const hex = id.replace(/-/g, '')
  return `0x${hex.slice(0, 4)} … ${hex.slice(-3)}`
}
