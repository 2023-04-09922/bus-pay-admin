import { useMemo, useState } from 'react'
import { apiRequest, ApiError } from '../api/client'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { formatDate, formatTzs, qs, useApiResource } from '../lib/hooks'

type WalletRow = {
  id: string
  publicCode: string
  balance: number
  status: string
  createdAt: string
  customer: {
    id: string
    firstName: string
    lastName: string
    phone: string
    status: string
  }
}

type WalletsResponse = {
  page: number
  limit: number
  total: number
  wallets: WalletRow[]
}

function statusBadge(status: string) {
  if (status === 'ACTIVE') return 'ok'
  if (status === 'FROZEN') return 'warn'
  return 'bad'
}

export function WalletsPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const path = useMemo(
    () => `/admin/wallets${qs({ q, status, page, limit: 50 })}`,
    [q, status, page],
  )
  const { data, error, loading, reload } = useApiResource<WalletsResponse>(path)

  async function walletAction(id: string, action: 'freeze' | 'unfreeze') {
    setBusyId(id)
    setActionError(null)
    setActionSuccess(null)
    try {
      await apiRequest(`/admin/wallets/${id}/${action}`, { method: 'POST' })
      setActionSuccess(action === 'freeze' ? 'Wallet frozen' : 'Wallet unfrozen')
      reload()
    } catch (err) {
      setActionError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Action failed',
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Wallets"
        description="Search passenger wallets and freeze or unfreeze them."
      />

      <div className="toolbar">
        <input
          placeholder="Search public code, name, phone…"
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
          <option value="FROZEN">FROZEN</option>
          <option value="CLOSED">CLOSED</option>
        </select>
      </div>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {actionError ? <p className="error">{actionError}</p> : null}
      {actionSuccess ? <p className="success">{actionSuccess}</p> : null}

      <DataTable
        columns={[
          'Code',
          'Passenger',
          'Phone',
          'Balance',
          'Status',
          'Created',
          'Actions',
        ]}
        empty={!loading && (data?.wallets.length ?? 0) === 0}
      >
        {data?.wallets.map((w) => (
          <tr key={w.id}>
            <td>
              <code>{w.publicCode}</code>
            </td>
            <td>
              {w.customer.firstName} {w.customer.lastName}
            </td>
            <td>{w.customer.phone}</td>
            <td>{formatTzs(w.balance)}</td>
            <td>
              <span className={`badge ${statusBadge(w.status)}`}>
                {w.status}
              </span>
            </td>
            <td>{formatDate(w.createdAt)}</td>
            <td>
              <div className="row-actions">
                {w.status === 'ACTIVE' ? (
                  <button
                    type="button"
                    className="btn ghost sm"
                    disabled={busyId === w.id}
                    onClick={() => walletAction(w.id, 'freeze')}
                  >
                    Freeze
                  </button>
                ) : null}
                {w.status === 'FROZEN' ? (
                  <button
                    type="button"
                    className="btn primary sm"
                    disabled={busyId === w.id}
                    onClick={() => walletAction(w.id, 'unfreeze')}
                  >
                    Unfreeze
                  </button>
                ) : null}
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
