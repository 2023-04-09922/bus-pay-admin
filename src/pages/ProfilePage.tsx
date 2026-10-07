import { useAuth } from '../auth/AuthContext'
import { roleLabel } from '../nav'

export function ProfilePage() {
  const { user, logout } = useAuth()
  return (
    <div className="page">
      <h1>My Profile</h1>
      <div className="card">
        <p>
          {user?.firstName} {user?.lastName}
        </p>
        <p>{user?.email}</p>
        <p>{roleLabel(user?.role)}</p>
        <button type="button" className="btn" onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  )
}
