import { useMemo, useState } from 'react'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { formatDate, formatTzs, qs, useApiResource } from '../lib/hooks'

type TransactionRow = {
  id: string
  reference: string
  amount: number
  status: string
  passenger: string
  phone: string
  merchant: { merchantCode: string; name: string } | null
  terminal: { id: string; terminalCode: string } | null
  createdAt: string
}

type TransactionsResponse = {
  page: number
  limit: number
  total: number
  transactions: TransactionRow[]
}

function statusBadge(status: string) {
  if (status === 'SUCCESS') return 'ok'
  if (status === 'PENDING') return 'warn'
  return 'bad'
}

export function TransactionsPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const path = useMemo(
    () =>
      `/admin/transactions${qs({ q, status, from, to, page, limit: 50 })}`,
    [q, status, from, to, page],
  )
  const { data, error, loading } =
    useApiResource<TransactionsResponse>(path)

  return (
    <div className="page">
      <PageHeader
        title="Transactions"
        description="Tap payments across merchants and terminals."
      />

      <div className="toolbar">
        <input
          placeholder="Search reference, card, passenger…"
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
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILED">FAILED</option>
          <option value="REVERSED">REVERSED</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => {
            setPage(1)
            setFrom(e.target.value)
          }}
          title="From"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => {
            setPage(1)
            setTo(e.target.value)
          }}
          title="To"
        />
      </div>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <DataTable
        columns={[
          'Reference',
          'Amount',
          'Status',
          'Passenger',
          'Merchant',
          'Terminal',
          'Created',
        ]}
        empty={!loading && (data?.transactions.length ?? 0) === 0}
      >
        {data?.transactions.map((t) => (
          <tr key={t.id}>
            <td>
              <code>{t.reference}</code>
            </td>
            <td>{formatTzs(t.amount)}</td>
            <td>
              <span className={`badge ${statusBadge(t.status)}`}>
                {t.status}
              </span>
            </td>
            <td>
              {t.passenger}
              <br />
              <span className="muted">{t.phone}</span>
            </td>
            <td>
              {t.merchant
                ? `${t.merchant.name} (${t.merchant.merchantCode})`
                : '—'}
            </td>
            <td>{t.terminal?.terminalCode ?? '—'}</td>
            <td>{formatDate(t.createdAt)}</td>
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
