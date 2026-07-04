import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '../components/layout/Sidebar'

export const metadata: Metadata = {
  title: 'LCA Dashboard — LinkedIn AI Comment Assistant',
  description: 'Track and manage your AI-generated LinkedIn comments',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[hsl(var(--background))]">
        <Sidebar />
        <main
          className="min-h-screen"
          style={{ marginLeft: 240, padding: '32px 40px' }}
        >
          {children}
        </main>
      </body>
    </html>
  )
}
