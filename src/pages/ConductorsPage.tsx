import { useMemo, useState, type FormEvent } from 'react'
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
  nida: string
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

type TerminalRow = {
  id: string
  terminalCode: string
  type: string
  status: string
  merchant: { merchantCode: string; name: string } | null
  conductor: {
    id: string
    username: string
    firstName: string
    lastName: string
  } | null
}

type TerminalsResponse = {
  page: number
  limit: number
  total: number
  terminals: TerminalRow[]
}

type CreateForm = {
  firstName: string
  lastName: string
  phone: string
  nida: string
  pin: string
}

const emptyForm: CreateForm = {
  firstName: '',
  lastName: '',
  phone: '',
  nida: '',
  pin: '',
}

export function ConductorsPage() {
  const [tab, setTab] = useState<'list' | 'register' | 'terminals'>('list')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [termPage, setTermPage] = useState(1)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [form, setForm] = useState<CreateForm>(emptyForm)
  const [formLoading, setFormLoading] = useState(false)
  const [assignId, setAssignId] = useState<string | null>(null)

  const listPath = useMemo(
    () =>
      tab === 'list'
        ? `/admin/users${qs({ role: 'CONDUCTOR', q, status, page, limit: 50 })}`
        : null,
    [tab, q, status, page],
  )
  const terminalsPath = useMemo(
    () =>
      tab === 'terminals'
        ? `/admin/terminals${qs({ page: termPage, limit: 50 })}`
        : null,
    [tab, termPage],
  )

  const { data, error, loading, reload } = useApiResource<UsersResponse>(
    listPath,
    [tab],
  )
  const {
    data: termData,
    error: termError,
    loading: termLoading,
    reload: reloadTerms,
  } = useApiResource<TerminalsResponse>(terminalsPath, [tab])

  const conductorsPath = useMemo(
    () =>
      tab === 'terminals'
        ? `/admin/users${qs({ role: 'CONDUCTOR', status: 'ACTIVE', limit: 100 })}`
        : null,
    [tab],
  )
  const { data: conductorsData } = useApiResource<UsersResponse>(
    conductorsPath,
    [tab],
  )

  async function setUserStatus(id: string, next: string) {
    setBusyId(id)
    setActionError(null)
    setActionSuccess(null)
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

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    setFormLoading(true)
    setActionError(null)
    setActionSuccess(null)
    try {
      const created = await apiRequest<{ message: string; username: string }>(
        '/admin/conductors',
        {
          method: 'POST',
          body: JSON.stringify({
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            phone: form.phone.trim(),
            nida: form.nida.trim(),
            pin: form.pin.trim(),
          }),
        },
      )
      setActionSuccess(`${created.message}: ${created.username}`)
      setForm(emptyForm)
    } catch (err) {
      setActionError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not create conductor',
      )
    } finally {
      setFormLoading(false)
    }
  }

  async function assignTerminal(terminalId: string, conductorUserId: string) {
    if (!conductorUserId) return
    setAssignId(terminalId)
    setActionError(null)
    setActionSuccess(null)
    try {
      await apiRequest(`/admin/terminals/${terminalId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ conductorUserId }),
      })
      setActionSuccess('Terminal assigned')
      reloadTerms()
    } catch (err) {
      setActionError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Assign failed',
      )
    } finally {
      setAssignId(null)
    }
  }

  const tabs = (
    <div className="tabs">
      <button
        type="button"
        className={`tab${tab === 'list' ? ' active' : ''}`}
        onClick={() => setTab('list')}
      >
        List
      </button>
      <button
        type="button"
        className={`tab${tab === 'register' ? ' active' : ''}`}
        onClick={() => setTab('register')}
      >
        Register
      </button>
      <button
        type="button"
        className={`tab${tab === 'terminals' ? ' active' : ''}`}
        onClick={() => setTab('terminals')}
      >
        Terminals
      </button>
    </div>
  )

  if (tab === 'register') {
    return (
      <div className="page">
        <PageHeader
          title="Conductors"
          description="Register conductor accounts for field terminals."
          actions={tabs}
        />
        <form className="card-form wide" onSubmit={onCreate}>
          <div className="form-grid">
            <label>
              First name
              <input
                value={form.firstName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, firstName: e.target.value }))
                }
                required
              />
            </label>
            <label>
              Last name
              <input
                value={form.lastName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lastName: e.target.value }))
                }
                required
              />
            </label>
            <label>
              Phone
              <input
                placeholder="+2557XXXXXXXX"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                required
              />
            </label>
            <label>
              NIDA
              <input
                value={form.nida}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nida: e.target.value }))
                }
                required
                minLength={20}
                maxLength={20}
              />
            </label>
            <label>
              PIN (4 digits)
              <input
                type="password"
                inputMode="numeric"
                value={form.pin}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pin: e.target.value }))
                }
                required
                minLength={4}
                maxLength={4}
                pattern="\d{4}"
              />
            </label>
          </div>
          {actionError ? <p className="error">{actionError}</p> : null}
          {actionSuccess ? <p className="success">{actionSuccess}</p> : null}
          <button className="btn primary" type="submit" disabled={formLoading}>
            {formLoading ? 'Creating…' : 'Create conductor'}
          </button>
        </form>
      </div>
    )
  }

  if (tab === 'terminals') {
    return (
      <div className="page">
        <PageHeader
          title="Conductors"
          description="Assign terminals to active conductors."
          actions={tabs}
        />
        {termLoading ? <p className="muted">Loading…</p> : null}
        {termError ? <p className="error">{termError}</p> : null}
        {actionError ? <p className="error">{actionError}</p> : null}
        {actionSuccess ? <p className="success">{actionSuccess}</p> : null}

        <DataTable
          columns={[
            'Code',
            'Type',
            'Merchant',
            'Status',
            'Conductor',
            'Assign',
          ]}
          empty={!termLoading && (termData?.terminals.length ?? 0) === 0}
        >
          {termData?.terminals.map((t) => (
            <tr key={t.id}>
              <td>
                <code>{t.terminalCode}</code>
              </td>
              <td>{t.type}</td>
              <td>
                {t.merchant
                  ? `${t.merchant.name} (${t.merchant.merchantCode})`
                  : '—'}
              </td>
              <td>
                <span
                  className={`badge ${t.status === 'ACTIVE' ? 'ok' : 'warn'}`}
                >
                  {t.status}
                </span>
              </td>
              <td>
                {t.conductor
                  ? `${t.conductor.firstName} ${t.conductor.lastName}`
                  : '—'}
              </td>
              <td>
                <div className="row-actions">
                  <select
                    defaultValue=""
                    disabled={assignId === t.id}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value) assignTerminal(t.id, value)
                      e.target.value = ''
                    }}
                  >
                    <option value="">Assign…</option>
                    {conductorsData?.users.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName} ({c.username})
                      </option>
                    ))}
                  </select>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>

        {termData ? (
          <div className="pagination">
            <button
              type="button"
              className="btn ghost sm"
              disabled={termPage <= 1}
              onClick={() => setTermPage((p) => p - 1)}
            >
              Prev
            </button>
            <span className="muted">
              Page {termData.page} · {termData.total} total
            </span>
            <button
              type="button"
              className="btn ghost sm"
              disabled={termData.page * termData.limit >= termData.total}
              onClick={() => setTermPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        title="Conductors"
        description="Search conductors and suspend or reactivate accounts."
        actions={tabs}
      />

      <div className="toolbar">
        <input
          placeholder="Search name, phone, username…"
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
          'NIDA',
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
            <td>{u.nida}</td>
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
