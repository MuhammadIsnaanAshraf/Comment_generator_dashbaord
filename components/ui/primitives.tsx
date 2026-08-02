import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

/* ------------------------------------------------------------------ Panel */

export function Panel({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('rounded-lg border border-line bg-surface', className)}>{children}</div>
  )
}

export function PanelHeader({
  title,
  action,
  className,
}: {
  title: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between px-5 pb-4 pt-5', className)}>
      <h2 className="text-lg font-semibold tracking-tight text-fg">{title}</h2>
      {action}
    </div>
  )
}

/* -------------------------------------------------------------- Stat tile */

export type Tone = 'accent' | 'mint' | 'cyan' | 'success' | 'warn' | 'danger' | 'neutral'

const TONE_TEXT: Record<Tone, string> = {
  accent: 'text-accent',
  mint: 'text-mint',
  cyan: 'text-cyan',
  success: 'text-success',
  warn: 'text-warn',
  danger: 'text-danger',
  neutral: 'text-fg',
}

const TONE_CHIP: Record<Tone, string> = {
  accent: 'bg-accent/10 text-accent',
  mint: 'bg-mint/10 text-mint',
  cyan: 'bg-cyan/10 text-cyan',
  success: 'bg-success/10 text-success',
  warn: 'bg-warn/10 text-warn',
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-surface-2 text-muted-foreground',
}

const TONE_DOT: Record<Tone, string> = {
  accent: 'bg-accent',
  mint: 'bg-mint',
  cyan: 'bg-cyan',
  success: 'bg-success',
  warn: 'bg-warn',
  danger: 'bg-danger',
  neutral: 'bg-dim',
}

export function StatTile({
  label,
  value,
  caption,
  chip,
  chipTone = 'neutral',
  tone = 'neutral',
  progress,
  highlight,
  icon,
}: {
  label: string
  value: ReactNode
  caption?: ReactNode
  chip?: ReactNode
  chipTone?: Tone
  tone?: Tone
  /** 0–1. Renders the thin underline meter seen on the Total Users tile. */
  progress?: number
  /** Draws the left accent rail used to mark the tile the operator cares about. */
  highlight?: boolean
  icon?: ReactNode
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-line bg-surface px-5 py-4',
        highlight && 'border-accent/40'
      )}
    >
      {highlight && <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" />}

      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="font-mono text-2xs uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        {chip != null && (
          <span
            className={cn(
              'shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-2xs font-medium',
              TONE_CHIP[chipTone]
            )}
          >
            {chip}
          </span>
        )}
        {chip == null && icon}
      </div>

      <p className={cn('font-mono text-3xl font-semibold tabular tracking-tight', TONE_TEXT[tone])}>
        {value}
      </p>

      {progress != null && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
      )}

      {caption && <p className="mt-2 text-xs text-muted-foreground">{caption}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ Badge */

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 font-mono text-2xs font-medium',
        TONE_CHIP[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

export function StatusDot({
  tone = 'neutral',
  pulse,
  className,
}: {
  tone?: Tone
  pulse?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-block size-1.5 shrink-0 rounded-full',
        TONE_DOT[tone],
        pulse && 'animate-pulse-dot',
        className
      )}
    />
  )
}

export function StatusPill({
  tone = 'neutral',
  children,
  pulse,
}: {
  tone?: Tone
  children: ReactNode
  pulse?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs">
      <StatusDot tone={tone} pulse={pulse} />
      <span className={TONE_TEXT[tone]}>{children}</span>
    </span>
  )
}

/* ------------------------------------------------------------------ Table */

export function Th({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left align-bottom font-mono text-2xs font-medium uppercase tracking-[0.06em] text-muted-foreground',
        className
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  return <td className={cn('px-4 py-3 align-middle text-sm', className)}>{children}</td>
}

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">{children}</table>
    </div>
  )
}

/* ------------------------------------------------------------- Meter bar */

export function Meter({
  value,
  max,
  tone,
  label,
}: {
  value: number
  max: number
  /** Omit to derive tone from fill: >85% danger, >65% warn, else accent. */
  tone?: Tone
  label?: string
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const derived: Tone = tone ?? (pct > 85 ? 'danger' : pct > 65 ? 'warn' : 'accent')

  return (
    <div className="min-w-[110px]">
      <div className="mb-1 flex items-baseline justify-between gap-3 font-mono text-2xs tabular">
        <span className="text-muted-foreground">{label ?? `${value}/${max}`}</span>
        <span className={TONE_TEXT[derived]}>{pct}%</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn('h-full rounded-full', TONE_DOT[derived])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ Empty/error */

export function EmptyState({
  title,
  hint,
  tone = 'neutral',
}: {
  title: ReactNode
  hint?: ReactNode
  tone?: Tone
}) {
  return (
    <div className="px-6 py-16 text-center">
      <p className={cn('text-sm', tone === 'danger' ? 'text-danger' : 'text-muted-foreground')}>
        {title}
      </p>
      {hint && <p className="mx-auto mt-2 max-w-md text-xs text-dim">{hint}</p>}
    </div>
  )
}

/**
 * Marks a tile or panel whose metric has no backing data source in this
 * project yet (billing, latency, cost). Rendering the design slot with an
 * explicit "no source" state is deliberate — inventing a number here would be
 * indistinguishable from a real one.
 */
export function NoSource({ what }: { what: string }) {
  return (
    <span
      className="font-mono text-2xs text-dim"
      title={`No data source wired for ${what}`}
    >
      no source
    </span>
  )
}

/* ----------------------------------------------------------------- Button */

export function GhostButton({
  children,
  onClick,
  disabled,
  active,
  className,
  title,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  className?: string
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'rounded-md border px-3 py-1.5 font-mono text-xs transition-colors duration-150 disabled:opacity-50',
        active
          ? 'border-accent/40 bg-accent/10 text-accent'
          : 'border-line bg-surface-2 text-muted-foreground hover:border-line-strong hover:text-fg',
        className
      )}
    >
      {children}
    </button>
  )
}
