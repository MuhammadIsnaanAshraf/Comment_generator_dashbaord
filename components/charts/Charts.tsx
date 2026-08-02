'use client'

import { useId, useState } from 'react'

/**
 * Chart palette. Validated with the dataviz skill's checker against the card
 * surface (#101018, dark mode): lightness band, chroma floor, adjacent-pair CVD
 * separation, normal-vision floor and contrast all PASS. Tritan separation sits
 * at 6.3 — the warn band — so every categorical mark here is also direct-labeled,
 * which is the required secondary encoding. Do not re-order or substitute hues
 * without re-running the validator.
 */
export const SERIES = ['#8b5cf6', '#0d9488', '#d97706', '#ec4899', '#3b82f6'] as const

/** Single-series magnitude uses one hue, not the categorical set. */
const SINGLE = '#8b5cf6'

const AXIS = 'hsl(var(--dim-fg))'
const GRID = 'hsl(var(--line))'

/* ------------------------------------------------------- Time-series bars */

export function DailyBars({
  data,
  height = 180,
}: {
  data: Array<{ date: string; count: number }>
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.count))

  if (!data.length) {
    return <p className="py-10 text-center font-mono text-xs text-dim">No data in window.</p>
  }

  // Label roughly six ticks so dates never collide.
  const tickEvery = Math.max(1, Math.round(data.length / 6))

  return (
    <div className="relative">
      <div className="flex items-end gap-[2px]" style={{ height }}>
        {data.map((d, i) => {
          const h = (d.count / max) * 100
          return (
            <div
              key={d.date}
              className="group relative flex-1"
              style={{ height: '100%' }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="flex h-full items-end">
                <div
                  className="w-full rounded-t-[4px] transition-opacity"
                  style={{
                    height: `${Math.max(d.count > 0 ? 2 : 0, h)}%`,
                    background: SINGLE,
                    opacity: hover === null || hover === i ? 1 : 0.45,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-2 h-px w-full" style={{ background: GRID }} />

      <div className="mt-2 flex gap-[2px]">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center">
            {i % tickEvery === 0 && (
              <span className="font-mono text-[9px] tabular" style={{ color: AXIS }}>
                {d.date.slice(5)}
              </span>
            )}
          </div>
        ))}
      </div>

      {hover !== null && (
        <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full rounded-md border border-line bg-surface-2 px-3 py-1.5 font-mono text-2xs text-fg shadow-lg">
          {data[hover].date} · <span className="text-accent-soft">{data[hover].count}</span>{' '}
          generation{data[hover].count === 1 ? '' : 's'}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------ Categorical bars */

export function CategoryBars({
  data,
  colorful,
}: {
  data: Array<{ key: string; count: number }>
  /** Use the categorical palette (identity). Otherwise a single hue (magnitude). */
  colorful?: boolean
}) {
  const max = Math.max(1, ...data.map((d) => d.count))
  const total = data.reduce((sum, d) => sum + d.count, 0)

  if (!data.length) {
    return <p className="py-10 text-center font-mono text-xs text-dim">No data in window.</p>
  }

  return (
    <ul className="space-y-3.5">
      {data.map((d, i) => (
        <li key={d.key}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              {colorful && (
                <span
                  className="size-2 shrink-0 rounded-[2px]"
                  style={{ background: SERIES[i % SERIES.length] }}
                />
              )}
              <span className="truncate font-mono text-xs text-fg">{d.key}</span>
            </span>
            {/* Direct label — the secondary encoding the palette's tritan
                separation requires, and it saves an axis. */}
            <span className="shrink-0 font-mono text-xs tabular text-muted-foreground">
              {d.count}
              <span className="ml-2 text-dim">
                {total ? `${Math.round((d.count / total) * 100)}%` : ''}
              </span>
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(d.count / max) * 100}%`,
                background: colorful ? SERIES[i % SERIES.length] : SINGLE,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/* --------------------------------------------------------- Stacked split */

export function StackedSplit({
  data,
}: {
  data: Array<{ key: string; count: number }>
}) {
  const id = useId()
  const total = data.reduce((sum, d) => sum + d.count, 0)

  if (!total) {
    return <p className="py-10 text-center font-mono text-xs text-dim">No data in window.</p>
  }

  return (
    <div>
      {/* 2px surface gaps between segments, per the mark spec. */}
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
        {data.map((d, i) => (
          <div
            key={`${id}-${d.key}`}
            title={`${d.key}: ${d.count}`}
            style={{
              width: `${(d.count / total) * 100}%`,
              background: SERIES[i % SERIES.length],
            }}
          />
        ))}
      </div>

      {/* Legend — always present for ≥2 series, with values direct-labeled. */}
      <ul className="mt-4 space-y-2">
        {data.map((d, i) => (
          <li key={d.key} className="flex items-center gap-2.5">
            <span
              className="size-2 shrink-0 rounded-[2px]"
              style={{ background: SERIES[i % SERIES.length] }}
            />
            <span className="font-mono text-xs capitalize text-fg">{d.key}</span>
            <span className="ml-auto font-mono text-xs tabular text-muted-foreground">
              {d.count}
              <span className="ml-2 text-dim">{Math.round((d.count / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
