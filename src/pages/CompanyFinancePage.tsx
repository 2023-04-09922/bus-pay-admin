import { useState } from 'react'
import { apiRequest, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { formatDate, formatTzs, useApiResource } from '../lib/hooks'

type Position = {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  retainedEarnings: number
  companyCashBalance: number
  availableForDistribution: number
  completedOwnerDistributions: number
  providerStatus: string
}

type Bank = {
  id: string
  name: string
  bankName: string | null
  accountNumberMasked: string
  ledgerAccountCode: string
  status: string
}

type FinanceRow = {
  id: string
  type: string
  amount: number
  status: string
  description: string
  reference: string
  destinationMasked: string | null
  createdAt: string
  approvedAt: string | null
  completedAt: string | null
  providerStatus?: string
}

const EXPENSE_CATEGORIES = [
  'INFRASTRUCTURE',
  'SALARIES',
  'OFFICE',
  'PROFESSIONAL_SERVICES',
  'SMS',
  'OTHER_OPERATING',
] as const

export function CompanyFinancePage() {
  const { user } = useAuth()
  const canMoveCompanyMoney = user?.role === 'admin'
  const position = useApiResource<Position>('/admin/financial/company-position')
  const banks = useApiResource<Bank[]>('/admin/financial/company-banks')
  const transactions = useApiResource<FinanceRow[]>('/admin/financial/company-transactions')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [bankId, setBankId] = useState('')
  const [destination, setDestination] = useState('')
  const [category, setCategory] = useState<(typeof EXPENSE_CATEGORIES)[number]>('INFRASTRUCTURE')
  const [toBankId, setToBankId] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountLabel, setAccountLabel] = useState('')

  const row = position.data
  const bankRows = banks.data ?? []
  const selectedBank = bankId || bankRows[0]?.id || ''

  async function submit(path: string, body: Record<string, unknown>) {
    setError(null)
    setNotice(null)
    try {
      const result = await apiRequest<{ status?: string; providerStatus?: string; externalTransferCompleted?: boolean }>(
        path,
        { method: 'POST', body: JSON.stringify({ ...body, idempotencyKey: crypto.randomUUID() }) },
      )
      setNotice(
        result.externalTransferCompleted
          ? 'Recorded.'
          : result.providerStatus === 'NOT_CONNECTED'
            ? 'Recorded. External transfer is not connected, so this is not a completed bank payment.'
            : 'Recorded.',
      )
      position.reload()
      banks.reload()
      transactions.reload()
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Request failed')
    }
  }

  return (
    <>
      <PageHeader
        title="Company finance"
        description="Company cash, profit, and owner distributions. Passenger wallets, conductor earnings, and Wakala float are not company money."
      />
      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="success">{notice}</p> : null}
      <p className="muted">
        External company transfers are not connected. Approved does not mean money was sent.
      </p>
      <section className="stat-grid">
        <article className="stat">
          <span>Revenue</span>
          <strong>{row ? formatTzs(row.totalRevenue) : '—'}</strong>
        </article>
        <article className="stat">
          <span>Expenses</span>
          <strong>{row ? formatTzs(row.totalExpenses) : '—'}</strong>
        </article>
        <article className="stat">
          <span>Net profit</span>
          <strong>{row ? formatTzs(row.netProfit) : '—'}</strong>
        </article>
        <article className="stat">
          <span>Company cash</span>
          <strong>{row ? formatTzs(row.companyCashBalance) : '—'}</strong>
        </article>
        <article className="stat">
          <span>Retained earnings</span>
          <strong>{row ? formatTzs(row.retainedEarnings) : '—'}</strong>
        </article>
        <article className="stat">
          <span>Available for distribution</span>
          <strong>{row ? formatTzs(row.availableForDistribution) : '—'}</strong>
        </article>
      </section>

      <section className="panel">
        <h2>Company bank accounts</h2>
        <DataTable columns={['Account', 'Bank', 'Number', 'Code', 'Status']} empty={bankRows.length === 0} emptyText="No company accounts yet">
          {bankRows.map((bank) => (
            <tr key={bank.id}>
              <td>{bank.name}</td>
              <td>{bank.bankName ?? '—'}</td>
              <td>{bank.accountNumberMasked}</td>
              <td>{bank.ledgerAccountCode}</td>
              <td>{bank.status}</td>
            </tr>
          ))}
        </DataTable>
        {canMoveCompanyMoney ? (
        <div className="toolbar">
          <input value={accountLabel} onChange={(event) => setAccountLabel(event.target.value)} placeholder="Account name" />
          <input value={bankName} onChange={(event) => setBankName(event.target.value)} placeholder="Bank name" />
          <input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} placeholder="Account number" />
          <button
            type="button"
            className="btn primary"
            onClick={() =>
              submit('/admin/financial/company-banks', {
                name: accountLabel,
                bankName,
                accountNumber,
              }).then(() => setAccountNumber(''))
            }
          >
            Add bank account
          </button>
        </div>
        ) : null}
      </section>

      {canMoveCompanyMoney ? (
      <section className="panel">
        <h2>Actions</h2>
        <div className="toolbar">
          <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount" />
          <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason" />
          <select value={selectedBank} onChange={(event) => setBankId(event.target.value)}>
            {bankRows.map((bank) => (
              <option key={bank.id} value={bank.id}>
                {bank.name}
              </option>
            ))}
          </select>
        </div>
        <div className="toolbar">
          <button
            type="button"
            className="btn primary"
            onClick={() =>
              submit('/admin/financial/company-deposits', {
                amount: Number(amount),
                bankAccountId: selectedBank,
                reason,
              })
            }
          >
            Record company deposit
          </button>
          <select value={category} onChange={(event) => setCategory(event.target.value as (typeof EXPENSE_CATEGORIES)[number])}>
            {EXPENSE_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn primary"
            onClick={() =>
              submit('/admin/financial/company-expenses', {
                amount: Number(amount),
                category,
                bankAccountId: selectedBank,
                reason,
              })
            }
          >
            Record company expense
          </button>
        </div>
        <div className="toolbar">
          <input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Distribution destination" />
          <button
            type="button"
            className="btn primary"
            onClick={() =>
              submit('/admin/financial/company-distributions', {
                amount: Number(amount),
                destination,
                reason,
                bankAccountId: selectedBank,
              })
            }
          >
            Request owner distribution
          </button>
          <select value={toBankId} onChange={(event) => setToBankId(event.target.value)}>
            <option value="">Transfer to</option>
            {bankRows.map((bank) => (
              <option key={bank.id} value={bank.id}>
                {bank.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn primary"
            onClick={() =>
              submit('/admin/financial/company-transfers', {
                amount: Number(amount),
                fromBankAccountId: selectedBank,
                toBankAccountId: toBankId,
                reason,
              })
            }
          >
            Company transfer
          </button>
        </div>
      </section>
      ) : null}

      <section className="panel">
        <h2>Recent company transactions</h2>
        <DataTable
          columns={['Date', 'Type', 'Amount', 'Description', 'Destination', 'Status', 'Reference']}
          empty={(transactions.data?.length ?? 0) === 0}
          emptyText="No company transactions"
        >
          {(transactions.data ?? []).map((item) => (
            <tr key={item.id}>
              <td>{formatDate(item.createdAt)}</td>
              <td>{item.type}</td>
              <td>{formatTzs(item.amount)}</td>
              <td>{item.description}</td>
              <td>{item.destinationMasked ?? '—'}</td>
              <td>{item.status}</td>
              <td>{item.reference}</td>
            </tr>
          ))}
        </DataTable>
      </section>

      <section className="panel">
        <h2>Distributions</h2>
        <p className="muted">Completed owner distributions: {row ? formatTzs(row.completedOwnerDistributions) : '—'}</p>
        <DataTable
          columns={['Amount', 'Destination', 'Reason', 'Status', 'Requested', 'Approved', 'Completed']}
          empty={(transactions.data ?? []).filter((item) => item.type === 'OWNER_DISTRIBUTION').length === 0}
          emptyText="No distributions"
        >
          {(transactions.data ?? [])
            .filter((item) => item.type === 'OWNER_DISTRIBUTION')
            .map((item) => (
              <tr key={item.id}>
                <td>{formatTzs(item.amount)}</td>
                <td>{item.destinationMasked ?? '—'}</td>
                <td>{item.description}</td>
                <td>{item.status}</td>
                <td>{formatDate(item.createdAt)}</td>
                <td>{item.approvedAt ? formatDate(item.approvedAt) : '—'}</td>
                <td>{item.completedAt ? formatDate(item.completedAt) : '—'}</td>
              </tr>
            ))}
        </DataTable>
      </section>
    </>
  )
}
