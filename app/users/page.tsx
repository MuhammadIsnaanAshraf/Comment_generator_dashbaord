'use client'

import { Fragment, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, MoreVertical, UserPlus } from 'lucide-react'
import { useAdminResource } from '../../hooks/useAdminResource'
import { ResourceState } from '../../components/ui/ResourceState'
import { Header } from '../../components/layout/Header'
import {
  Badge,
  EmptyState,
  GhostButton,
  Meter,
  Panel,
  StatTile,
  StatusDot,
  Td,
  Th,
  TableShell,
  type Tone,
} from '../../components/ui/primitives'
import { fmtAgo, fmtCount, fmtDate, initials } from '../../lib/format'
import type { AdminUser } from '../../types'

interface UsersResponse {
  users: AdminUser[]
  total: number
  activityWindowDays: number
}

type SortKey = 'newest' | 'activity' | 'all'
type StatusFilter = 'all' | 'active' | 'pending' | 'dormant'

const ROWS_PER_PAGE = 15
/** No sign-in and no generation in this many days counts as dormant. */
const DORMANT_DAYS = 30

function statusOf(u: AdminUser): { label: string; tone: Tone } {
  if (!u.confirmed) return { label: 'Pending', tone: 'warn' }
  const cutoff = Date.now() - DORMANT_DAYS * 86_400_000
  const lastSeen = Math.max(
    u.lastSignInAt ? +new Date(u.lastSignInAt) : 0,
    u.lastGenerationAt ? +new Date(u.lastGenerationAt) : 0
  )
  if (lastSeen < cutoff) return { label: 'Dormant', tone: 'neutral' }
  return { label: 'Active', tone: 'success' }
}

export default function UsersPage() {
  const { data, status, error, notConfigured, reload } =
    useAdminResource<UsersResponse>('/api/users')

  return (
    <ResourceState status={status} error={error} notConfigured={notConfigured} onRetry={reload}>
      {data && <Directory data={data} onRefresh={reload} />}
    </ResourceState>
  )
}

