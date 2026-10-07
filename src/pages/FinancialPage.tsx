import { useMemo, useState } from 'react'
import { apiRequest, ApiError } from '../api/client'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { formatDate, formatTzs, qs, useApiResource } from '../lib/hooks'
import { FinancialOverview } from './FinancialOverview'

const CONTROL_ACCOUNTS = [
  'PASSENGER_WALLETS',
  'CONDUCTOR_EARNINGS',
  'WAKALA_FLOAT',
] as const

const OPENING_WARNING =
  'This operation should only be performed once after verifying that current operational balances are correct.'

type ReconciliationAccount = {
  account: string
  accountCode: string
  operationalBalance: number
  ledgerBalance: number
  difference: number
  status: 'MATCH' | 'MISMATCH'
}

type Reconciliation = {
  reference: string
  openingBalancePosted: boolean
  alreadyCompleted?: boolean
  accounts: ReconciliationAccount[]
}

type RailStatus = {
  intendedPartner: string
  activeAdapter: string
  selcomConfigured: boolean
  liveMoneyMovement: boolean
  environment: string | null
  lastCallbackAt: string | null
  lastSuccessfulExternalTransactionAt: string | null
  reason: string
}

type ExternalRow = {
  busPayReference: string
  providerReference: string | null
  type: string
  amount: number
  direction: string
  destinationProvider: string
  destination: string
  method: string
  status: string
  createdAt: string
  completedAt: string | null
}

type FinancialTransactions = {
  page: number
  limit: number
  total: number
  rail: RailStatus
  transactions: ExternalRow[]
}

function accountTitle(name: string) {
  return name.replace(/_/g, ' ')
}

