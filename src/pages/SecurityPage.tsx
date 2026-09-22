import { useMemo, useState } from 'react'
import { apiRequest, ApiError } from '../api/client'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { formatDate, qs, useApiResource } from '../lib/hooks'

type UserRow = {
  id: string
  username: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  role: string
  status: string
  failedLoginAttempts: number
  lockedUntil: string | null
  createdAt: string
}

type UsersResponse = {
  page: number
  limit: number
  total: number
  users: UserRow[]
}

function isLocked(lockedUntil: string | null) {
  if (!lockedUntil) return false
  return new Date(lockedUntil).getTime() > Date.now()
}

export function SecurityPage() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const path = useMemo(
    () => `/admin/users${qs({ q, page, limit: 50 })}`,
    [q, page],
  )
  const { data, error, loading, reload } =
    useApiResource<UsersResponse>(path)

  async function unlockUser(id: string) {
    setBusyId(id)
    setActionError(null)
    setActionSuccess(null)
    try {
      await apiRequest(`/admin/users/${id}/unlock`, { method: 'POST' })
      setActionSuccess('User unlocked')
      reload()
    } catch (err) {
      setActionError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Unlock failed',
      )
    } finally {
      setBusyId(null)
    }
  }

  async function setUserStatus(id: string, next: string) {
    setBusyId(id)
    setActionError(null)
    setActionSuccess(null)
    try {
      await apiRequest(`/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      })
      setActionSuccess(
        next === 'ACTIVE' ? 'User activated' : 'User suspended',
      )
      reload()
    } catch (err) {
      setActionError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Update failed',
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Security"
        description="All roles: lockouts, failed logins, unlock and suspend."
      />

      <div className="toolbar">
        <input
          placeholder="Search name, phone, username, email…"
          value={q}
          onChange={(e) => {
            setPage(1)
            setQ(e.target.value)
          }}
        />
      </div>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {actionError ? <p className="error">{actionError}</p> : null}
      {actionSuccess ? <p className="success">{actionSuccess}</p> : null}

      <DataTable
        columns={[
          'Username',
          'Name',
          'Role',
          'Status',
          'Failed logins',
          'Locked until',
          'Actions',
        ]}
        empty={!loading && (data?.users.length ?? 0) === 0}
      >
        {data?.users.map((u) => {
          const locked = isLocked(u.lockedUntil)
          return (
            <tr key={u.id}>
              <td>
                <code>{u.username}</code>
              </td>
              <td>
                {u.firstName} {u.lastName}
                <br />
                <span className="muted">{u.phone}</span>
              </td>
              <td>{u.role}</td>
              <td>
                <span
                  className={`badge ${u.status === 'ACTIVE' ? 'ok' : 'warn'}`}
                >
                  {u.status}
                </span>
              </td>
              <td>
                <span
                  className={`badge ${u.failedLoginAttempts > 0 ? 'warn' : 'ok'}`}
                >
                  {u.failedLoginAttempts}
                </span>
              </td>
              <td>
                {u.lockedUntil ? (
                  <span className={`badge ${locked ? 'bad' : 'ok'}`}>
                    {formatDate(u.lockedUntil)}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td>
                <div className="row-actions">
                  {locked || u.failedLoginAttempts > 0 ? (
                    <button
                      type="button"
                      className="btn primary sm"
                      disabled={busyId === u.id}
                      onClick={() => unlockUser(u.id)}
                    >
                      Unlock
                    </button>
                  ) : null}
                  {u.status === 'ACTIVE' ? (
                    <button
                      type="button"
                      className="btn ghost sm"
                      disabled={busyId === u.id}
                      onClick={() => setUserStatus(u.id, 'SUSPENDED')}
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn primary sm"
                      disabled={busyId === u.id}
                      onClick={() => setUserStatus(u.id, 'ACTIVE')}
                    >
                      Activate
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )
        })}
      </DataTable>

      {data ? (
        <div className="pagination">
          <button
            type="button"
            className="btn ghost sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </button>
          <span className="muted">
            Page {data.page} · {data.total} total
          </span>
          <button
            type="button"
            className="btn ghost sm"
            disabled={data.page * data.limit >= data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  )
}
