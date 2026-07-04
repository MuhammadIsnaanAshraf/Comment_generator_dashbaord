'use client'

import { Header } from '../../components/layout/Header'

export default function SettingsPage() {
  return (
    <div>
      <Header
        title="Settings"
        description="Extension settings are managed via the Chrome popup."
      />
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg px-5 py-6 max-w-lg">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Click the extension icon in your Chrome toolbar to:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-[hsl(var(--foreground))] list-disc list-inside">
          <li>Add or remove Groq API keys</li>
          <li>Toggle the extension on/off</li>
          <li>Change comment tone (Auto / Professional / Conversational)</li>
          <li>Sync data to this dashboard</li>
        </ul>
      </div>
    </div>
  )
}
