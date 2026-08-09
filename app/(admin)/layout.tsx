import { redirect } from 'next/navigation'
import { Sidebar, SIDEBAR_WIDTH } from '../../components/layout/Sidebar'
import { Topbar } from '../../components/layout/Topbar'
import { getAdminUser } from '../../lib/require-admin'
import { LOGIN_PATH } from '../../lib/auth-config'

/**
 * Every console page renders through here, so this is a third admin check
 * (after the middleware and each route handler's own `requireAdmin`). It also
 * supplies the operator identity the shell displays — resolving it here means
 * one verification per navigation rather than one per component.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser()
  if (!user) redirect(`${LOGIN_PATH}?reason=signin`)

  const identity = {
    email: user.email ?? null,
    role: typeof user.app_metadata?.role === 'string' ? user.app_metadata.role : 'admin',
  }

  return (
    <>
      <Sidebar user={identity} />
      <Topbar user={identity} />
      <main
        className="min-h-screen"
        style={{ marginLeft: SIDEBAR_WIDTH, padding: '106px 32px 48px' }}
      >
        {children}
      </main>
    </>
  )
}
