'use client'

import Link from 'next/link'
import { ChevronRight, Info, Sparkles } from 'lucide-react'
import { useAdminResource } from '../../../hooks/useAdminResource'
import { ResourceState } from '../../../components/ui/ResourceState'
import { DailyBars } from '../../../components/charts/Charts'
import {
  Badge,
  Meter,
  Panel,
  PanelHeader,
  StatusDot,
  Td,
  Th,
  TableShell,
  type Tone,
} from '../../../components/ui/primitives'
import { fmtAgo, fmtDate, fmtDateTime, fmtPercent, initials, truncate } from '../../../lib/format'

interface UserDetail {
  user: {
    id: string
    email: string | null
    createdAt: string
    lastSignInAt: string | null
    confirmed: boolean
    name: string | null
    headline: string | null
  }
  profile: {
    background: Record<string, unknown>
    tonePreferences: Record<string, unknown> | null
    updatedAt: string
  } | null
  usage: {
    windowDays: number
    perDay: Array<{ date: string; count: number }>
    total: number
    used: number
    edited: number
    unused: number
    liked: number
    disliked: number
    bmcUsed: number
    categories: Array<{ key: string; count: number }>
    stances: Array<{ key: string; count: number }>
    lastGenerationAt: string | null
  }
  billing: {
    available: boolean
    planName: string | null
    priceUsd: number | null
    apiRequestsPerMonth: number | null
    status: string | null
    renewalDate: string | null
  }
  recent: Array<{
    id: string
    createdAt: string
    category: string | null
    stance: string | null
    postText: string
    outcome: 'used' | 'edited' | 'unused'
    like: 'liked' | 'disliked' | null
  }>
}

const OUTCOME_TONE: Record<UserDetail['recent'][number]['outcome'], Tone> = {
  used: 'success',
  edited: 'cyan',
  unused: 'warn',
}

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const { data, status, error, notConfigured, reload } = useAdminResource<UserDetail>(
    `/api/users/${params.id}`
  )

  return (
    <div>
      <nav className="mb-6 flex items-center gap-2 font-mono text-xs">
        <Link href="/users" className="text-muted-foreground hover:text-fg">
          Users
        </Link>
        <ChevronRight size={13} className="text-dim" />
        <span className="text-fg">Detail: {data?.user.email ?? params.id}</span>
      </nav>

      <ResourceState
        status={status}
        error={error}
        notConfigured={notConfigured}
        onRetry={reload}
      >
        {data && <Detail data={data} />}
      </ResourceState>
    </div>
  )
}

