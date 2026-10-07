import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { roleLabel, visibleNav } from '../nav'

export function DashboardLayout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const sections = visibleNav(user?.role, user?.permissions)

  return (
    <div className="shell">
      <button
        type="button"
        className="nav-toggle"
        aria-label="Open menu"
        onClick={() => setOpen((value) => !value)}
      >
        Menu
      </button>
      {open ? (
        <button
          type="button"
          className="nav-backdrop"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside className={open ? 'sidebar open' : 'sidebar'}>
        <div className="brand">
          <span className="brand-mark">BP</span>
          <div>
            <strong>BusPay</strong>
            <p>Control Center</p>
          </div>
        </div>

        <nav className="nav">
          {sections.map((section) => (
            <div key={section.label || 'home'} className="nav-section">
              {section.label ? <p className="nav-label">{section.label}</p> : null}
              {section.items.map((item) => (
                <NavLink
                  key={`${section.label}-${item.label}`}
                  to={item.to}
                  end={Boolean(item.end)}
                  className={({ isActive }) =>
                    isActive ? 'nav-link active' : 'nav-link'
                  }
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="user-chip">
            <span>
              {user?.firstName} {user?.lastName}
            </span>
            <small>{roleLabel(user?.role)}</small>
            <small>{user?.email}</small>
          </div>
          <NavLink to="/profile" className="nav-link" onClick={() => setOpen(false)}>
            My Profile
          </NavLink>
          <button type="button" className="btn ghost" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
