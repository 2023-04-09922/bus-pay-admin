import { useMemo, useState, type FormEvent } from 'react'
import { apiRequest, ApiError } from '../api/client'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { formatDate, formatTzs, qs, useApiResource } from '../lib/hooks'

type RefundRow = {
  id: string
  reference: string
  amount: number
  reason: string | null
  status: string
  createdAt: string
  transaction: {
    id: string
    reference: string
    amount: number
    status: string
  }
  actor: {
    id: string
    username: string
    firstName: string
    lastName: string
  }
}

type RefundsResponse = {
  page: number
  limit: number
  total: number
  refunds: RefundRow[]
}

export function RefundsPage() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [txId, setTxId] = useState('')
  const [reason, setReason] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const path = useMemo(
    () => `/admin/refunds${qs({ q, page, limit: 50 })}`,
    [q, page],
  )
  const { data, error, loading, reload } =
    useApiResource<RefundsResponse>(path)

  async function onReverse(event: FormEvent) {
    event.preventDefault()
    const id = txId.trim()
    if (!id) return
    setFormLoading(true)
    setActionError(null)
    setActionSuccess(null)
    try {
      const result = await apiRequest<{
        message: string
        refund: { reference: string }
      }>(`/admin/transactions/${id}/reverse`, {
        method: 'POST',
        body: JSON.stringify({
          reason: reason.trim() || undefined,
        }),
      })
      setActionSuccess(
        `${result.message}. Refund ${result.refund.reference}`,
      )
      setTxId('')
      setReason('')
      reload()
    } catch (err) {
      setActionError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Reverse failed',
      )
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Refunds"
      />

      <section className="panel" style={{ marginBottom: '1.25rem' }}>
        <h2>Reverse transaction</h2>
        <form className="card-form wide" onSubmit={onReverse}>
          <div className="form-grid">
            <label>
              Transaction ID
              <input
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
                placeholder="UUID"
                required
              />
            </label>
            <label>
              Reason (optional)
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Customer dispute…"
              />
            </label>
          </div>
          <button className="btn primary" type="submit" disabled={formLoading}>
            {formLoading ? 'Reversing…' : 'Reverse'}
          </button>
        </form>
      </section>

      <div className="toolbar">
        <input
          placeholder="Search refund or transaction reference…"
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
          'Refund',
          'Amount',
          'Transaction',
          'Reason',
          'Actor',
          'Status',
          'Created',
        ]}
        empty={!loading && (data?.refunds.length ?? 0) === 0}
      >
        {data?.refunds.map((r) => (
          <tr key={r.id}>
            <td>
              <code>{r.reference}</code>
            </td>
            <td>{formatTzs(r.amount)}</td>
            <td>
              <code>{r.transaction.reference}</code>
              <br />
              <span className="muted">{r.transaction.id}</span>
            </td>
            <td>{r.reason ?? '—'}</td>
            <td>
              {r.actor.firstName} {r.actor.lastName}
              <br />
              <span className="muted">{r.actor.username}</span>
            </td>
            <td>
              <span className="badge ok">{r.status}</span>
            </td>
            <td>{formatDate(r.createdAt)}</td>
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