function Detail({ data }: { data: UserDetail }) {
  const { user, usage, profile, billing } = data
  const adoption = usage.total ? (usage.used + usage.edited) / usage.total : null
  const displayName = user.name ?? user.email?.split('@')[0] ?? 'Unknown user'

  return (
    <div className="space-y-6">
      {/* Identity header */}
      <div className="flex flex-wrap items-center gap-5">
        <span className="grid size-[88px] shrink-0 place-items-center rounded-lg bg-accent/12 font-mono text-2xl font-semibold text-accent-soft">
          {initials(user.name, user.email)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-fg">{displayName}</h1>
            <Badge tone={user.confirmed ? 'success' : 'warn'}>
              {user.confirmed ? 'ACTIVE' : 'PENDING'}
            </Badge>
          </div>
          <p className="mt-1.5 font-mono text-xs text-muted-foreground">
            {user.email ?? '—'} <span className="text-dim">·</span> User ID:{' '}
            <span className="text-dim">{user.id}</span>
          </p>
          {user.headline && (
            <p className="mt-1 text-sm text-muted-foreground">{user.headline}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/monitoring?userId=${user.id}`}
            className="rounded-md border border-line bg-surface-2 px-4 py-2.5 font-mono text-xs text-muted-foreground transition-colors hover:border-line-strong hover:text-fg"
          >
            View Generations
          </Link>
          <span
            title="Impersonation is not implemented: it would require minting a session for another user, which this console deliberately does not do."
            className="cursor-not-allowed rounded-md bg-accent-soft/25 px-4 py-2.5 font-mono text-xs font-semibold text-dim"
          >
            Impersonate — disabled
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
        {/* Account info */}
        <Panel className="flex flex-col">
          <PanelHeader
            title="Account Info"
            action={<Info size={16} className="text-dim" />}
          />
          <dl className="flex-1 space-y-4 px-5 pb-5">
            <Row label="Subscription Tier">
              {billing.available ? (
                <span className="text-accent-soft">{billing.planName ?? 'No plan'}</span>
              ) : (
                <span className="text-dim" title="Billing tables not migrated yet">
                  not configured
                </span>
              )}
            </Row>
            <Row label="Billing Cycle">
              {billing.priceUsd != null ? (
                `Monthly ($${billing.priceUsd.toFixed(2)})`
              ) : (
                <span className="text-dim">—</span>
              )}
            </Row>
            <Row label="Renewal">
              {billing.renewalDate ? fmtDate(billing.renewalDate) : <span className="text-dim">—</span>}
            </Row>
            <Row label="Join Date">{fmtDate(user.createdAt)}</Row>
            <Row label="Last Login">{fmtAgo(user.lastSignInAt)}</Row>
            <Row label="Last Generation">{fmtAgo(usage.lastGenerationAt)}</Row>
          </dl>

          <div className="mx-5 mb-5 rounded-md border border-line bg-surface-2/60 px-4 py-3.5">
            {billing.apiRequestsPerMonth != null ? (
              <Meter
                value={usage.total}
                max={billing.apiRequestsPerMonth}
                label={`${usage.total.toLocaleString()} / ${billing.apiRequestsPerMonth.toLocaleString()} requests`}
              />
            ) : (
              <>
                <p className="mb-2 font-mono text-2xs uppercase tracking-[0.06em] text-dim">
                  Usage ({usage.windowDays}d)
                </p>
                <p className="font-mono text-sm text-fg">
                  {usage.total.toLocaleString()} generations
                </p>
                <p className="mt-1 font-mono text-2xs text-dim">
                  No plan quota — token usage is not metered in this project.
                </p>
              </>
            )}
          </div>
        </Panel>

        {/* Prompt context (real "AI personality data") */}
        <Panel className="flex flex-col">
          <PanelHeader
            title="AI Prompt Context"
            action={<Sparkles size={16} className="text-accent-soft" />}
          />
          <div className="flex-1 px-5 pb-5">
            {profile ? (
              <div className="space-y-4">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Stored in{' '}
                  <span className="font-mono text-dim">user_profiles.background_json</span> and
                  injected into every generation prompt as{' '}
                  <span className="font-mono text-dim">{'{{user_background}}'}</span>. Last
                  updated {fmtDateTime(profile.updatedAt)}.
                </p>

                <dl className="space-y-3 rounded-md border border-line bg-surface-2/50 p-4">
                  {Object.entries(profile.background).length === 0 && (
                    <p className="font-mono text-xs text-dim">background_json is empty.</p>
                  )}
                  {Object.entries(profile.background).map(([key, value]) => (
                    <div key={key}>
                      <dt className="font-mono text-2xs uppercase tracking-[0.06em] text-accent-soft">
                        {key.replace(/_/g, ' ')}
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                      </dd>
                    </div>
                  ))}
                </dl>

                {usage.stances.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {usage.stances.slice(0, 6).map((s) => (
                      <span
                        key={s.key}
                        className="rounded-md bg-cyan/10 px-2.5 py-1 font-mono text-2xs text-cyan"
                      >
                        #{s.key} · {s.count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-warn/30 bg-warn/[0.06] px-4 py-4">
                <p className="font-mono text-sm text-warn">No stored profile</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  This user has no <span className="font-mono text-dim">user_profiles</span> row,
                  so generations fall back to the built-in default profile in{' '}
                  <span className="font-mono text-dim">
                    backend/src/services/user-profile.ts
                  </span>
                  .
                </p>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Usage history */}
      <Panel>
        <PanelHeader
          title="Usage History"
          action={
            <span className="font-mono text-2xs text-dim">
              generations over the last {usage.windowDays} days
            </span>
          }
        />
        <div className="px-5 pb-6">
          <DailyBars data={usage.perDay} height={200} />

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5 md:grid-cols-5">
            <Metric label="Total" value={usage.total.toLocaleString()} />
            <Metric label="Used" value={usage.used.toLocaleString()} tone="text-success" />
            <Metric label="Edited" value={usage.edited.toLocaleString()} tone="text-cyan" />
            <Metric label="Adoption" value={fmtPercent(adoption)} tone="text-accent-soft" />
            <Metric
              label="Disliked"
              value={usage.disliked.toLocaleString()}
              tone={usage.disliked ? 'text-danger' : undefined}
            />
          </div>
        </div>
      </Panel>

      {/* Recent generations */}
      <Panel className="overflow-hidden">
        <PanelHeader
          title="Recent Generations"
          action={
            <Link
              href={`/monitoring?userId=${user.id}`}
              className="font-mono text-xs text-accent-soft hover:opacity-75"
            >
              Full feed →
            </Link>
          }
        />
        {data.recent.length === 0 ? (
          <p className="px-5 pb-8 text-sm text-muted-foreground">
            No generations in the last {usage.windowDays} days.
          </p>
        ) : (
          <TableShell>
            <thead>
              <tr className="border-b border-line">
                <Th>When</Th>
                <Th>Post</Th>
                <Th>Category</Th>
                <Th>Stance</Th>
                <Th className="text-right">Outcome</Th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((g) => (
                <tr key={g.id} className="border-b border-line last:border-0">
                  <Td className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {fmtDateTime(g.createdAt)}
                  </Td>
                  <Td className="max-w-[420px]">
                    <p className="truncate text-sm text-muted-foreground">
                      {truncate(g.postText, 90)}
                    </p>
                  </Td>
                  <Td>
                    <Badge>{g.category ?? 'unknown'}</Badge>
                  </Td>
                  <Td>
                    <Badge tone="accent">{g.stance ?? '—'}</Badge>
                  </Td>
                  <Td className="text-right">
                    <span className="inline-flex items-center gap-2">
                      {g.like && (
                        <StatusDot tone={g.like === 'liked' ? 'success' : 'danger'} />
                      )}
                      <Badge tone={OUTCOME_TONE[g.outcome]}>{g.outcome}</Badge>
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Panel>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="font-mono text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right font-mono text-sm text-fg">{children}</dd>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="font-mono text-2xs uppercase tracking-[0.06em] text-dim">{label}</p>
      <p className={`mt-1 font-mono text-xl font-semibold tabular ${tone ?? 'text-fg'}`}>
        {value}
      </p>
    </div>
  )
}
