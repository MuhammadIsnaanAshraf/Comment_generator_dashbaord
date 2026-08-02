'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { FolderOpen, LayoutGrid, ListFilter, Rows3, ScanSearch, RefreshCw } from 'lucide-react'
import { useAdminResource } from '../../hooks/useAdminResource'
import { ResourceState } from '../../components/ui/ResourceState'
import { Header } from '../../components/layout/Header'
import { CategoryBars } from '../../components/charts/Charts'
import {
  Badge,
  EmptyState,
  GhostButton,
  Panel,
  PanelHeader,
  Td,
  Th,
  TableShell,
  type Tone,
} from '../../components/ui/primitives'
import { fmtDateTime, fmtPercent, truncate } from '../../lib/format'

interface QueueEntry {
  id: string
  userId: string
  email: string | null
  name: string | null
  createdAt: string
  category: string | null
  stance: string | null
  postText: string
  comment1: string | null
  comment2: string | null
  bmcUsed: boolean
  like: 'liked' | 'disliked' | null
  outcome: 'used' | 'edited' | 'unused'
  relevance: number | null
  flags: string[]
  status: 'pending' | 'approved' | 'rejected'
  reviewedAt: string | null
}

interface QueueResponse {
  entries: QueueEntry[]
  reviewsAvailable: boolean
  windowDays: number
  summary: {
    total: number
    pending: number
    approved: number
    rejected: number
    flagged: number
    avgRelevance: number | null
    lowRelevance: number
    bmcUsed: number
    disliked: number
    noOutput: number
    categories: Array<{ key: string; count: number }>
    stances: Array<{ key: string; count: number }>
  }
}

type Scope = 'flagged' | 'pending' | 'all' | 'approved' | 'rejected'

const PAGE_SIZE = 25

const STATUS_TONE: Record<QueueEntry['status'], Tone> = {
  approved: 'success',
  rejected: 'danger',
  pending: 'cyan',
}

const FLAG_TONE: Record<string, Tone> = {
  'no-output': 'danger',
  disliked: 'danger',
  'low-relevance': 'warn',
  'bmc-context': 'warn',
}

export default function ModerationPage() {
  const { data, status, error, notConfigured, reload } =
    useAdminResource<QueueResponse>('/api/moderation/queue')

  return (
    <ResourceState status={status} error={error} notConfigured={notConfigured} onRetry={reload}>
      {data && <Queue data={data} reload={reload} />}
    </ResourceState>
  )
}

