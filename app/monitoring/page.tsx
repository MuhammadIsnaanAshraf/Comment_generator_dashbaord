'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { SlidersHorizontal, SquareTerminal, X } from 'lucide-react'
import { useAdminResource } from '../../hooks/useAdminResource'
import { ResourceState } from '../../components/ui/ResourceState'
import { Header } from '../../components/layout/Header'
import {
  Badge,
  EmptyState,
  GhostButton,
  Panel,
  StatusDot,
  Td,
  Th,
  TableShell,
  type Tone,
} from '../../components/ui/primitives'
import { fmtDateTime, fmtPercent, traceId, truncate } from '../../lib/format'
import type { GenerationFeedItem } from '../../types'

interface FeedResponse {
  items: GenerationFeedItem[]
  total: number
  windowDays: number
}

type Filter = 'all' | 'used' | 'edited' | 'unused' | 'disliked' | 'empty'

const FILTERS: Array<{ key: Filter; label: string; tone?: Tone }> = [
  { key: 'all', label: 'All Feed' },
  { key: 'used', label: 'Used', tone: 'success' },
  { key: 'edited', label: 'Edited', tone: 'cyan' },
  { key: 'unused', label: 'Unused', tone: 'warn' },
  { key: 'disliked', label: 'Disliked', tone: 'danger' },
  { key: 'empty', label: 'No Output', tone: 'danger' },
]

const OUTCOME_STYLE: Record<GenerationFeedItem['outcome'], { label: string; tone: Tone }> = {
  used: { label: 'USED', tone: 'success' },
  edited: { label: 'EDITED', tone: 'cyan' },
  unused: { label: 'UNUSED', tone: 'warn' },
}

export default function MonitoringPage() {
  return (
    <Suspense fallback={null}>
      <MonitoringInner />
    </Suspense>
  )
}

function MonitoringInner() {
  const params = useSearchParams()
  const userId = params.get('userId')
  const url = `/api/generations?limit=300${userId ? `&userId=${encodeURIComponent(userId)}` : ''}`

  const { data, status, error, notConfigured, reload } = useAdminResource<FeedResponse>(url)

  return (
    <ResourceState status={status} error={error} notConfigured={notConfigured} onRetry={reload}>
      {data && <Feed data={data} userId={userId} />}
    </ResourceState>
  )
}

