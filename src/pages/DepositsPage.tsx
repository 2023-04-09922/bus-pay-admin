import { useMemo, useState } from 'react'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { formatDate, formatTzs, qs, useApiResource } from '../lib/hooks'

type DepositRow = {
  id: string
  reference: string
  walletAccount: string
  passenger: string
  phone: string
  cardSerial: string | null
  channel: string
  source: string
  amount: number
  network: string
  provider: string
  providerReference: string
  status: string
  createdAt: string
  completedAt: string | null
  balanceAfterPayment: number | null
  walletBalance: number
}

type DepositsResponse = {
  page: number
  limit: number
  total: number
  selcomConnected: boolean
  liveMoney: boolean
  deposits: DepositRow[]
}

type DepositDetail = {
  selcomConnected: boolean
  liveMoney: boolean
  deposit: DepositRow
}

function statusBadge(status: string) {
  if (status === 'COMPLETED') return 'ok'
  if (status === 'PENDING' || status === 'PROCESSING' || status === 'UNKNOWN') return 'warn'
  return 'bad'
}

export function DepositsPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string | null>(null)
  const path = useMemo(
    () => `/admin/deposits${qs({ status, page, limit: 50 })}`,
    [status, page],
  )
  const { data, error, loading } = useApiResource<DepositsResponse>(path)
  const detail = useApiResource<DepositDetail>(selected ? `/admin/deposits/${selected}` : null)
  const rows = data?.deposits ?? []
  const opened = detail.data?.deposit

  return (
    <>
      <PageHeader title="Direct mobile-money funding" />
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
          <option value="UNKNOWN">Unknown</option>
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
          'Passenger',
          'Wallet',
          'D-Card',
          'Channel',
          'Source',
          'Amount',
          'Network',
          'Provider',
          'Provider ref',
          'Status',
          'Balance after payment',
          'Created',
          'Completed',
        ]}
        empty={!loading && rows.length === 0}
        emptyText="No direct deposits"
      >
        {rows.map((row) => (
          <tr key={row.id} onClick={() => setSelected(row.id)}>
            <td>{row.reference}</td>
            <td>
              {row.passenger}
              <div className="muted">{row.phone}</div>
            </td>
            <td>{row.walletAccount}</td>
            <td>{row.cardSerial ?? '—'}</td>
            <td>{row.channel === 'MOBILE_MONEY' ? 'MOBILE MONEY' : row.channel}</td>
            <td>{row.source === 'USSD_OPERATOR_PAYMENT' ? 'USSD / OPERATOR PAYMENT' : row.source}</td>
            <td>{formatTzs(row.amount)}</td>
            <td>{row.network}</td>
            <td>{row.provider}</td>
            <td>{row.providerReference}</td>
            <td>
              <span className={`badge ${statusBadge(row.status)}`}>{row.status}</span>
            </td>
            <td>{formatTzs(row.balanceAfterPayment ?? row.walletBalance)}</td>
            <td>{formatDate(row.createdAt)}</td>
            <td>{row.completedAt ? formatDate(row.completedAt) : '—'}</td>
          </tr>
        ))}
      </DataTable>
      {opened ? (
        <section>
          <h2>{opened.passenger}</h2>
          <p>
            Wallet {opened.walletAccount} · D-Card {opened.cardSerial ?? '—'} · {opened.network} ·{' '}
            {formatTzs(opened.amount)} · {opened.status}
          </p>
          <p>MOBILE MONEY · USSD / OPERATOR PAYMENT · {opened.network}</p>
          <p>
            Provider {opened.provider} · {opened.providerReference}
          </p>
          <p>
            Balance after payment {formatTzs(opened.balanceAfterPayment ?? opened.walletBalance)} · Current
            wallet {formatTzs(opened.walletBalance)}
          </p>
        </section>
      ) : null}
      {page > 1 ? (
        <button type="button" className="btn ghost" onClick={() => setPage((value) => value - 1)}>
          Previous
        </button>
      ) : null}
    </>
  )
}
