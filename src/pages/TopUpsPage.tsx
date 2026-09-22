import { useMemo, useState } from 'react'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { formatDate, formatTzs, qs, useApiResource } from '../lib/hooks'

type TopUpRow = {
  id: string
  reference: string
  amount: number
  source: string
  createdAt: string
  wallet: { publicCode: string }
  agent: {
    id: string
    username: string
    firstName: string
    lastName: string
  } | null
}

type TopUpsResponse = {
  page: number
  limit: number
  total: number
  topUps: TopUpRow[]
}

export function TopUpsPage() {
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const path = useMemo(
    () => `/admin/topups${qs({ q, from, to, page, limit: 50 })}`,
    [q, from, to, page],
  )
  const { data, error, loading } = useApiResource<TopUpsResponse>(path)

  return (
    <div className="page">
      <PageHeader
        title="Top-ups"
        description="Agent and admin wallet top-up history."
      />

      <div className="toolbar">
        <input
          placeholder="Search reference, wallet, card…"
          value={q}
          onChange={(e) => {
            setPage(1)
            setQ(e.target.value)
          }}
        />
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
          'Source',
          'Wallet',
          'Agent',
          'Created',
        ]}
        empty={!loading && (data?.topUps.length ?? 0) === 0}
      >
        {data?.topUps.map((t) => (
          <tr key={t.id}>
            <td>
              <code>{t.reference}</code>
            </td>
            <td>{formatTzs(t.amount)}</td>
            <td>{t.source}</td>
            <td>
              <code>{t.wallet.publicCode}</code>
            </td>
            <td>
              {t.agent
                ? `${t.agent.firstName} ${t.agent.lastName} (${t.agent.username})`
                : '—'}
            </td>
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
