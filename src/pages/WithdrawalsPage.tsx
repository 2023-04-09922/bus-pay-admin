import { useMemo, useState } from 'react'
import { apiRequest, ApiError } from '../api/client'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { formatDate, formatTzs, qs, useApiResource } from '../lib/hooks'

type WithdrawalRow = {
  id: string
  reference: string
  amount: number
  status: string
  notes: string | null
  requestedAt: string
  processedAt: string | null
  agent: {
    id: string
    username: string
    firstName: string
    lastName: string
    phone: string
  }
  processedBy: {
    id: string
    username: string
    firstName: string
    lastName: string
  } | null
}

type WithdrawalsResponse = {
  page: number
  limit: number
  total: number
  withdrawals: WithdrawalRow[]
}

function statusBadge(status: string) {
  if (status === 'PAID' || status === 'APPROVED') return 'ok'
  if (status === 'PENDING') return 'warn'
  return 'bad'
}

export function WithdrawalsPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const path = useMemo(
    () => `/admin/withdrawals${qs({ q, status, page, limit: 50 })}`,
    [q, status, page],
  )
  const { data, error, loading, reload } =
    useApiResource<WithdrawalsResponse>(path)

  async function withdrawalAction(
    id: string,
    action: 'approve' | 'reject' | 'paid',
  ) {
    setBusyId(id)
    setActionError(null)
    setActionSuccess(null)
    try {
      await apiRequest(`/admin/withdrawals/${id}/${action}`, {
        method: 'POST',
        ...(action === 'paid'
          ? {}
          : { body: JSON.stringify({}) }),
      })
      setActionSuccess(
        action === 'approve'
          ? 'Withdrawal approved'
          : action === 'reject'
            ? 'Withdrawal rejected'
            : 'Withdrawal marked paid',
      )
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
        title="Withdrawals"
        description="Review agent withdrawal requests and mark payouts."
      />

      <div className="toolbar">
        <input
          placeholder="Search reference, agent…"
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
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="PAID">PAID</option>
          <option value="REJECTED">REJECTED</option>
        </select>
      </div>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {actionError ? <p className="error">{actionError}</p> : null}
      {actionSuccess ? <p className="success">{actionSuccess}</p> : null}

      <DataTable
        columns={[
          'Reference',
          'Amount',
          'Agent',
          'Status',
          'Requested',
          'Processed',
          'Actions',
        ]}
        empty={!loading && (data?.withdrawals.length ?? 0) === 0}
      >
        {data?.withdrawals.map((w) => (
          <tr key={w.id}>
            <td>
              <code>{w.reference}</code>
            </td>
            <td>{formatTzs(w.amount)}</td>
            <td>
              {w.agent.firstName} {w.agent.lastName}
              <br />
              <span className="muted">{w.agent.username}</span>
            </td>
            <td>
              <span className={`badge ${statusBadge(w.status)}`}>
                {w.status}
              </span>
            </td>
            <td>{formatDate(w.requestedAt)}</td>
            <td>{w.processedAt ? formatDate(w.processedAt) : '—'}</td>
            <td>
              <div className="row-actions">
                {w.status === 'PENDING' ? (
                  <>
                    <button
                      type="button"
                      className="btn primary sm"
                      disabled={busyId === w.id}
                      onClick={() => withdrawalAction(w.id, 'approve')}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn ghost sm"
                      disabled={busyId === w.id}
                      onClick={() => withdrawalAction(w.id, 'reject')}
                    >
                      Reject
                    </button>
                  </>
                ) : null}
                {w.status === 'APPROVED' ? (
                  <button
                    type="button"
                    className="btn primary sm"
                    disabled={busyId === w.id}
                    onClick={() => withdrawalAction(w.id, 'paid')}
                  >
                    Mark paid
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
