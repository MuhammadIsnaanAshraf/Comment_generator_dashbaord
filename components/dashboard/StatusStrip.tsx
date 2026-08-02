import type { ServiceStatus } from '../../types'
import { StatusDot, type Tone } from '../ui/primitives'

const STATE_TONE: Record<ServiceStatus['state'], Tone> = {
  ok: 'success',
  degraded: 'warn',
  down: 'danger',
  unknown: 'neutral',
}

const STATE_LABEL: Record<ServiceStatus['state'], string> = {
  ok: 'OK',
  degraded: 'DEGRADED',
  down: 'DOWN',
  unknown: 'UNKNOWN',
}

const DETAIL_CLASS: Record<ServiceStatus['state'], string> = {
  ok: 'text-mint',
  degraded: 'text-warn',
  down: 'text-danger',
  unknown: 'text-dim',
}

export function StatusStrip({ services }: { services: ServiceStatus[] }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-lg border border-line bg-surface px-6 py-4">
      {services.map((s) => (
        <div key={s.id} className="flex items-center gap-2.5 font-mono text-xs">
          <StatusDot tone={STATE_TONE[s.state]} pulse={s.state === 'ok'} />
          <span className="uppercase tracking-[0.06em] text-fg">{s.label}</span>
          <span className={DETAIL_CLASS[s.state]}>{s.detail || STATE_LABEL[s.state]}</span>
        </div>
      ))}
    </div>
  )
}
