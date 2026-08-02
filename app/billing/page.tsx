'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CreditCard, MoreVertical } from 'lucide-react'
import { useAdminResource } from '../../hooks/useAdminResource'
import { ResourceState } from '../../components/ui/ResourceState'
import { Header } from '../../components/layout/Header'
import { SERIES } from '../../components/charts/Charts'
import {
  Badge,
  EmptyState,
  Panel,
  PanelHeader,
  StatTile,
  Td,
  Th,
  TableShell,
  type Tone,
} from '../../components/ui/primitives'
import { fmtDate, fmtDateTime, fmtPercent } from '../../lib/format'

interface PlanConfig {
  id: string
  name: string
  priceUsd: number
  userLimit: number | null
  apiRequestsPerMonth: number | null
  prioritySupport: boolean
  sortOrder: number
}

interface BillingResponse {
  available: boolean
  migration?: string
  missing?: string[]
  totalUsers: number
  mrr?: number
  arr?: number
  activeSubscriptions?: number
  unassignedUsers?: number
  trend?: Array<{ month: string; mrr: number }>
  distribution?: Array<{ planId: string; name: string; count: number }>
  plans?: PlanConfig[]
  recentSubscriptions?: Array<{
    id: string
    email: string | null
    userId: string
    planId: string
    planName: string
    status: 'active' | 'trialing' | 'past_due' | 'canceled'
    renewalDate: string | null
    startedAt: string
  }>
  failedPayments?: Array<{
    id: string
    email: string | null
    userId: string
    amountUsd: number
    status: 'failed' | 'dunning'
    attemptCount: number
    failureReason: string | null
    nextAttemptAt: string | null
    createdAt: string
  }>
}

const SUB_STATUS_TONE: Record<string, Tone> = {
  active: 'success',
  trialing: 'cyan',
  past_due: 'warn',
  canceled: 'neutral',
}

