import { useState, type FormEvent } from 'react'
import { ApiError, apiRequest } from '../api/client'
import { useAuth } from '../auth/AuthContext'

export function ChangePasswordPage() {
  const { refreshSession } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await apiRequest('/auth/admin/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, password, confirmPassword }),
      })
      setCurrentPassword('')
      setPassword('')
      setConfirmPassword('')
      await refreshSession()
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Could not change the password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-brand">
          <span className="brand-mark large">BP</span>
          <h1>Change your password</h1>
        </div>
        <form className="card-form" onSubmit={onSubmit}>
          <p className="muted">
            For your security, change the temporary password before opening the control center.
          </p>
          <label>
            Current password
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </label>
          <label>
            New password
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={12}
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={12}
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Save password'}
          </button>
        </form>
      </div>
    </div>
  )
}
