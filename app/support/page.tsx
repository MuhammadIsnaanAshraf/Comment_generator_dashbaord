'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useAdminResource } from '../../hooks/useAdminResource'
import { ResourceState } from '../../components/ui/ResourceState'
import { Header } from '../../components/layout/Header'
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
import { fmtAgo, fmtCount, initials } from '../../lib/format'
import type { AdminUser } from '../../types'

interface UsersResponse {
  users: AdminUser[]
  total: number
  activityWindowDays: number
}

type Severity = 'high' | 'medium' | 'low'

interface Ticket {
  id: string
  user: AdminUser
  reason: string
  detail: string
  severity: Severity
}

const SEVERITY_TONE: Record<Severity, Tone> = {
  high: 'danger',
  medium: 'warn',
  low: 'neutral',
}

const STALE_DAYS = 14

/**
 * There is no ticketing system in this project. The queue below is derived
 * entirely from account state — the accounts an operator would actually need to
 * chase — rather than from support tickets that don't exist.
 */
export default function SupportPage() {
  const { data, status, error, notConfigured, reload } =
    useAdminResource<UsersResponse>('/api/users')

  return (
    <div>
      <Header
        title="Support Queue"
        description="Accounts needing operator attention, derived from signup and generation state. This project has no ticketing system — nothing here is a submitted ticket."
      />

      <ResourceState
        status={status}
        error={error}
        notConfigured={notConfigured}
        onRetry={reload}
      >
        {data && <Queue data={data} />}
      </ResourceState>
    </div>
  )
}

function Queue({ data }: { data: UsersResponse }) {
  const tickets = useMemo(() => buildQueue(data.users), [data.users])

  const counts = {
    high: tickets.filter((t) => t.severity === 'high').length,
    medium: tickets.filter((t) => t.severity === 'medium').length,
    low: tickets.filter((t) => t.severity === 'low').length,
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Open Items"
          value={fmtCount(tickets.length)}
          tone={tickets.length ? 'accent' : 'mint'}
          caption={`Across ${data.total} account${data.total === 1 ? '' : 's'}`}
        />
        <StatTile
          label="High"
          value={fmtCount(counts.high)}
          tone={counts.high ? 'danger' : 'neutral'}
          chip={counts.high ? 'ACTION' : 'CLEAR'}
          chipTone={counts.high ? 'danger' : 'success'}
          caption="Blocked from using the product"
        />
        <StatTile
          label="Medium"
          value={fmtCount(counts.medium)}
          tone={counts.medium ? 'warn' : 'neutral'}
          caption="Onboarding stalled"
        />
        <StatTile
          label="Low"
          value={fmtCount(counts.low)}
          caption="Worth a nudge, not urgent"
        />
      </div>

      <Panel className="overflow-hidden">
        <PanelHeader
          title="Queue"
          action={
            <span className="font-mono text-2xs text-dim">
              activity window: {data.activityWindowDays}d
            </span>
          }
        />
        {tickets.length === 0 ? (
          <EmptyState
            title="Nothing needs attention."
            hint="Every account is confirmed and generating."
          />
        ) : (
          <TableShell>
            <thead>
              <tr className="border-b border-line">
                <Th>Account</Th>
                <Th>Issue</Th>
                <Th>Detail</Th>
                <Th>Signed Up</Th>
                <Th className="text-right">Severity</Th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-line last:border-0 hover:bg-surface-2/50"
                >
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-accent/12 font-mono text-2xs font-semibold text-accent-soft">
                        {initials(t.user.name, t.user.email)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-fg">
                          {t.user.name ?? t.user.email?.split('@')[0] ?? 'Unknown'}
                        </p>
                        <Link
                          href={`/monitoring?userId=${t.user.id}`}
                          className="truncate font-mono text-2xs text-dim hover:text-accent-soft"
                        >
                          {t.user.email ?? t.user.id}
                        </Link>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-sm text-fg">{t.reason}</Td>
                  <Td className="text-xs text-muted-foreground">{t.detail}</Td>
                  <Td className="font-mono text-xs text-muted-foreground">
                    {fmtAgo(t.user.createdAt)}
                  </Td>
                  <Td className="text-right">
                    <Badge tone={SEVERITY_TONE[t.severity]}>{t.severity}</Badge>
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

function buildQueue(users: AdminUser[]): Ticket[] {
  const now = Date.now()
  const tickets: Ticket[] = []

  for (const u of users) {
    const ageDays = (now - +new Date(u.createdAt)) / 86_400_000

    if (!u.confirmed) {
      tickets.push({
        id: `${u.id}-unconfirmed`,
        user: u,
        reason: 'Email never confirmed',
        detail: 'Cannot sign in until the confirmation link is used.',
        severity: ageDays > 3 ? 'high' : 'medium',
      })
      continue
    }

    if (!u.lastSignInAt) {
      tickets.push({
        id: `${u.id}-never-signed-in`,
        user: u,
        reason: 'Never signed in',
        detail: 'Account confirmed but the user has not logged in once.',
        severity: 'medium',
      })
      continue
    }

    if (u.generations === 0 && ageDays > 1) {
      tickets.push({
        id: `${u.id}-no-generations`,
        user: u,
        reason: 'No generations',
        detail: 'Signed in but never produced a comment — likely an extension setup problem.',
        severity: ageDays > STALE_DAYS ? 'medium' : 'low',
      })
      continue
    }

    if (u.generations > 0 && u.used === 0) {
      tickets.push({
        id: `${u.id}-nothing-used`,
        user: u,
        reason: 'Generates but never posts',
        detail: `${u.generations} generations, none used or edited into a comment.`,
        severity: 'low',
      })
    }
  }

  const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 }
  return tickets.sort((a, b) => order[a.severity] - order[b.severity])
}
