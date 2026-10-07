import { useMemo, useState } from 'react'
import { apiRequest, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { DataTable } from '../components/DataTable'
import { UserAvatar } from '../components/UserAvatar'
import { MoneyInput } from '../components/MoneyInput'
import { PageHeader } from '../components/PageHeader'
import { canAccess } from '../nav'
import { CreateWakalaPage } from './CreateWakalaPage'
import { formatDate, formatMoneyInput, parseMoneyInput, qs, useApiResource } from '../lib/hooks'

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
  floatBalance?: number | null
  hasProfilePhoto?: boolean
  profilePhotoUpdatedAt?: string | null
}

type FloatTx = {
  id: string
  type: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  reference: string
  reason: string | null
  createdAt: string
}

type FloatHistory = {
  total: number
  transactions: FloatTx[]
}

function tzs(amount: number) {
  return `TZS ${formatMoneyInput(String(Math.round(amount)))}`
}

const floatLabels: Record<string, string> = {
  FLOAT_FUNDING: 'Float Funding',
  PASSENGER_TOPUP: 'Top-up',
  CONDUCTOR_WITHDRAWAL: 'Conductor Withdrawal',
  ADJUSTMENT: 'Adjustment',
}

type UsersResponse = {
  page: number
  limit: number
  total: number
  users: UserRow[]
}

export function WakalaPage() {
  const { user } = useAuth()
  const canCreate = canAccess(user?.role, user?.permissions, ['WAKALA_CREATE'])
  const [tab, setTab] = useState<'list' | 'register'>('list')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [selected, setSelected] = useState<UserRow | null>(null)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [reference, setReference] = useState('')
  const [funding, setFunding] = useState(false)
  const [fundMessage, setFundMessage] = useState<string | null>(null)

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
  const historyPath = selected
    ? `/admin/wakala/${selected.id}/float/transactions${qs({ limit: 20 })}`
    : null
  const history = useApiResource<FloatHistory>(historyPath, [selected?.id])

  async function fundFloat() {
    if (!selected) return
    const value = parseMoneyInput(amount)
    if (!Number.isInteger(value) || value < 1) {
      setActionError('Enter a whole amount greater than 0')
      return
    }
    setFunding(true)
    setActionError(null)
    setFundMessage(null)
    try {
      const result = await apiRequest<{
        balanceAfter: number
        reference: string
      }>(`/admin/wakala/${selected.id}/float/fund`, {
        method: 'POST',
        body: JSON.stringify({
          amount: value,
          reason: reason.trim() || undefined,
          reference: reference.trim() || undefined,
        }),
      })
      setFundMessage(
        `Funded ${tzs(value)}. Balance ${tzs(result.balanceAfter)}. ${result.reference}`,
      )
      setAmount('')
      setReason('')
      setReference('')
      reload()
      history.reload()
    } catch (err) {
      setActionError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Funding failed',
      )
    } finally {
      setFunding(false)
    }
  }

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

  if (canCreate && tab === 'register') {
    return (
      <div className="page">
        <PageHeader
          title="Wakala"
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
        actions={
          <div className="tabs">
            <button type="button" className="tab active">
              List
            </button>
            {canCreate ? (
              <button
                type="button"
                className="tab"
                onClick={() => setTab('register')}
              >
                Register
              </button>
            ) : null}
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
          '',
          'Username',
          'Name',
          'Phone',
          'Email',
          'Till',
          'Float',
          'Status',
          'Created',
          'Actions',
        ]}
        empty={!loading && (data?.users.length ?? 0) === 0}
      >
        {data?.users.map((u) => (
          <tr key={u.id}>
            <td>
              <UserAvatar
                id={u.id}
                firstName={u.firstName}
                lastName={u.lastName}
                hasPhoto={u.hasProfilePhoto}
                updatedAt={u.profilePhotoUpdatedAt}
              />
            </td>
            <td>
              <code>{u.username}</code>
            </td>
            <td>
              {u.firstName} {u.lastName}
            </td>
            <td>{u.phone}</td>
            <td>{u.email ?? '—'}</td>
            <td>{u.tillNumber ?? '—'}</td>
            <td>{tzs(u.floatBalance ?? 0)}</td>
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
                {user?.role === 'admin' ? (
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => {
                    setSelected(u)
                    setFundMessage(null)
                    setActionError(null)
                  }}
                >
                  Fund Float
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
        ))}
      </DataTable>

      {selected ? (
        <section className="float-panel">
          <h2>
            Fund Float · {selected.firstName} {selected.lastName}
          </h2>
          <p className="muted">
            Current float {tzs(selected.floatBalance ?? 0)}
            {selected.tillNumber ? ` · TILL ${selected.tillNumber}` : ''}
          </p>
          <div className="toolbar">
            <MoneyInput
              placeholder="Amount (TZS)"
              value={amount}
              onChange={setAmount}
            />
            <input
              placeholder="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <input
              placeholder="Reference (optional)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <button
              type="button"
              className="btn primary"
              disabled={funding || !(parseMoneyInput(amount) >= 1)}
              onClick={() => void fundFloat()}
            >
              {funding ? 'Funding…' : 'Confirm'}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
          {fundMessage ? <p className="muted">{fundMessage}</p> : null}
          <h3>Float history</h3>
          {history.loading ? <p className="muted">Loading…</p> : null}
          {history.error ? <p className="error">{history.error}</p> : null}
          <DataTable
            columns={[
              'Type',
              'Amount',
              'Balance before',
              'Balance after',
              'Reference',
              'When',
            ]}
            empty={!history.loading && (history.data?.transactions.length ?? 0) === 0}
          >
            {history.data?.transactions.map((tx) => (
              <tr key={tx.id}>
                <td>{floatLabels[tx.type] ?? tx.type}</td>
                <td>{tzs(tx.amount)}</td>
                <td>{tzs(tx.balanceBefore)}</td>
                <td>{tzs(tx.balanceAfter)}</td>
                <td>
                  <code>{tx.reference}</code>
                </td>
                <td>{formatDate(tx.createdAt)}</td>
              </tr>
            ))}
          </DataTable>
        </section>
      ) : null}

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
