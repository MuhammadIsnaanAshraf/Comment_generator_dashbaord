import type { Metadata } from 'next'
import './globals.css'
import { Sidebar, SIDEBAR_WIDTH } from '../components/layout/Sidebar'
import { Topbar } from '../components/layout/Topbar'

export const metadata: Metadata = {
  title: 'AI Admin — LinkedIn AI Comment Assistant',
  description: 'Operator console for users, generations, and system health',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-ink">
        <Sidebar />
        <Topbar />
        <main
          className="min-h-screen"
          style={{ marginLeft: SIDEBAR_WIDTH, padding: '106px 32px 48px' }}
        >
          {children}
        </main>
      </body>
    </html>
  )
}
