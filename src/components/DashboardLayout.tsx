import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/passengers', label: 'Passengers' },
  { to: '/conductors', label: 'Conductors' },
  { to: '/wakala', label: 'Wakala' },
  { to: '/cards', label: 'D-Cards' },
  { to: '/wallets', label: 'Wallets' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/topups', label: 'Top-ups' },
  { to: '/withdrawals', label: 'Withdrawals' },
  { to: '/refunds', label: 'Refunds' },
  { to: '/settlements', label: 'Settlements' },
  { to: '/reports', label: 'Reports' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/audit', label: 'Audit' },
  { to: '/health', label: 'Health' },
  { to: '/security', label: 'Security' },
  { to: '/settings', label: 'Settings' },
] as const

export function DashboardLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">BP</span>
          <div>
            <strong>BusPay</strong>
            <p>Admin Dashboard</p>
          </div>
        </div>

        <nav className="nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="user-chip">
            <span>
              {user?.firstName} {user?.lastName}
            </span>
            <small>{user?.email}</small>
          </div>
          <button type="button" className="btn ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
