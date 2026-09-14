import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, GitBranch, Users, BarChart3, Download, LogOut } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/hooks/useAuth'

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/pipeline', label: 'Pipeline', icon: GitBranch },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/analytics', label: 'Course analytics', icon: BarChart3 },
  { to: '/admin/export', label: 'Export', icon: Download },
]

export default function AdminLayout() {
  const { session, loading, signOut } = useAuth()
  const location = useLocation()

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>
  if (!session) return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <aside className="lg:w-60 shrink-0 border-b lg:border-b-0 lg:border-r border-hairline">
        <div className="px-5 py-6">
          <Logo />
        </div>
        <nav className="flex lg:flex-col overflow-x-auto lg:overflow-visible px-2 lg:px-3 pb-3 lg:pb-0 gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-[14px] whitespace-nowrap transition-colors ${
                  isActive ? 'bg-surface text-lime' : 'text-muted hover:text-ink'
                }`
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => signOut()}
          className="hidden lg:flex items-center gap-3 px-3 py-2.5 text-[14px] text-muted hover:text-ink transition-colors mt-4 mx-3"
        >
          <LogOut size={16} /> Sign out
        </button>
      </aside>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
