import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Admin — LinkedIn AI Comment Assistant',
  description: 'Operator console for users, generations, and system health',
}

/**
 * Root layout is deliberately bare: the sidebar/topbar shell lives in
 * `app/(admin)/layout.tsx` so `/login` can render without it.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-ink">{children}</body>
    </html>
  )
}
