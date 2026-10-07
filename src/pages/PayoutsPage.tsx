import { useMemo, useState } from 'react'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { formatDate, formatTzs, qs, useApiResource } from '../lib/hooks'

type PayoutRow = {
  id: string
  reference: string
  amount: number
  method: string
  provider: string
  destination: string
  status: string
  providerReference: string | null
  failureReason: string | null
  requestedAt: string
  completedAt: string | null
  conductor: { id: string; name: string; phone: string }
}

type PayoutsResponse = {
  page: number
  limit: number
  total: number
  payouts: PayoutRow[]
}

function statusBadge(status: string) {
  if (status === 'COMPLETED') return 'ok'
  if (status === 'PENDING' || status === 'PROCESSING') return 'warn'
  return 'bad'
}

export function PayoutsPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const path = useMemo(
    () => `/admin/payouts${qs({ status, page, limit: 50 })}`,
    [status, page],
  )
  const { data, error, loading } = useApiResource<PayoutsResponse>(path)
  const rows = data?.payouts ?? []

  return (
    <>
      <PageHeader title="Electronic payouts" />
      <div className="toolbar">
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
          <option value="REVERSED">Reversed</option>
        </select>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="muted">Loading…</p> : null}
      <DataTable
        columns={[
          'Reference',
          'Conductor',
          'Amount',
          'Method',
          'Provider',
          'Destination',
          'Status',
          'Provider ref',
          'Requested',
          'Completed',
          'Failure',
        ]}
        empty={!loading && rows.length === 0}
        emptyText="No electronic payouts"
      >
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.reference}</td>
            <td>
              {row.conductor.name}
              <div className="muted">{row.conductor.phone}</div>
            </td>
            <td>{formatTzs(row.amount)}</td>
            <td>{row.method}</td>
            <td>{row.provider}</td>
            <td>{row.destination}</td>
            <td>
              <span className={`badge ${statusBadge(row.status)}`}>{row.status}</span>
            </td>
            <td>{row.providerReference ?? '—'}</td>
            <td>{formatDate(row.requestedAt)}</td>
            <td>{row.completedAt ? formatDate(row.completedAt) : '—'}</td>
            <td>{row.failureReason ?? '—'}</td>
          </tr>
        ))}
      </DataTable>
    </>
  )
}