function Directory({ data, onRefresh }: { data: UsersResponse; onRefresh: () => void }) {
  const [sort, setSort] = useState<SortKey>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)

  const peakGenerations = useMemo(
    () => Math.max(1, ...data.users.map((u) => u.generations)),
    [data.users]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = data.users.filter((u) => {
      if (q && !`${u.email ?? ''} ${u.name ?? ''} ${u.id}`.toLowerCase().includes(q)) return false
      if (statusFilter === 'all') return true
      return statusOf(u).label.toLowerCase() === statusFilter
    })

    if (sort === 'newest') {
      rows = [...rows].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    } else if (sort === 'activity') {
      rows = [...rows].sort((a, b) => b.generations - a.generations)
    }
    return rows
  }, [data.users, query, statusFilter, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const safePage = Math.min(page, pageCount - 1)
  const rows = filtered.slice(safePage * ROWS_PER_PAGE, (safePage + 1) * ROWS_PER_PAGE)

  const pendingCount = data.users.filter((u) => !u.confirmed).length
  const newToday = data.users.filter(
    (u) => +new Date(u.createdAt) > Date.now() - 86_400_000
  ).length
  const activeCount = data.users.filter((u) => statusOf(u).label === 'Active').length

  function update<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(0)
    }
  }

  return (
    <div>
      <Header
        title="User Directory"
        description={`Manage operational access and review generation activity for ${data.total.toLocaleString()} account${data.total === 1 ? '' : 's'}.`}
        action={
          <>
            <div className="flex rounded-lg border border-line bg-surface p-1">
              {(
                [
                  ['all', 'All'],
                  ['newest', 'Newest'],
                  ['activity', 'Activity'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => update(setSort)(key)}
                  className={[
                    'rounded-md px-4 py-1.5 font-mono text-xs transition-colors',
                    sort === key
                      ? 'bg-surface-2 text-fg'
                      : 'text-muted-foreground hover:text-fg',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-lg bg-accent-soft px-4 py-2.5 font-mono text-xs font-semibold text-[hsl(250_30%_10%)] transition-opacity hover:opacity-90"
            >
              <UserPlus size={14} strokeWidth={2.25} />
              Refresh Directory
            </button>
          </>
        }
      />

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => update(setQuery)(e.target.value)}
          placeholder="Filter by name, email or ID…"
          className="h-10 min-w-[260px] flex-1 rounded-lg border border-line bg-surface px-4 text-sm text-fg placeholder:text-dim focus:border-accent/50 focus:outline-none"
        />
        {(['all', 'active', 'pending', 'dormant'] as const).map((s) => (
          <GhostButton
            key={s}
            active={statusFilter === s}
            onClick={() => update(setStatusFilter)(s)}
            className="capitalize"
          >
            {s === 'all' ? 'All statuses' : s}
          </GhostButton>
        ))}
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          Showing {filtered.length ? safePage * ROWS_PER_PAGE + 1 : 0}–
          {Math.min(filtered.length, (safePage + 1) * ROWS_PER_PAGE)} of {filtered.length} users
        </span>
      </div>

      <Panel className="mb-6 overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            title="No users match these filters."
            hint="Clear the search box or switch back to “All statuses”."
          />
        ) : (
          <>
            <TableShell>
              <thead>
                <tr className="border-b border-line">
                  <Th>Name &amp; Email</Th>
                  <Th>Profile</Th>
                  <Th>Signup Date</Th>
                  <Th>Generation Activity</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const st = statusOf(u)
                  const isOpen = expanded === u.id
                  return (
                    <Fragment key={u.id}>
                      <tr className="border-b border-line transition-colors last:border-0 hover:bg-surface-2/50">
                        <Td>
                          <div className="flex items-center gap-3">
                            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-accent/12 font-mono text-xs font-semibold text-accent-soft">
                              {initials(u.name, u.email)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-fg">
                                {u.name ?? u.email?.split('@')[0] ?? 'Unknown'}
                              </p>
                              <p className="truncate font-mono text-2xs text-dim">
                                {u.email ?? '—'}
                              </p>
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <Badge tone={u.name ? 'accent' : 'neutral'}>
                            {u.name ? 'Configured' : 'Default'}
                          </Badge>
                        </Td>
                        <Td className="font-mono text-xs tabular text-muted-foreground">
                          {fmtDate(u.createdAt)}
                        </Td>
                        <Td>
                          <Meter
                            value={u.generations}
                            max={peakGenerations}
                            label={`${u.generations}/${peakGenerations}`}
                            tone="accent"
                          />
                        </Td>
                        <Td>
                          <span className="inline-flex items-center gap-2 font-mono text-xs">
                            <StatusDot tone={st.tone} />
                            <span
                              className={
                                st.tone === 'success'
                                  ? 'text-success'
                                  : st.tone === 'warn'
                                    ? 'text-warn'
                                    : 'text-muted-foreground'
                              }
                            >
                              {st.label}
                            </span>
                          </span>
                        </Td>
                        <Td className="text-right">
                          <div className="flex items-center justify-end gap-4">
                            <Link
                              href={`/users/${u.id}`}
                              className="font-mono text-xs text-accent-soft transition-opacity hover:opacity-75"
                            >
                              View Detail
                            </Link>
                            <button
                              type="button"
                              onClick={() => setExpanded(isOpen ? null : u.id)}
                              className="font-mono text-xs text-cyan transition-opacity hover:opacity-75"
                            >
                              {isOpen ? 'Hide' : 'Quick Look'}
                            </button>
                            <span className="text-dim">
                              <MoreVertical size={16} />
                            </span>
                          </div>
                        </Td>
                      </tr>

                      {isOpen && (
                        <tr className="border-b border-line bg-ink/60">
                          <td colSpan={6} className="px-4 py-4">
                            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 font-mono text-xs md:grid-cols-4">
                              <Detail label="User ID" value={u.id} />
                              <Detail label="Headline" value={u.headline ?? '—'} />
                              <Detail label="Last sign-in" value={fmtAgo(u.lastSignInAt)} />
                              <Detail
                                label="Last generation"
                                value={fmtAgo(u.lastGenerationAt)}
                              />
                              <Detail
                                label="Generations (90d)"
                                value={u.generations.toString()}
                              />
                              <Detail label="Used or edited" value={u.used.toString()} />
                              <Detail
                                label="Adoption"
                                value={
                                  u.generations
                                    ? `${Math.round((u.used / u.generations) * 100)}%`
                                    : '—'
                                }
                              />
                              <Detail
                                label="Email confirmed"
                                value={u.confirmed ? 'yes' : 'no'}
                              />
                            </dl>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </TableShell>

            <div className="flex items-center justify-between border-t border-line px-4 py-3">
              <span className="font-mono text-xs text-muted-foreground">
                Rows per page: <span className="text-fg">{ROWS_PER_PAGE}</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">
                  Page {safePage + 1} of {pageCount}
                </span>
                <GhostButton
                  onClick={() => setPage(Math.max(0, safePage - 1))}
                  disabled={safePage === 0}
                  title="Previous page"
                >
                  <ChevronLeft size={14} />
                </GhostButton>
                <GhostButton
                  onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
                  disabled={safePage >= pageCount - 1}
                  title="Next page"
                >
                  <ChevronRight size={14} />
                </GhostButton>
              </div>
            </div>
          </>
        )}
      </Panel>

      {/* Footer metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatTile
          label="Active Accounts"
          value={fmtCount(activeCount)}
          tone="accent"
          progress={data.total ? activeCount / data.total : 0}
          caption={`Signed in or generated within ${DORMANT_DAYS} days`}
        />
        <StatTile
          label="Pending Confirmation"
          value={fmtCount(pendingCount)}
          tone={pendingCount > 0 ? 'danger' : 'neutral'}
          chip={pendingCount > 0 ? 'ACTION' : 'CLEAR'}
          chipTone={pendingCount > 0 ? 'danger' : 'success'}
          caption="Accounts that never confirmed their email address"
        />
        <StatTile
          label="New Registrations"
          value={fmtCount(newToday)}
          tone="cyan"
          chip="TODAY"
          chipTone="cyan"
          caption={`Activity window: last ${data.activityWindowDays} days`}
        />
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-2xs uppercase tracking-[0.06em] text-dim">{label}</dt>
      <dd className="mt-1 truncate text-muted-foreground" title={value}>
        {value}
      </dd>
    </div>
  )
}
