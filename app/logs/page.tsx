'use client'

import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { useAdminResource } from '../../hooks/useAdminResource'
import { ResourceState } from '../../components/ui/ResourceState'
import { Header } from '../../components/layout/Header'
import {
  Badge,
  EmptyState,
  GhostButton,
  Panel,
  type Tone,
} from '../../components/ui/primitives'
import { fmtDateTime, traceId, truncate } from '../../lib/format'
import type { GenerationFeedItem } from '../../types'

interface FeedResponse {
  items: GenerationFeedItem[]
  total: number
  windowDays: number
}

type Level = 'INFO' | 'WARN' | 'ERROR'

const LEVEL_TONE: Record<Level, Tone> = {
  INFO: 'mint',
  WARN: 'warn',
  ERROR: 'danger',
}

const LEVEL_TEXT: Record<Level, string> = {
  INFO: 'text-mint',
  WARN: 'text-warn',
  ERROR: 'text-danger',
}

interface LogLine {
  id: string
  ts: string
  level: Level
  event: string
  actor: string
  message: string
}

/**
 * A log view over generation_log — the only append-only event stream this
 * project records. Levels are derived from the row itself: no output is an
 * error, an unused or disliked generation is a warning, everything else is
 * informational.
 */
export default function LogsPage() {
  const { data, status, error, notConfigured, reload } = useAdminResource<FeedResponse>(
    '/api/generations?limit=500'
  )

  return (
    <div>
      <Header
        title="Logs"
        description="Append-only event stream derived from generation_log. Application and HTTP logs are not persisted — they go to the backend process stdout."
      />

      <ResourceState
        status={status}
        error={error}
        notConfigured={notConfigured}
        onRetry={reload}
      >
        {data && <LogConsole data={data} />}
      </ResourceState>
    </div>
  )
}

function LogConsole({ data }: { data: FeedResponse }) {
  const [levels, setLevels] = useState<Set<Level>>(new Set(['INFO', 'WARN', 'ERROR']))
  const [query, setQuery] = useState('')

  const lines = useMemo(() => data.items.map(toLogLine), [data.items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return lines.filter((l) => {
      if (!levels.has(l.level)) return false
      if (!q) return true
      return `${l.event} ${l.actor} ${l.message} ${l.id}`.toLowerCase().includes(q)
    })
  }, [lines, levels, query])

  function toggle(level: Level) {
    setLevels((prev) => {
      const next = new Set(prev)
      if (next.has(level)) next.delete(level)
      else next.add(level)
      return next
    })
  }

  function download() {
    const body = filtered
      .map((l) => `${l.ts} ${l.level.padEnd(5)} ${l.event} ${l.actor} ${l.message}`)
      .join('\n')
    const url = URL.createObjectURL(new Blob([body], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'generation-log.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const counts = {
    INFO: lines.filter((l) => l.level === 'INFO').length,
    WARN: lines.filter((l) => l.level === 'WARN').length,
    ERROR: lines.filter((l) => l.level === 'ERROR').length,
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {(['INFO', 'WARN', 'ERROR'] as const).map((l) => (
          <GhostButton key={l} active={levels.has(l)} onClick={() => toggle(l)}>
            {l} ({counts[l]})
          </GhostButton>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="grep…"
          className="h-9 min-w-[220px] flex-1 rounded-md border border-line bg-surface px-3 font-mono text-xs text-fg placeholder:text-dim focus:border-accent/50 focus:outline-none"
        />
        <GhostButton onClick={download} title="Download the filtered lines">
          <span className="inline-flex items-center gap-2">
            <Download size={13} /> Export
          </span>
        </GhostButton>
      </div>

      <Panel className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState title="No log lines match." />
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[860px] border-collapse font-mono text-xs">
              <tbody>
                {filtered.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-line/60 align-top last:border-0 hover:bg-surface-2/50"
                  >
                    <td className="whitespace-nowrap px-4 py-2 tabular text-dim">{l.ts}</td>
                    <td className="px-2 py-2">
                      <Badge tone={LEVEL_TONE[l.level]}>{l.level}</Badge>
                    </td>
                    <td className={`whitespace-nowrap px-2 py-2 ${LEVEL_TEXT[l.level]}`}>
                      {l.event}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-muted-foreground">
                      {l.actor}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">{l.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-line px-4 py-3 font-mono text-xs text-muted-foreground">
          <span>
            {filtered.length} of {lines.length} lines · last {data.windowDays} days
          </span>
          <span className="text-dim">source: generation_log</span>
        </div>
      </Panel>
    </div>
  )
}

function toLogLine(item: GenerationFeedItem): LogLine {
  const empty = !item.comment_1 && !item.comment_2

  const level: Level = empty
    ? 'ERROR'
    : item.like === 'disliked' || item.outcome === 'unused'
      ? 'WARN'
      : 'INFO'

  const event = empty
    ? 'generation.empty'
    : item.outcome === 'used'
      ? 'generation.used'
      : item.outcome === 'edited'
        ? 'generation.edited'
        : 'generation.unused'

  const flags = [
    item.category ? `category=${item.category}` : null,
    item.stance_1 ? `stance=${item.stance_1}` : null,
    item.bmc_used ? 'bmc=1' : null,
    item.like ? `feedback=${item.like}` : null,
  ]
    .filter(Boolean)
    .join(' ')

  return {
    id: item.id,
    ts: fmtDateTime(item.created_at),
    level,
    event,
    actor: item.userEmail ?? item.user_id.slice(0, 8),
    message: `${traceId(item.id)} ${flags} post="${truncate(item.post_text, 60)}"`,
  }
}
