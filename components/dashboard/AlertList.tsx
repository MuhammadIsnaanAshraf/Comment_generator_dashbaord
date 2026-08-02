import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { format } from 'date-fns'
import type { SystemAlert } from '../../types'

const STYLES = {
  critical: {
    wrap: 'border-danger/40 bg-danger/[0.07]',
    icon: 'bg-danger/15 text-danger',
    title: 'text-danger',
    Icon: AlertCircle,
  },
  warning: {
    wrap: 'border-line bg-surface-2/60',
    icon: 'bg-warn/15 text-warn',
    title: 'text-warn',
    Icon: AlertTriangle,
  },
  info: {
    wrap: 'border-line bg-surface-2/60',
    icon: 'bg-mint/15 text-mint',
    title: 'text-mint',
    Icon: Info,
  },
} as const

export function AlertList({ alerts }: { alerts: SystemAlert[] }) {
  return (
    <div className="space-y-3">
      {alerts.map((a) => {
        const s = STYLES[a.severity]
        return (
          <div
            key={a.id}
            className={`flex gap-3.5 rounded-lg border px-4 py-3.5 ${s.wrap}`}
          >
            <span className={`grid size-8 shrink-0 place-items-center rounded-md ${s.icon}`}>
              <s.Icon size={16} strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className={`font-mono text-sm font-medium ${s.title}`}>{a.title}</p>
                {a.timestamp && (
                  <span className="shrink-0 font-mono text-2xs tabular text-dim">
                    {format(new Date(a.timestamp), 'HH:mm:ss')}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.detail}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