function ReconciliationSection() {
  const { data, error, loading, reload } = useApiResource<Reconciliation>(
    '/admin/financial/reconciliation',
  )
  const [confirming, setConfirming] = useState(false)
  const [posting, setPosting] = useState(false)
  const [postedLocally, setPostedLocally] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const posted = postedLocally || Boolean(data?.openingBalancePosted)
  const rows = CONTROL_ACCOUNTS.map(
    (name) => data?.accounts.find((row) => row.account === name) ?? null,
  )

  async function postOpeningBalances() {
    setPosting(true)
    setActionError(null)
    try {
      const result = await apiRequest<Reconciliation>(
        '/admin/financial/opening-balances',
        { method: 'POST' },
      )
      setPostedLocally(true)
      setConfirming(false)
      setNotice(
        result.alreadyCompleted
          ? `Opening balances were already posted (${result.reference}).`
          : `Opening balances posted (${result.reference}).`,
      )
      reload()
    } catch (err) {
      setActionError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Opening balances were not posted',
      )
    } finally {
      setPosting(false)
    }
  }

  return (
    <section className="panel">
      <div className="section-head">
        <h2>Reconciliation</h2>
        {posted ? (
          <span className="badge ok">
            Posted{data?.reference ? ` · ${data.reference}` : ''}
          </span>
        ) : null}
      </div>
      {error ? <p className="error">{error}</p> : null}
      {actionError ? <p className="error">{actionError}</p> : null}
      {notice ? <p className="success">{notice}</p> : null}
      {loading ? <p className="muted">Loading…</p> : null}
      <DataTable
        columns={['Account', 'Operational', 'Ledger', 'Difference', 'Status']}
        empty={!loading && rows.every((row) => row == null)}
        emptyText="Reconciliation is not available"
      >
        {[...rows, ...(data?.accounts ?? []).filter((row) => !CONTROL_ACCOUNTS.includes(row.account as (typeof CONTROL_ACCOUNTS)[number]))].map((row) =>
          row ? (
            <tr key={row.account}>
              <td>
                {row.accountCode ? (
                  <span className="account-code">{row.accountCode}</span>
                ) : null}
                {accountTitle(row.account)}
              </td>
              <td className="num">{formatTzs(row.operationalBalance)}</td>
              <td className="num">{formatTzs(row.ledgerBalance)}</td>
              <td className="num">{formatTzs(row.difference)}</td>
              <td>
                <span className={row.status === 'MATCH' ? 'badge ok' : 'badge bad'}>
                  {row.status}
                </span>
              </td>
            </tr>
          ) : null,
        )}
      </DataTable>
      <div className="row-actions" style={{ marginTop: '1rem' }}>
        <button
          type="button"
          className="btn primary"
          disabled={posted || posting || loading || !data}
          onClick={() => setConfirming(true)}
        >
          {posting ? 'Posting…' : 'Post Opening Balances'}
        </button>
      </div>
      {confirming ? (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="opening-balance-title"
          >
            <h2 id="opening-balance-title">Post opening balances</h2>
            <p className="warning">{OPENING_WARNING}</p>
            {actionError ? <p className="error">{actionError}</p> : null}
            <div className="modal-actions">
              <button
                type="button"
                className="btn ghost"
                disabled={posting}
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={posting || posted}
                onClick={postOpeningBalances}
              >
                {posting ? 'Posting…' : 'Post Opening Balances'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export function FinancialPage() {
  const [page, setPage] = useState(1)
  const path = useMemo(
    () => `/admin/financial/transactions${qs({ page, limit: 50 })}`,
    [page],
  )
  const { data, error, loading } = useApiResource<FinancialTransactions>(path)
  const rail = data?.rail
  const rows = data?.transactions ?? []

  return (
    <div className="page financial">
      <PageHeader title="Financial rail" />
      <div className="panel-stack">
        <FinancialOverview />
        <ReconciliationSection />
        {error ? <p className="error">{error}</p> : null}
        {rail ? (
          <section className="panel provider-card">
            <h2>Payment provider</h2>
            <dl className="provider-status">
              <div>
                <dt>Provider</dt>
                <dd>{rail.intendedPartner}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span className={rail.selcomConfigured ? 'badge ok' : 'badge warn'}>
                    {rail.selcomConfigured ? 'Connected' : 'Not connected'}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Live money movement</dt>
                <dd>{rail.liveMoneyMovement ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt>Adapter</dt>
                <dd>{rail.activeAdapter}</dd>
              </div>
              <div>
                <dt>Environment</dt>
                <dd>{rail.environment ?? '—'}</dd>
              </div>
              <div>
                <dt>Last callback</dt>
                <dd>{rail.lastCallbackAt ? formatDate(rail.lastCallbackAt) : '—'}</dd>
              </div>
              <div>
                <dt>Last successful transaction</dt>
                <dd>
                  {rail.lastSuccessfulExternalTransactionAt
                    ? formatDate(rail.lastSuccessfulExternalTransactionAt)
                    : '—'}
                </dd>
              </div>
            </dl>
          </section>
        ) : null}
        <section className="panel">
          <h2>External transactions</h2>
          {loading ? <p className="muted">Loading…</p> : null}
          <DataTable
            columns={[
              'BusPay reference',
              'Provider reference',
              'Type',
              'Direction',
              'Amount',
              'Destination provider',
              'Destination',
              'Status',
              'Created',
              'Completed',
            ]}
            empty={!loading && rows.length === 0}
            emptyText="No external transactions"
          >
            {rows.map((row) => (
              <tr key={row.busPayReference}>
                <td>{row.busPayReference}</td>
                <td>{row.providerReference ?? '—'}</td>
                <td>{row.type}</td>
                <td>{row.direction}</td>
                <td className="num">{formatTzs(row.amount)}</td>
                <td>{row.destinationProvider}</td>
                <td>{row.destination}</td>
                <td>
                  <span className="badge">{row.status}</span>
                </td>
                <td>{formatDate(row.createdAt)}</td>
                <td>{row.completedAt ? formatDate(row.completedAt) : '—'}</td>
              </tr>
            ))}
          </DataTable>
          {data && data.total > data.limit ? (
            <div className="pagination">
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