function Queue({ data, reload }: { data: QueueResponse; reload: () => void }) {
  const [scope, setScope] = useState<Scope>('flagged')
  const [view, setView] = useState<'table' | 'cards'>('table')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  const entries = useMemo(() => {
    switch (scope) {
      case 'flagged':
        return data.entries.filter((e) => e.flags.length > 0)
      case 'pending':
        return data.entries.filter((e) => e.status === 'pending')
      case 'approved':
        return data.entries.filter((e) => e.status === 'approved')
      case 'rejected':
        return data.entries.filter((e) => e.status === 'rejected')
      default:
        return data.entries
    }
  }, [data.entries, scope])

  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const rows = entries.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) rows.forEach((r) => next.delete(r.id))
      else rows.forEach((r) => next.add(r.id))
      return next
    })
  }

  async function review(decision: 'approved' | 'rejected') {
    if (!selected.size) return
    setBusy(true)
    setNotice(null)
    try {
      const res = await fetch('/api/moderation/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected], status: decision }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status}).`)
      setNotice({ tone: 'ok', text: `${body.updated} entr${body.updated === 1 ? 'y' : 'ies'} ${decision}.` })
      setSelected(new Set())
      reload()
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Review failed.' })
    } finally {
      setBusy(false)
    }
  }

  const { summary } = data

  return (
    <div>
      <Header
        accent
        title="RAG Moderation Queue"
        description="Reviewing AI-generated comments against the retrieved context that produced them."
        action={
          <div className="flex gap-3">
            <HeaderStat label="Queue Depth" value={summary.pending.toLocaleString()} />
            <HeaderStat
              label="Avg. Relevance"
              value={summary.avgRelevance != null ? summary.avgRelevance.toFixed(3) : '—'}
              tone="text-success"
            />
          </div>
        }
      />

      {!data.reviewsAvailable && (
        <div className="mb-5 rounded-lg border border-warn/30 bg-warn/[0.06] px-5 py-4">
          <p className="font-mono text-sm text-warn">Review decisions are not persisted yet</p>
          <p className="mt-1.5 max-w-4xl text-xs leading-relaxed text-muted-foreground">
            Every entry reads as <span className="font-mono text-dim">pending</span> because the{' '}
            <span className="font-mono text-dim">moderation_reviews</span> table does not exist.
            Apply{' '}
            <span className="font-mono text-dim">
              backend/supabase/migrations/20240302000000_create_moderation_reviews.sql
            </span>{' '}
            to enable Approve / Reject.
          </p>
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
        <ListFilter size={16} className="text-dim" />
        {(
          [
            ['flagged', 'Flagged for Review'],
            ['pending', 'Pending'],
            ['approved', 'Approved'],
            ['rejected', 'Rejected'],
            ['all', 'All'],
          ] as const
        ).map(([key, label]) => (
          <GhostButton
            key={key}
            active={scope === key}
            onClick={() => {
              setScope(key)
              setPage(0)
            }}
          >
            {label}
          </GhostButton>
        ))}

        <span className="ml-2 font-mono text-xs text-muted-foreground">Bulk:</span>
        <button
          type="button"
          disabled={!selected.size || busy || !data.reviewsAvailable}
          onClick={() => review('approved')}
          className="rounded-md border border-success/40 bg-success/10 px-4 py-1.5 font-mono text-xs text-success transition-opacity hover:opacity-80 disabled:opacity-35"
        >
          Approve Selected
        </button>
        <button
          type="button"
          disabled={!selected.size || busy || !data.reviewsAvailable}
          onClick={() => review('rejected')}
          className="rounded-md border border-danger/40 bg-danger/10 px-4 py-1.5 font-mono text-xs text-danger transition-opacity hover:opacity-80 disabled:opacity-35"
        >
          Reject Selected
        </button>
        {selected.size > 0 && (
          <span className="font-mono text-2xs text-accent-soft">{selected.size} selected</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">View:</span>
          <div className="flex rounded-md border border-line">
            <ViewToggle active={view === 'table'} onClick={() => setView('table')}>
              <Rows3 size={15} />
            </ViewToggle>
            <ViewToggle active={view === 'cards'} onClick={() => setView('cards')}>
              <LayoutGrid size={15} />
            </ViewToggle>
          </div>
        </div>
      </div>

      {notice && (
        <p
          className={`mb-4 font-mono text-xs ${notice.tone === 'ok' ? 'text-success' : 'text-danger'}`}
        >
          {notice.text}
        </p>
      )}

      <Panel className="mb-6 overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            title="Nothing in this queue."
            hint={
              scope === 'flagged'
                ? 'No generation in the window tripped a moderation flag.'
                : undefined
            }
          />
        ) : view === 'table' ? (
          <TableShell>
            <thead>
              <tr className="border-b border-line">
                <Th className="w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                    aria-label="Select all on page"
                    className="size-3.5 accent-[hsl(var(--accent))]"
                  />
                </Th>
                <Th>Post Excerpt</Th>
                <Th>Generated Comment</Th>
                <Th>Stance</Th>
                <Th>Relevance</Th>
                <Th>Status</Th>
                <Th className="text-right">Flags</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-line last:border-0 hover:bg-surface-2/50"
                >
                  <Td>
                    <input
                      type="checkbox"
                      checked={selected.has(e.id)}
                      onChange={() => toggle(e.id)}
                      aria-label={`Select generation ${e.id}`}
                      className="size-3.5 accent-[hsl(var(--accent))]"
                    />
                  </Td>
                  <Td className="max-w-[260px]">
                    <p className="text-sm leading-snug text-muted-foreground">
                      “{truncate(e.postText, 76)}”
                    </p>
                  </Td>
                  <Td className="max-w-[300px]">
                    <p className="text-sm italic leading-snug text-accent-soft">
                      {e.comment1 ? `“${truncate(e.comment1, 84)}”` : '— no output —'}
                    </p>
                  </Td>
                  <Td>
                    <Badge>{(e.stance ?? 'unknown').toUpperCase()}</Badge>
                  </Td>
                  <Td>
                    <span
                      className={`font-mono text-sm tabular ${relevanceClass(e.relevance)}`}
                      title="Lexical content-word overlap between the post and the comment. Not a vector similarity — this project stores no embeddings."
                    >
                      {e.relevance != null ? e.relevance.toFixed(3) : '—'}
                    </span>
                  </Td>
                  <Td>
                    <Badge tone={STATUS_TONE[e.status]}>{e.status.toUpperCase()}</Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {e.flags.length === 0 ? (
                        <span className="font-mono text-2xs text-dim">clean</span>
                      ) : (
                        e.flags.map((f) => (
                          <Badge key={f} tone={FLAG_TONE[f] ?? 'neutral'}>
                            {f}
                          </Badge>
                        ))
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : (
          <div className="grid gap-4 p-4 md:grid-cols-2">
            {rows.map((e) => (
              <div key={e.id} className="rounded-lg border border-line bg-surface-2/40 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.has(e.id)}
                    onChange={() => toggle(e.id)}
                    aria-label={`Select generation ${e.id}`}
                    className="size-3.5 accent-[hsl(var(--accent))]"
                  />
                  <Badge tone={STATUS_TONE[e.status]}>{e.status.toUpperCase()}</Badge>
                  {e.flags.map((f) => (
                    <Badge key={f} tone={FLAG_TONE[f] ?? 'neutral'}>
                      {f}
                    </Badge>
                  ))}
                  <span className={`ml-auto font-mono text-xs ${relevanceClass(e.relevance)}`}>
                    {e.relevance != null ? e.relevance.toFixed(3) : '—'}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  “{truncate(e.postText, 200)}”
                </p>
                <p className="mt-3 border-l-2 border-accent/40 pl-3 text-sm italic leading-relaxed text-accent-soft">
                  {e.comment1 ? truncate(e.comment1, 220) : '— no output —'}
                </p>
                <p className="mt-3 font-mono text-2xs text-dim">
                  {fmtDateTime(e.createdAt)} ·{' '}
                  <Link href={`/users/${e.userId}`} className="hover:text-accent-soft">
                    {e.email ?? e.userId}
                  </Link>
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-line px-4 py-3">
          <span className="font-mono text-xs text-muted-foreground">
            Showing {entries.length ? safePage * PAGE_SIZE + 1 : 0}–
            {Math.min(entries.length, (safePage + 1) * PAGE_SIZE)} of {entries.length} entries
          </span>
          <div className="flex items-center gap-2">
            <GhostButton onClick={() => setPage(Math.max(0, safePage - 1))} disabled={safePage === 0}>
              ‹
            </GhostButton>
            <span className="font-mono text-xs text-muted-foreground">
              {safePage + 1} / {pageCount}
            </span>
            <GhostButton
              onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
              disabled={safePage >= pageCount - 1}
            >
              ›
            </GhostButton>
            <GhostButton onClick={reload} title="Reload the queue">
              <RefreshCw size={13} />
            </GhostButton>
          </div>
        </div>
      </Panel>

      {/* Bottom analysis row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel>
          <PanelHeader
            title="Retrieval Sources"
            action={<FolderOpen size={16} className="text-dim" />}
          />
          <div className="space-y-3 px-5 pb-5">
            <Source
              id="user_profiles.background_json"
              text="Per-user background injected into the prompt as {{user_background}}. Falls back to the built-in default profile when a user has no row."
            />
            <Source
              id="generation_log (last 8 used)"
              text="Recent history checked to suppress the BMC background once it appears in 3 of the last 8 used generations."
            />
            <Source
              id="post text / transcript"
              text="The LinkedIn post itself — DOM-extracted text, or a whisper-large-v3 transcript for video posts."
            />
            <p className="pt-1 font-mono text-2xs leading-relaxed text-dim">
              This pipeline retrieves structured records, not embedded documents — there is no
              vector store to browse.
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Category Distribution"
            action={<ScanSearch size={16} className="text-dim" />}
          />
          <div className="px-5 pb-5">
            <CategoryBars data={summary.categories.slice(0, 5)} colorful />
            <p className="mt-4 font-mono text-2xs text-dim">
              Vector-space mapping is unavailable: no embeddings are stored for these
              generations.
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Quality Signals" />
          <div className="space-y-4 px-5 pb-5">
            <Signal
              label="On-topic"
              value={summary.total ? 1 - summary.lowRelevance / summary.total : null}
              tone="success"
            />
            <Signal
              label="Produced output"
              value={summary.total ? 1 - summary.noOutput / summary.total : null}
              tone="cyan"
            />
            <Signal
              label="Context leakage"
              value={summary.total ? summary.bmcUsed / summary.total : null}
              tone="warn"
              invert
            />
            <Signal
              label="Disliked"
              value={summary.total ? summary.disliked / summary.total : null}
              tone="danger"
              invert
            />
            <p className="pt-1 font-mono text-2xs leading-relaxed text-dim">
              Derived from stored fields. No sentiment or toxicity classifier runs in this
              project.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function relevanceClass(score: number | null): string {
  if (score == null) return 'text-dim'
  if (score >= 0.35) return 'text-success'
  if (score >= 0.15) return 'text-cyan'
  return 'text-danger'
}

function HeaderStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: string
}) {
  return (
    <div className="rounded-lg border border-line bg-surface px-5 py-3">
      <p className="font-mono text-2xs uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 font-mono text-2xl font-semibold tabular ${tone ?? 'text-fg'}`}>
        {value}
      </p>
    </div>
  )
}

function ViewToggle({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid size-8 place-items-center transition-colors first:rounded-l-md last:rounded-r-md ${
        active ? 'bg-surface-2 text-fg' : 'text-muted-foreground hover:text-fg'
      }`}
    >
      {children}
    </button>
  )
}

function Source({ id, text }: { id: string; text: string }) {
  return (
    <div className="border-l-2 border-accent/50 pl-3.5">
      <p className="font-mono text-2xs uppercase tracking-[0.06em] text-accent-soft">{id}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
    </div>
  )
}

function Signal({
  label,
  value,
  tone,
  invert,
}: {
  label: string
  value: number | null
  tone: 'success' | 'cyan' | 'warn' | 'danger'
  /** Higher is worse — colour the bar accordingly. */
  invert?: boolean
}) {
  const colors = {
    success: ['bg-success', 'text-success'],
    cyan: ['bg-cyan', 'text-cyan'],
    warn: ['bg-warn', 'text-warn'],
    danger: ['bg-danger', 'text-danger'],
  }[tone]

  const pct = value == null ? 0 : Math.round(value * 100)

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-mono text-2xs uppercase tracking-[0.06em] text-fg">
          {label}
          {invert && <span className="ml-1.5 text-dim">(lower is better)</span>}
        </span>
        <span className={`font-mono text-xs tabular ${colors[1]}`}>{fmtPercent(value, 1)}</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full rounded-full ${colors[0]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
