import { useMemo, useState, type FormEvent } from 'react'
import { apiRequest, ApiError } from '../api/client'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { formatDate, formatTzs, qs, useApiResource } from '../lib/hooks'

type SettlementRow = {
  id: string
  reference: string
  periodStart: string
  periodEnd: string
  status: string
  grossAmount: number
  feeAmount: number
  netAmount: number
  createdAt: string
  finalizedAt: string | null
  paidAt: string | null
  lines: Array<{
    id: string
    grossAmount: number
    feeAmount: number
    netAmount: number
    merchant: { merchantCode: string; name: string }
  }>
}

type SettlementsResponse = {
  page: number
  limit: number
  total: number
  settlements: SettlementRow[]
}

function statusBadge(status: string) {
  if (status === 'PAID') return 'ok'
  if (status === 'FINALIZED') return 'warn'
  return ''
}

export function SettlementsPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [feeBps, setFeeBps] = useState('0')
  const [formLoading, setFormLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const path = useMemo(
    () => `/admin/settlements${qs({ status, page, limit: 50 })}`,
    [status, page],
  )
  const { data, error, loading, reload } =
    useApiResource<SettlementsResponse>(path)

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    setFormLoading(true)
    setActionError(null)
    setActionSuccess(null)
    try {
      const created = await apiRequest<{ reference: string }>(
        '/admin/settlements',
        {
          method: 'POST',
          body: JSON.stringify({
            periodStart,
            periodEnd,
            feeBps: Number(feeBps) || 0,
          }),
        },
      )
      setActionSuccess(`Settlement created: ${created.reference}`)
      setPeriodStart('')
      setPeriodEnd('')
      setFeeBps('0')
      reload()
    } catch (err) {
      setActionError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not create settlement',
      )
    } finally {
      setFormLoading(false)
    }
  }

  async function settlementAction(id: string, action: 'finalize' | 'paid') {
    setBusyId(id)
    setActionError(null)
    setActionSuccess(null)
    try {
      await apiRequest(`/admin/settlements/${id}/${action}`, {
        method: 'POST',
      })
      setActionSuccess(
        action === 'finalize' ? 'Settlement finalized' : 'Settlement marked paid',
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
        title="Settlements"
        description="Create merchant settlement batches, finalize, and mark paid."
      />

      <section className="panel" style={{ marginBottom: '1.25rem' }}>
        <h2>Create settlement</h2>
        <form className="card-form wide" onSubmit={onCreate}>
          <div className="form-grid">
            <label>
              Period start
              <input
                type="datetime-local"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
              />
            </label>
            <label>
              Period end
              <input
                type="datetime-local"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
              />
            </label>
            <label>
              Fee (bps)
              <input
                type="number"
                min={0}
                value={feeBps}
                onChange={(e) => setFeeBps(e.target.value)}
              />
            </label>
          </div>
          <button className="btn primary" type="submit" disabled={formLoading}>
            {formLoading ? 'Creating…' : 'Create draft'}
          </button>
        </form>
      </section>

      <div className="toolbar">
        <select
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value)
          }}
        >
          <option value="">All statuses</option>
          <option value="DRAFT">DRAFT</option>
          <option value="FINALIZED">FINALIZED</option>
          <option value="PAID">PAID</option>
        </select>
      </div>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {actionError ? <p className="error">{actionError}</p> : null}
      {actionSuccess ? <p className="success">{actionSuccess}</p> : null}

      <DataTable
        columns={[
          'Reference',
          'Period',
          'Gross',
          'Fee',
          'Net',
          'Lines',
          'Status',
          'Created',
          'Actions',
        ]}
        empty={!loading && (data?.settlements.length ?? 0) === 0}
      >
        {data?.settlements.map((s) => (
          <tr key={s.id}>
            <td>
              <code>{s.reference}</code>
            </td>
            <td>
              {formatDate(s.periodStart)}
              <br />
              <span className="muted">→ {formatDate(s.periodEnd)}</span>
            </td>
            <td>{formatTzs(s.grossAmount)}</td>
            <td>{formatTzs(s.feeAmount)}</td>
            <td>{formatTzs(s.netAmount)}</td>
            <td>{s.lines.length}</td>
            <td>
              <span className={`badge ${statusBadge(s.status) || 'warn'}`}>
                {s.status}
              </span>
            </td>
            <td>{formatDate(s.createdAt)}</td>
            <td>
              <div className="row-actions">
                {s.status === 'DRAFT' ? (
                  <button
                    type="button"
                    className="btn primary sm"
                    disabled={busyId === s.id}
                    onClick={() => settlementAction(s.id, 'finalize')}
                  >
                    Finalize
                  </button>
                ) : null}
                {s.status === 'FINALIZED' ? (
                  <button
                    type="button"
                    className="btn primary sm"
                    disabled={busyId === s.id}
                    onClick={() => settlementAction(s.id, 'paid')}
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
