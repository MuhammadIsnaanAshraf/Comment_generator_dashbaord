'use client'

import { useState } from 'react'
import { useAdminResource } from '../../hooks/useAdminResource'
import { ResourceState } from '../../components/ui/ResourceState'
import { Header } from '../../components/layout/Header'
import { GhostButton, Panel, PanelHeader, StatTile } from '../../components/ui/primitives'
import { CategoryBars, DailyBars, StackedSplit } from '../../components/charts/Charts'
import { fmtCount, fmtPercent } from '../../lib/format'
import type { AnalyticsResponse } from '../../types'

const RANGES = [7, 30, 90] as const

export default function AnalyticsPage() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30)
  const { data, status, error, notConfigured, reload } = useAdminResource<AnalyticsResponse>(
    `/api/analytics?days=${days}`
  )

  return (
    <div>
      <Header
        title="Analytics"
        description="Generation volume, prompt-category mix, and how often generated comments are actually used."
        action={
          <div className="flex rounded-lg border border-line bg-surface p-1">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDays(r)}
                className={[
                  'rounded-md px-4 py-1.5 font-mono text-xs transition-colors',
                  days === r ? 'bg-surface-2 text-fg' : 'text-muted-foreground hover:text-fg',
                ].join(' ')}
              >
                {r}d
              </button>
            ))}
          </div>
        }
      />

      <ResourceState
        status={status}
        error={error}
        notConfigured={notConfigured}
        onRetry={reload}
      >
        {data && <Charts data={data} />}
      </ResourceState>
    </div>
  )
}

function Charts({ data }: { data: AnalyticsResponse }) {
  const used = data.outcomes.find((o) => o.key === 'used')?.count ?? 0
  const edited = data.outcomes.find((o) => o.key === 'edited')?.count ?? 0
  const adoption = data.total ? (used + edited) / data.total : null
  const peakDay = data.perDay.reduce(
    (best, d) => (d.count > best.count ? d : best),
    { date: '—', count: 0 }
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={`Generations (${data.windowDays}d)`}
          value={fmtCount(data.total)}
          tone="accent"
          caption={`Peak day ${peakDay.date} · ${peakDay.count}`}
        />
        <StatTile
          label="Adoption"
          value={fmtPercent(adoption)}
          tone="mint"
          caption="Used or edited into a real comment"
        />
        <StatTile
          label="Daily Average"
          value={
            data.perDay.length
              ? (data.total / data.perDay.length).toFixed(1)
              : '—'
          }
          tone="cyan"
          caption={`Across ${data.perDay.length} days`}
        />
        <StatTile
          label="BMC Context Used"
          value={fmtPercent(data.total ? data.bmcUsed / data.total : null)}
          tone={data.total && data.bmcUsed / data.total > 0.5 ? 'warn' : 'neutral'}
          caption={`${data.bmcUsed} of ${data.total} generations`}
        />
      </div>

      <Panel>
        <PanelHeader
          title="Generations per day"
          action={
            <span className="font-mono text-2xs text-dim">
              last {data.windowDays} days · single series
            </span>
          }
        />
        <div className="px-5 pb-6">
          <DailyBars data={data.perDay} />
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel>
          <PanelHeader title="Post categories" />
          <div className="px-5 pb-6">
            <CategoryBars data={data.categories} colorful />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Comment outcomes" />
          <div className="px-5 pb-6">
            <StackedSplit data={data.outcomes} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Stances generated" />
          <div className="px-5 pb-6">
            <CategoryBars data={data.stances.slice(0, 8)} />
          </div>
        </Panel>
      </div>

      {data.windowTruncated && (
        <p className="font-mono text-2xs text-dim">
          Window hit the 3,000-row cap — charts cover the most recent 3,000 generations, not the
          full {data.windowDays}-day period.
        </p>
      )}
    </div>
  )
}
