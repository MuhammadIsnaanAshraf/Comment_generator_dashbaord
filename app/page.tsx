'use client'

import Link from 'next/link'
import { useAdminResource } from '../hooks/useAdminResource'
import { ResourceState } from '../components/ui/ResourceState'
import { StatusStrip } from '../components/dashboard/StatusStrip'
import { AlertList } from '../components/dashboard/AlertList'
import {
  Badge,
  EmptyState,
  Panel,
  PanelHeader,
  StatTile,
  StatusDot,
  Td,
  Th,
  TableShell,
} from '../components/ui/primitives'
import { fmtAgo, fmtCount, fmtPercent, initials } from '../lib/format'
import type { OverviewResponse } from '../types'

export default function DashboardPage() {
  const { data, status, error, notConfigured, reload } =
    useAdminResource<OverviewResponse>('/api/overview')

  return (
    <ResourceState status={status} error={error} notConfigured={notConfigured} onRetry={reload}>
      {data && <Overview data={data} />}
    </ResourceState>
  )
}

function Overview({ data }: { data: OverviewResponse }) {
  const criticalCount = data.alerts.filter((a) => a.severity === 'critical').length
  const engageRate =
    data.activeUsers30d > 0 ? data.activeUsers7d / data.activeUsers30d : null

  return (
    <div>
      <StatusStrip services={data.services} />

      {/* Headline metrics */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile
          label="Total Users"
          value={fmtCount(data.totalUsers)}
          chip={data.newUsers7d > 0 ? `+${data.newUsers7d}` : '0'}
          chipTone={data.newUsers7d > 0 ? 'success' : 'neutral'}
          progress={data.totalUsers > 0 ? data.activeUsers30d / data.totalUsers : 0}
          caption={`${data.activeUsers30d} active in 30d`}
        />
        <StatTile
          label="Active Users"
          value={fmtCount(data.activeUsers7d)}
          chip="7D / 30D"
          caption={
            <>
              <span className="text-cyan">Engage rate {fmtPercent(engageRate)}</span> ·{' '}
              {data.activeUsers30d} / 30d
            </>
          }
        />
        <StatTile
          label="Generations"
          value={fmtCount(data.generationsToday)}
          chip="TODAY"
          chipTone="accent"
          caption={`${fmtCount(data.generationsTotal)} all time`}
        />
        <StatTile
          label="Used Rate"
          value={fmtPercent(data.usedRate)}
          tone="mint"
          chip="30D"
          chipTone="mint"
          highlight
          caption="Comments used or edited into a post"
        />
        <StatTile
          label="Like Rate"
          value={fmtPercent(data.likeRate)}
          tone={data.likeRate != null && data.likeRate < 0.5 ? 'danger' : 'neutral'}
          chip="30D"
          caption="Of generations that received feedback"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* Recent signups */}
        <section>
          <PanelHeader
            title="Recent Signups"
            action={
              <Link
                href="/users"
                className="font-mono text-xs text-accent-soft transition-opacity hover:opacity-75"
              >
                View All Users
              </Link>
            }
            className="px-0 pt-0"
          />
          <Panel className="overflow-hidden">
            {data.recentSignups.length === 0 ? (
              <EmptyState title="No users have signed up yet." />
            ) : (
              <TableShell>
                <thead>
                  <tr className="border-b border-line">
                    <Th>User</Th>
                    <Th>Activity</Th>
                    <Th>Signed Up</Th>
                    <Th className="text-right">Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSignups.map((u) => (
                    <tr key={u.id} className="border-b border-line last:border-0">
                      <Td>
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-accent/12 font-mono text-2xs font-semibold text-accent-soft">
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
                        <Badge tone={u.generations > 0 ? 'accent' : 'neutral'}>
                          {u.generations} gen
                        </Badge>
                      </Td>
                      <Td className="font-mono text-xs text-muted-foreground">
                        {fmtAgo(u.createdAt)}
                      </Td>
                      <Td className="text-right">
                        <span className="inline-flex items-center gap-2 font-mono text-xs">
                          <StatusDot tone={u.confirmed ? 'success' : 'warn'} />
                          <span className={u.confirmed ? 'text-success' : 'text-warn'}>
                            {u.confirmed ? 'Confirmed' : 'Pending'}
                          </span>
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </Panel>
        </section>

        {/* System alerts */}
        <section>
          <PanelHeader
            title="System Alerts"
            action={
              <span className="inline-flex items-center gap-2 font-mono text-xs">
                <StatusDot tone={criticalCount ? 'danger' : 'success'} />
                <span className={criticalCount ? 'text-danger' : 'text-muted-foreground'}>
                  {criticalCount} Critical
                </span>
              </span>
            }
            className="px-0 pt-0"
          />
          <AlertList alerts={data.alerts} />

          {data.windowTruncated && (
            <p className="mt-4 font-mono text-2xs text-dim">
              Note: the 30-day window hit the row cap — rates are computed over the most recent
              3,000 generations.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