function Feed({ data, userId }: { data: FeedResponse; userId: string | null }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<GenerationFeedItem | null>(null)

  const items = useMemo(() => {
    switch (filter) {
      case 'used':
      case 'edited':
      case 'unused':
        return data.items.filter((i) => i.outcome === filter)
      case 'disliked':
        return data.items.filter((i) => i.like === 'disliked')
      case 'empty':
        return data.items.filter((i) => !i.comment_1 && !i.comment_2)
      default:
        return data.items
    }
  }, [data.items, filter])

  const withOutput = data.items.filter((i) => i.comment_1 || i.comment_2).length
  const successRate = data.items.length ? withOutput / data.items.length : null
  const rated = data.items.filter((i) => i.like !== null)
  const likeRate = rated.length
    ? rated.filter((i) => i.like === 'liked').length / rated.length
    : null
  const usedRate = data.items.length
    ? data.items.filter((i) => i.outcome !== 'unused').length / data.items.length
    : null

  return (
    <div>
      <Header
        accent
        title="Generation Monitoring Feed"
        description={
          userId
            ? `Trace of AI inference for a single user over the last ${data.windowDays} days.`
            : `Trace of AI inference and comment generation over the last ${data.windowDays} days.`
        }
        action={
          <div className="flex gap-3">
            <MiniStat label="Success Rate" value={fmtPercent(successRate)} tone="mint" />
            <MiniStat label="Used Rate" value={fmtPercent(usedRate)} tone="cyan" />
            <MiniStat label="Like Rate" value={fmtPercent(likeRate)} tone="accent" />
          </div>
        }
      />

      {userId && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/[0.07] px-4 py-2.5">
          <span className="font-mono text-xs text-accent-soft">Filtered to user {userId}</span>
          <a href="/monitoring" className="ml-auto font-mono text-xs text-muted-foreground hover:text-fg">
            Clear
          </a>
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-4 py-3">
        <SlidersHorizontal size={16} className="mr-1 text-dim" />
        {FILTERS.map((f) => (
          <GhostButton key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </GhostButton>
        ))}
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {items.length} row{items.length === 1 ? '' : 's'}
        </span>
      </div>

      <Panel className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyState
            title="No generations match this filter."
            hint={
              data.items.length === 0
                ? 'The generation_log table has no rows in this window yet.'
                : undefined
            }
          />
        ) : (
          <>
            <TableShell>
              <thead>
                <tr className="border-b border-line">
                  <Th>Status</Th>
                  <Th>User / Trace ID</Th>
                  <Th>Post Excerpt</Th>
                  <Th>Stance</Th>
                  <Th>Feedback</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const empty = !item.comment_1 && !item.comment_2
                  const outcome = OUTCOME_STYLE[item.outcome]
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-line transition-colors last:border-0 hover:bg-surface-2/50"
                    >
                      <Td>
                        <span className="inline-flex items-center gap-2.5">
                          <StatusDot tone={empty ? 'danger' : outcome.tone} />
                          <Badge tone={empty ? 'danger' : outcome.tone}>
                            {empty ? 'NO OUTPUT' : outcome.label}
                          </Badge>
                        </span>
                      </Td>
                      <Td>
                        <p className="font-mono text-xs text-fg">
                          {item.userName ?? item.userEmail?.split('@')[0] ?? 'unknown'}
                        </p>
                        <p className="font-mono text-2xs text-dim">{traceId(item.id)}</p>
                      </Td>
                      <Td className="max-w-[380px]">
                        <p
                          className={
                            empty
                              ? 'text-sm italic text-danger/80'
                              : 'truncate text-sm text-muted-foreground'
                          }
                        >
                          {empty
                            ? 'Generation logged with no comment text…'
                            : `“${truncate(item.post_text, 78)}”`}
                        </p>
                      </Td>
                      <Td>
                        <Badge tone={item.stance_1 ? 'accent' : 'neutral'}>
                          {item.stance_1 ?? 'undefined'}
                        </Badge>
                      </Td>
                      <Td>
                        {item.like === null ? (
                          <span className="font-mono text-xs text-dim">—</span>
                        ) : (
                          <span
                            className={`font-mono text-xs ${item.like === 'liked' ? 'text-success' : 'text-danger'}`}
                          >
                            {item.like}
                          </span>
                        )}
                      </Td>
                      <Td className="text-right">
                        <button
                          type="button"
                          onClick={() => setSelected(item)}
                          title="Inspect trace"
                          className="inline-grid size-8 place-items-center rounded-md border border-line bg-surface-2 text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
                        >
                          <SquareTerminal size={15} />
                        </button>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </TableShell>

            <div className="flex items-center justify-between border-t border-line px-4 py-3">
              <span className="font-mono text-xs text-muted-foreground">
                Showing {items.length} of {data.total} generations
              </span>
              <span className="inline-flex items-center gap-2 font-mono text-xs">
                <StatusDot tone={successRate === 1 ? 'success' : 'warn'} pulse />
                <span className={successRate === 1 ? 'text-success' : 'text-warn'}>
                  {successRate === 1 ? 'SYSTEMS NOMINAL' : 'DEGRADED OUTPUT'}
                </span>
              </span>
            </div>
          </>
        )}
      </Panel>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <p className="font-mono text-2xs leading-relaxed text-dim">
          Latency and per-call cost are not recorded by the generation pipeline, so they are
          absent from this feed. Add timing columns to{' '}
          <span className="text-muted-foreground">generation_log</span> to surface them here.
        </p>
        <span className="ml-auto flex gap-4 font-mono text-2xs">
          <a href="/history" className="text-accent-soft hover:opacity-75">
            Extension history →
          </a>
          <a href="/replies" className="text-accent-soft hover:opacity-75">
            Replies received →
          </a>
        </span>
      </div>

      {selected && <TraceDrawer item={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  const color =
    tone === 'mint' ? 'text-mint' : tone === 'cyan' ? 'text-cyan' : 'text-accent-soft'
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-2.5 text-center">
      <p className="font-mono text-2xs uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 font-mono text-lg font-semibold tabular ${color}`}>{value}</p>
    </div>
  )
}

function TraceDrawer({
  item,
  onClose,
}: {
  item: GenerationFeedItem
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60" onClick={onClose}>
      <div
        className="h-full w-full max-w-2xl overflow-y-auto border-l border-line bg-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-panel px-6 py-4">
          <div>
            <p className="font-mono text-sm text-fg">{traceId(item.id)}</p>
            <p className="font-mono text-2xs text-dim">{fmtDateTime(item.created_at)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-fg"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <Field label="User">
            {item.userName ?? '—'}{' '}
            <span className="text-dim">({item.userEmail ?? item.user_id})</span>
          </Field>
          <Field label="Category">{item.category ?? '—'}</Field>
          <Field label="Post source">{item.post_url ?? item.post_id ?? '—'}</Field>
          <Field label="Post text">
            <span className="whitespace-pre-wrap">{item.post_text || '—'}</span>
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Comment
              index={1}
              stance={item.stance_1}
              text={item.comment_1}
              liked={item.comment_1_liked}
              chosen={item.used_comment === '1'}
            />
            <Comment
              index={2}
              stance={item.stance_2}
              text={item.comment_2}
              liked={item.comment_2_liked}
              chosen={item.used_comment === '2'}
            />
          </div>

          {item.final_posted_text && (
            <Field label="Final posted text">
              <span className="whitespace-pre-wrap">{item.final_posted_text}</span>
            </Field>
          )}

          <Field label="BMC context used">
            <Badge tone={item.bmc_used ? 'warn' : 'neutral'}>
              {item.bmc_used ? 'yes' : 'no'}
            </Badge>
          </Field>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 font-mono text-2xs uppercase tracking-[0.06em] text-dim">{label}</p>
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  )
}

function Comment({
  index,
  stance,
  text,
  liked,
  chosen,
}: {
  index: number
  stance: string | null
  text: string | null
  liked: boolean | null
  chosen: boolean
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${chosen ? 'border-accent/40 bg-accent/[0.06]' : 'border-line bg-surface'}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="font-mono text-2xs uppercase tracking-[0.06em] text-dim">
          Comment {index}
        </span>
        {stance && <Badge tone="accent">{stance}</Badge>}
        {chosen && <Badge tone="mint">used</Badge>}
        {liked != null && (
          <Badge tone={liked ? 'success' : 'danger'}>{liked ? 'liked' : 'disliked'}</Badge>
        )}
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {text ?? '—'}
      </p>
    </div>
  )
}