const usd = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n.toFixed(2)}`
}

export default function BillingPage() {
  const { data, status, error, notConfigured, reload } =
    useAdminResource<BillingResponse>('/api/billing')

  return (
    <div>
      <Header
        title="Billing"
        description="Recurring revenue, plan mix, and the plan catalogue the product bills against."
      />

      <ResourceState
        status={status}
        error={error}
        notConfigured={notConfigured}
        onRetry={reload}
      >
        {data && (data.available ? <Billing data={data} reload={reload} /> : <Unmigrated data={data} />)}
      </ResourceState>
    </div>
  )
}

function Unmigrated({ data }: { data: BillingResponse }) {
  return (
    <div>
      <div className="mb-6 flex items-start gap-4 rounded-lg border border-warn/30 bg-warn/[0.06] px-5 py-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-warn/15 text-warn">
          <CreditCard size={18} strokeWidth={1.75} />
        </span>
        <div>
          <p className="font-mono text-sm text-warn">Billing tables not created yet</p>
          <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Missing:{' '}
            <span className="font-mono text-dim">{data.missing?.join(', ') ?? '—'}</span>. Apply{' '}
            <span className="font-mono text-dim">{data.migration}</span> (via{' '}
            <span className="font-mono text-dim">supabase db push</span> or the SQL editor) and
            this page fills in. Per the project&apos;s AGENTS.md, migrations are applied by a
            human, never by the console.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="MRR" value="—" chip="NO TABLE" caption="Needs subscriptions + plans" />
        <StatTile label="ARR" value="—" chip="NO TABLE" caption="Needs subscriptions + plans" />
        <StatTile
          label="Active Subscriptions"
          value="—"
          chip="NO TABLE"
          caption="Needs the subscriptions table"
        />
        <StatTile
          label="Registered Accounts"
          value={data.totalUsers.toLocaleString()}
          tone="accent"
          caption="From auth.users — the only real figure here"
        />
      </div>
    </div>
  )
}

function Billing({ data, reload }: { data: BillingResponse; reload: () => void }) {
  const trend = data.trend ?? []
  const distribution = data.distribution ?? []
  const distTotal = distribution.reduce((sum, d) => sum + d.count, 0)

  const lastMonth = trend.length > 1 ? trend[trend.length - 2].mrr : 0
  const thisMonth = trend.length ? trend[trend.length - 1].mrr : 0
  const delta = lastMonth > 0 ? (thisMonth - lastMonth) / lastMonth : null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="MRR"
          value={usd(data.mrr ?? 0)}
          tone="accent"
          highlight
          chip={delta != null ? `${delta >= 0 ? '▲' : '▼'} ${fmtPercent(Math.abs(delta), 1)}` : undefined}
          chipTone={delta != null && delta >= 0 ? 'success' : 'danger'}
          caption={`ARR projected: ${usd(data.arr ?? 0)}`}
        />
        <StatTile
          label="Active Subscriptions"
          value={(data.activeSubscriptions ?? 0).toLocaleString()}
          tone="mint"
          caption={`of ${data.totalUsers.toLocaleString()} accounts`}
        />
        <StatTile
          label="Unassigned Accounts"
          value={(data.unassignedUsers ?? 0).toLocaleString()}
          tone={data.unassignedUsers ? 'warn' : 'neutral'}
          caption="Registered but on no plan"
        />
        <StatTile
          label="Failed Payments"
          value={(data.failedPayments?.length ?? 0).toLocaleString()}
          tone={data.failedPayments?.length ? 'danger' : 'neutral'}
          chip={data.failedPayments?.length ? 'ACTION' : 'CLEAR'}
          chipTone={data.failedPayments?.length ? 'danger' : 'success'}
          caption="Invoices in failed or dunning state"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* MRR trend */}
        <Panel>
          <PanelHeader
            title="MRR Trend"
            action={
              <span
                className={`font-mono text-xs ${delta != null && delta < 0 ? 'text-danger' : 'text-success'}`}
              >
                {delta != null
                  ? `${delta >= 0 ? '+' : ''}${fmtPercent(delta, 1)} vs last month`
                  : 'no prior month'}
              </span>
            }
          />
          <div className="px-5 pb-6">
            <MrrTrend trend={trend} />
          </div>
        </Panel>

        {/* Plan distribution */}
        <Panel>
          <PanelHeader title="Plan Distribution" />
          <div className="px-5 pb-6">
            <Donut
              segments={distribution.map((d, i) => ({
                label: d.name,
                value: d.count,
                color: SERIES[i % SERIES.length],
              }))}
              total={distTotal}
            />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Recent subscriptions */}
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Recent Subscriptions"
            action={
              <Link href="/users" className="font-mono text-xs text-accent-soft hover:opacity-75">
                View All
              </Link>
            }
          />
          {!data.recentSubscriptions?.length ? (
            <EmptyState
              title="No subscriptions recorded."
              hint="The subscriptions table exists but is empty — nothing has been written to it yet."
            />
          ) : (
            <TableShell>
              <thead>
                <tr className="border-b border-line">
                  <Th>User</Th>
                  <Th>Plan Tier</Th>
                  <Th>Renewal Date</Th>
                  <Th className="text-right">Status</Th>
                </tr>
              </thead>
              <tbody>
                {data.recentSubscriptions.map((s) => (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <Td>
                      <Link
                        href={`/users/${s.userId}`}
                        className="text-sm text-fg hover:text-accent-soft"
                      >
                        {s.email ?? s.userId}
                      </Link>
                    </Td>
                    <Td>
                      <Badge tone="accent">{s.planName}</Badge>
                    </Td>
                    <Td className="font-mono text-xs tabular text-muted-foreground">
                      {s.renewalDate ? fmtDate(s.renewalDate) : 'N/A'}
                    </Td>
                    <Td className="text-right">
                      <Badge tone={SUB_STATUS_TONE[s.status] ?? 'neutral'}>{s.status}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </Panel>

        {/* Failed payments */}
        <Panel>
          <PanelHeader title={<span className="text-danger">Failed Payments</span>} />
          <div className="space-y-3 px-5 pb-5">
            {!data.failedPayments?.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No failed or dunning invoices.
              </p>
            ) : (
              data.failedPayments.map((inv) => (
                <div
                  key={inv.id}
                  className={`rounded-lg border px-4 py-3 ${
                    inv.status === 'failed'
                      ? 'border-danger/40 bg-danger/[0.07]'
                      : 'border-cyan/30 bg-cyan/[0.05]'
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-fg">#{inv.id}</span>
                    <Badge tone={inv.status === 'failed' ? 'danger' : 'cyan'}>
                      {inv.status}
                    </Badge>
                  </div>
                  <Link
                    href={`/users/${inv.userId}`}
                    className="block truncate text-sm text-muted-foreground hover:text-fg"
                  >
                    {inv.email ?? inv.userId}
                  </Link>
                  <p className="mt-1 font-mono text-2xs text-dim">
                    ${inv.amountUsd.toFixed(2)} · attempt {inv.attemptCount}
                    {inv.failureReason ? ` · ${inv.failureReason}` : ''}
                    {inv.nextAttemptAt ? ` · retry ${fmtDateTime(inv.nextAttemptAt)}` : ''}
                  </p>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      <PlanConfiguration plans={data.plans ?? []} onSaved={reload} />
    </div>
  )
}

