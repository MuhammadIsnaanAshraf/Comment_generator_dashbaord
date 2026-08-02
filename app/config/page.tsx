'use client'

import { useAdminResource } from '../../hooks/useAdminResource'
import { ResourceState } from '../../components/ui/ResourceState'
import { Header } from '../../components/layout/Header'
import {
  Badge,
  Panel,
  PanelHeader,
  StatusDot,
  Td,
  Th,
  TableShell,
} from '../../components/ui/primitives'

interface EnvEntry {
  key: string
  set: boolean
  value: string | null
  secret: boolean
  required: boolean
  description: string
}

interface ConfigResponse {
  env: EnvEntry[]
  services: { supabase: boolean; backend: boolean }
  pipeline: Array<{ key: string; value: string; description: string }>
}

export default function ConfigPage() {
  const { data, status, error, notConfigured, reload } =
    useAdminResource<ConfigResponse>('/api/config')

  return (
    <div>
      <Header
        title="Config"
        description="How this console instance is wired, and the generation-pipeline constants it reads against."
      />

      <ResourceState
        status={status}
        error={error}
        notConfigured={notConfigured}
        onRetry={reload}
      >
        {data && (
          <div className="space-y-6">
            <Panel className="overflow-hidden">
              <PanelHeader
                title="Environment"
                action={
                  <span className="font-mono text-2xs text-dim">
                    dashboard/.env.local · secret values are never returned
                  </span>
                }
              />
              <TableShell>
                <thead>
                  <tr className="border-b border-line">
                    <Th>Key</Th>
                    <Th>Status</Th>
                    <Th>Value</Th>
                    <Th>Purpose</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.env.map((e) => (
                    <tr key={e.key} className="border-b border-line last:border-0">
                      <Td className="font-mono text-xs text-fg">{e.key}</Td>
                      <Td>
                        <span className="inline-flex items-center gap-2 font-mono text-xs">
                          <StatusDot
                            tone={e.set ? 'success' : e.required ? 'danger' : 'warn'}
                          />
                          <span
                            className={
                              e.set
                                ? 'text-success'
                                : e.required
                                  ? 'text-danger'
                                  : 'text-warn'
                            }
                          >
                            {e.set ? 'set' : e.required ? 'missing' : 'optional'}
                          </span>
                        </span>
                      </Td>
                      <Td className="max-w-[280px] font-mono text-xs text-muted-foreground">
                        {e.secret ? (
                          <span className="text-dim">••••••••</span>
                        ) : (
                          <span className="block truncate" title={e.value ?? ''}>
                            {e.value ?? '—'}
                          </span>
                        )}
                      </Td>
                      <Td className="text-xs text-muted-foreground">{e.description}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </Panel>

            <Panel className="overflow-hidden">
              <PanelHeader
                title="Generation pipeline"
                action={<Badge>read-only</Badge>}
              />
              <p className="px-5 pb-4 text-xs leading-relaxed text-muted-foreground">
                These constants live in the backend source and are changed by editing it, not
                from this console:{' '}
                <span className="font-mono text-dim">
                  backend/src/services/generation-log.ts
                </span>{' '}
                and{' '}
                <span className="font-mono text-dim">
                  backend/src/services/groq-service.ts
                </span>
                .
              </p>
              <TableShell>
                <thead>
                  <tr className="border-b border-line">
                    <Th>Constant</Th>
                    <Th>Value</Th>
                    <Th>Meaning</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.pipeline.map((p) => (
                    <tr key={p.key} className="border-b border-line last:border-0">
                      <Td className="font-mono text-xs text-fg">{p.key}</Td>
                      <Td className="font-mono text-xs text-accent-soft">{p.value}</Td>
                      <Td className="text-xs text-muted-foreground">{p.description}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </Panel>

            <Panel>
              <PanelHeader title="Extension settings" />
              <div className="px-5 pb-6">
                <p className="text-sm text-muted-foreground">
                  Per-user extension settings are not stored server-side — they live in{' '}
                  <span className="font-mono text-xs text-dim">chrome.storage.local</span> on the
                  user&apos;s machine and are edited from the extension popup:
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  {[
                    'Add or remove Groq API keys',
                    'Toggle the extension on or off',
                    'Change comment tone (Auto / Professional / Conversational)',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <StatusDot tone="accent" className="mt-2" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          </div>
        )}
      </ResourceState>
    </div>
  )
}
