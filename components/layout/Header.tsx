import type { ReactNode } from 'react'

interface HeaderProps {
  title: string
  description?: ReactNode
  /** Right-aligned controls (segmented filters, primary action). */
  action?: ReactNode
  /** Accent-coloured title, as on the Monitoring screen. */
  accent?: boolean
}

export function Header({ title, description, action, accent }: HeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1
          className={[
            'text-2xl font-semibold tracking-tight',
            accent ? 'text-accent-soft' : 'text-fg',
          ].join(' ')}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="flex flex-wrap items-center gap-3">{action}</div>}
    </div>
  )
}