/* ------------------------------------------------------------- MRR trend */

function MrrTrend({ trend }: { trend: Array<{ month: string; mrr: number }> }) {
  if (!trend.length) {
    return <p className="py-12 text-center font-mono text-xs text-dim">No trend data.</p>
  }

  const max = Math.max(1, ...trend.map((t) => t.mrr))

  return (
    <div>
      <div className="flex h-[220px] items-end gap-3">
        {trend.map((t, i) => {
          const latest = i === trend.length - 1
          return (
            <div key={t.month} className="flex h-full flex-1 flex-col justify-end">
              <span className="mb-1.5 text-center font-mono text-2xs tabular text-muted-foreground">
                {usd(t.mrr)}
              </span>
              <div
                className="w-full rounded-t-[4px]"
                style={{
                  height: `${Math.max(t.mrr > 0 ? 2 : 0, (t.mrr / max) * 100)}%`,
                  // Single-series magnitude: one hue, the latest bar at full
                  // strength and history stepped back.
                  background: latest ? '#a78bfa' : '#5b4b8a',
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-3 border-t border-line pt-2">
        {trend.map((t) => (
          <span
            key={t.month}
            className="flex-1 text-center font-mono text-xs tabular text-muted-foreground"
          >
            {t.month}
          </span>
        ))}
      </div>
      <p className="mt-3 font-mono text-2xs leading-relaxed text-dim">
        Reconstructed from subscription start/cancel dates × current plan price — it reflects
        billable value, not payments collected.
      </p>
    </div>
  )
}

/* ----------------------------------------------------------------- Donut */

function Donut({
  segments,
  total,
}: {
  segments: Array<{ label: string; value: number; color: string }>
  total: number
}) {
  const size = 148
  const stroke = 22
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  let offset = 0

  return (
    <div className="flex flex-col items-center">
      {total === 0 ? (
        <p className="py-10 text-center font-mono text-xs text-dim">
          No active subscriptions to distribute.
        </p>
      ) : (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Plan distribution">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--surface-2))"
            strokeWidth={stroke}
          />
          {segments.map((s) => {
            const fraction = s.value / total
            const dash = fraction * circumference
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                // 2px surface gap between adjacent segments, per the mark spec.
                strokeDasharray={`${Math.max(0, dash - 2)} ${circumference - Math.max(0, dash - 2)}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            )
            offset += dash
            return el
          })}
          <text
            x="50%"
            y="47%"
            textAnchor="middle"
            className="fill-[hsl(var(--fg))] font-mono text-xl font-semibold"
          >
            {total.toLocaleString()}
          </text>
          <text
            x="50%"
            y="61%"
            textAnchor="middle"
            className="fill-[hsl(var(--dim-fg))] font-mono text-[10px]"
          >
            Active
          </text>
        </svg>
      )}

      {/* Legend — always present for ≥2 series, values direct-labeled. */}
      <ul className="mt-5 w-full space-y-2.5">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5">
            <span className="size-2 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="font-mono text-xs text-fg">{s.label}</span>
            <span className="ml-auto font-mono text-xs tabular text-muted-foreground">
              {s.value}
              <span className="ml-2 text-dim">
                {total ? `${Math.round((s.value / total) * 100)}%` : '0%'}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------------------------------------------------- Plan configuration */

function PlanConfiguration({
  plans,
  onSaved,
}: {
  plans: PlanConfig[]
  onSaved: () => void
}) {
  const [draft, setDraft] = useState<PlanConfig[]>(plans)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => setDraft(plans), [plans])

  const dirty = JSON.stringify(draft) !== JSON.stringify(plans)

  function patch(id: string, changes: Partial<PlanConfig>) {
    setDraft((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)))
  }

  async function save() {
    setSaving(true)
    setNotice(null)
    try {
      const res = await fetch('/api/billing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans: draft }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status}).`)
      setNotice({ tone: 'ok', text: `Saved ${body.updated} plan${body.updated === 1 ? '' : 's'}.` })
      onSaved()
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Save failed.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pb-4 pt-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-fg">Plan Configuration</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update global pricing and feature limits. Writes to{' '}
            <span className="font-mono text-xs text-dim">billing_plans</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {notice && (
            <span
              className={`font-mono text-xs ${notice.tone === 'ok' ? 'text-success' : 'text-danger'}`}
            >
              {notice.text}
            </span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="rounded-md bg-accent-soft px-5 py-2.5 font-mono text-xs font-semibold text-[hsl(250_30%_10%)] transition-opacity hover:opacity-90 disabled:opacity-35"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {draft.length === 0 ? (
        <EmptyState title="No plans in the catalogue." />
      ) : (
        <TableShell>
          <thead>
            <tr className="border-b border-line">
              <Th>Tier Name</Th>
              <Th>Price (USD)</Th>
              <Th>User Limit</Th>
              <Th>API Requests / Mo</Th>
              <Th>Priority Support</Th>
              <Th className="text-right" />
            </tr>
          </thead>
          <tbody>
            {draft.map((p, i) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <Td>
                  <span className="flex items-center gap-2.5">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: SERIES[i % SERIES.length] }}
                    />
                    <span className="font-semibold text-fg">{p.name}</span>
                  </span>
                </Td>
                <Td>
                  <NumberField
                    value={p.priceUsd}
                    step="0.01"
                    onChange={(v) => patch(p.id, { priceUsd: v ?? 0 })}
                  />
                </Td>
                <Td>
                  <NumberField
                    value={p.userLimit}
                    placeholder="Unlimited"
                    onChange={(v) => patch(p.id, { userLimit: v })}
                  />
                </Td>
                <Td>
                  <NumberField
                    value={p.apiRequestsPerMonth}
                    placeholder="Unlimited"
                    onChange={(v) => patch(p.id, { apiRequestsPerMonth: v })}
                  />
                </Td>
                <Td>
                  <input
                    type="checkbox"
                    checked={p.prioritySupport}
                    onChange={(e) => patch(p.id, { prioritySupport: e.target.checked })}
                    aria-label={`Priority support for ${p.name}`}
                    className="size-4 accent-[hsl(var(--accent))]"
                  />
                </Td>
                <Td className="text-right text-dim">
                  <MoreVertical size={16} />
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </Panel>
  )
}

function NumberField({
  value,
  onChange,
  placeholder,
  step,
}: {
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
  step?: string
}) {
  return (
    <input
      type="number"
      min={0}
      step={step ?? '1'}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className="h-9 w-32 rounded-md border border-line bg-surface-2 px-3 font-mono text-xs tabular text-fg placeholder:text-dim focus:border-accent/50 focus:outline-none"
    />
  )
}
