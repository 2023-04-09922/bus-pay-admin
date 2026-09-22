import { useMemo, useState } from 'react'
import { apiRequest, ApiError } from '../api/client'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { CreateWakalaPage } from './CreateWakalaPage'
import { formatDate, qs, useApiResource } from '../lib/hooks'

type UserRow = {
  id: string
  username: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  tillNumber: string | null
  role: string
  status: string
  createdAt: string
}

type UsersResponse = {
  page: number
  limit: number
  total: number
  users: UserRow[]
}

export function WakalaPage() {
  const [tab, setTab] = useState<'list' | 'register'>('list')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const path = useMemo(
    () =>
      tab === 'list'
        ? `/admin/users${qs({ role: 'AGENT', q, status, page, limit: 50 })}`
        : null,
    [tab, q, status, page],
  )
  const { data, error, loading, reload } = useApiResource<UsersResponse>(path, [
    tab,
  ])

  async function setUserStatus(id: string, next: string) {
    setBusyId(id)
    setActionError(null)
    try {
      await apiRequest(`/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      })
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

  if (tab === 'register') {
    return (
      <div className="page">
        <PageHeader
          title="Wakala"
          description="Register and manage agent accounts."
          actions={
            <div className="tabs">
              <button
                type="button"
                className="tab"
                onClick={() => setTab('list')}
              >
                List
              </button>
              <button type="button" className="tab active">
                Register
              </button>
            </div>
          }
        />
        <CreateWakalaPage embedded />
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        title="Wakala"
        description="Search agents and suspend or reactivate accounts."
        actions={
          <div className="tabs">
            <button type="button" className="tab active">
              List
            </button>
            <button
              type="button"
              className="tab"
              onClick={() => setTab('register')}
            >
              Register
            </button>
          </div>
        }
      />

      <div className="toolbar">
        <input
          placeholder="Search name, phone, email…"
          value={q}
          onChange={(e) => {
            setPage(1)
            setQ(e.target.value)
          }}
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value)
          }}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </div>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {actionError ? <p className="error">{actionError}</p> : null}

      <DataTable
        columns={[
          'Username',
          'Name',
          'Phone',
          'Email',
          'Till',
          'Status',
          'Created',
          'Actions',
        ]}
        empty={!loading && (data?.users.length ?? 0) === 0}
      >
        {data?.users.map((u) => (
          <tr key={u.id}>
            <td>
              <code>{u.username}</code>
            </td>
            <td>
              {u.firstName} {u.lastName}
            </td>
            <td>{u.phone}</td>
            <td>{u.email ?? '—'}</td>
            <td>{u.tillNumber ?? '—'}</td>
            <td>
              <span
                className={`badge ${u.status === 'ACTIVE' ? 'ok' : 'warn'}`}
              >
                {u.status}
              </span>
            </td>
            <td>{formatDate(u.createdAt)}</td>
            <td>
              <div className="row-actions">
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
        ))}
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
