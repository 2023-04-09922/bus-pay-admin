import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { DataTable } from '../components/DataTable'
import { canAccess } from '../nav'
import { formatDate, formatTzs, qs, useApiResource } from '../lib/hooks'

type Period = 'today' | 'month'

type MovementAccount = {
  accountCode: string
  name: string
  balance: number
}

type Movement = {
  accounts: MovementAccount[]
  total: number
  today: number
  month: number
}

type Profitability = {
  selcomPayoutCost: {
    provider: string
    operation: string
    amount: number | null
    status: string
  }
  note: string
}

type CommissionRow = { balance: number }

type LedgerAccount = {
  accountCode: string
  name: string
  type: string
  balance: number
  status: string
}

type LedgerEntry = {
  direction: 'DEBIT' | 'CREDIT'
  amount: number
  account: { accountCode: string; name: string }
}

type LedgerTransaction = {
  id: string
  createdAt: string
  transactionType: string
  entries: LedgerEntry[]
}

type LedgerPage = { transactions: LedgerTransaction[] }

type ReportsSummary = {
  taps: { count: number; volume: number }
  topUps: { count: number; volume: number }
}

const REVENUE_CODES = ['4000', '4100', '4200'] as const
const EXPENSE_CODES = ['5000', '5100', '5200', '5300'] as const

const REVENUE_LABELS: Record<string, string> = {
  '4000': 'BusPay Fare Revenue',
  '4100': 'Withdrawal Fee Revenue',
  '4200': 'Other Platform Revenue',
}

const EXPENSE_LABELS: Record<string, string> = {
  '5000': 'Wakala Commission',
  '5100': 'SMS',
  '5200': 'Card Operations',
  '5300': 'Payment Provider',
}

function periodValue(movement: Movement | null, period: Period) {
  if (!movement) return null
  return period === 'today' ? movement.today : movement.month
}

function findAccount(accounts: MovementAccount[] | undefined, code: string) {
  return accounts?.find((row) => row.accountCode === code) ?? null
}

function reportRange(period: Period) {
  const end = new Date()
  const start = new Date(end)
  if (period === 'today') {
    start.setHours(0, 0, 0, 0)
  } else {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
  }
  return { from: start.toISOString(), to: end.toISOString() }
}

function expenseAmount(
  row: MovementAccount,
  profitability: Profitability | null,
  providerUnconfigured: boolean,
) {
  if (row.accountCode !== '5300') return formatTzs(row.balance)
  if (!profitability) return '—'
  if (providerUnconfigured) return 'Not configured'
  return formatTzs(row.balance)
}

function marginPercent(net: number, revenue: number) {
  if (revenue === 0) return null
  return (net / revenue) * 100
}

function accountTitle(name: string) {
  return name.replace(/_/g, ' ')
}

function SectionError({
  error,
  onRetry,
}: {
  error: string | null
  onRetry: () => void
}) {
  if (!error) return null
  return (
    <p className="error">
      {error}{' '}
      <button type="button" className="btn ghost sm" onClick={onRetry}>
        Retry
      </button>
    </p>
  )
}

function MoneyLine({
  code,
  label,
  amount,
  total,
}: {
  code?: string
  label: string
  amount: string
  total?: boolean
}) {
  return (
    <div className={total ? 'money-row total' : 'money-row'}>
      <span>
        {code ? <span className="account-code">{code}</span> : null}
        {label}
      </span>
      <strong>{amount}</strong>
    </div>
  )
}

export function FinancialOverview() {
  const { user } = useAuth()
  const allow = (code: string) => canAccess(user?.role, user?.permissions, [code])
  const [period, setPeriod] = useState<Period>('today')
  const revenue = useApiResource<Movement>(allow('FINANCIAL_REVENUE_VIEW') ? '/admin/financial/revenue' : null)
  const expenses = useApiResource<Movement>(allow('FINANCIAL_REVENUE_VIEW') ? '/admin/financial/expenses' : null)
  const profitability = useApiResource<Profitability>(allow('FINANCIAL_REVENUE_VIEW') ? '/admin/financial/profitability' : null)
  const commissions = useApiResource<CommissionRow[]>(allow('FINANCIAL_COMMISSION_VIEW') ? '/admin/financial/wakala-commissions' : null)
  const accounts = useApiResource<LedgerAccount[]>(allow('FINANCIAL_LEDGER_VIEW') ? '/admin/financial/accounts' : null)
  const ledger = useApiResource<LedgerPage>(allow('FINANCIAL_LEDGER_VIEW') ? '/admin/financial/ledger?page=1&limit=100' : null)
  const reportPath = useMemo(
    () =>
      allow('REPORT_WAKALA_VIEW') || allow('REPORT_CONDUCTOR_VIEW')
        ? `/admin/reports/summary${qs(reportRange(period))}`
        : null,
    [period, user],
  )
  const reports = useApiResource<ReportsSummary>(reportPath)

  const periodLabel = period === 'today' ? 'Today' : 'This month'
  const revenuePeriod = periodValue(revenue.data, period)
  const expensePeriod = periodValue(expenses.data, period)
  const providerKnown = profitability.data?.selcomPayoutCost.status === 'KNOWN'
  const providerUnconfigured = profitability.data != null && !providerKnown
  const net =
    revenuePeriod != null && expensePeriod != null ? revenuePeriod - expensePeriod : null
  const margin =
    net != null && revenuePeriod != null ? marginPercent(net, revenuePeriod) : null
  const commissionTotal = commissions.data
    ? commissions.data.reduce((sum, row) => sum + row.balance, 0)
    : null
  const withdrawalFee = findAccount(revenue.data?.accounts, '4100')

  const revenueLines = REVENUE_CODES.map((code) =>
    findAccount(revenue.data?.accounts, code),
  ).filter((row): row is MovementAccount => row != null)
  const knownExpenseCodes = new Set<string>(EXPENSE_CODES)
  const expenseLines = EXPENSE_CODES.map((code) =>
    findAccount(expenses.data?.accounts, code),
  ).filter((row): row is MovementAccount => row != null)
  const otherExpenses =
    expenses.data?.accounts.filter((row) => !knownExpenseCodes.has(row.accountCode)) ??
    []

  const recentRevenue = (ledger.data?.transactions ?? []).flatMap((transaction) =>
    transaction.entries
      .filter((entry) =>
        REVENUE_CODES.includes(entry.account.accountCode as (typeof REVENUE_CODES)[number]),
      )
      .map((entry) => ({
        id: `${transaction.id}-${entry.account.accountCode}-${entry.direction}-${entry.amount}`,
        createdAt: transaction.createdAt,
        transactionType: transaction.transactionType,
        name: entry.account.name,
        code: entry.account.accountCode,
        direction: entry.direction,
        amount: entry.amount,
      })),
  )

  const averageFare =
    reports.data && reports.data.taps.count > 0
      ? Math.round(reports.data.taps.volume / reports.data.taps.count)
      : null
  const conductor = accounts.data?.find((row) => row.accountCode === '2000') ?? null
  const floatAccount = accounts.data?.find((row) => row.accountCode === '3000') ?? null

  return (
    <>
      <CompanyPosition />
      <section className="panel">
        <div className="section-head">
          <h2>Overview</h2>
          <div className="filter-row">
            <button
              type="button"
              className={period === 'today' ? 'btn primary sm' : 'btn ghost sm'}
              onClick={() => setPeriod('today')}
            >
              Today
            </button>
            <button
              type="button"
              className={period === 'month' ? 'btn primary sm' : 'btn ghost sm'}
              onClick={() => setPeriod('month')}
            >
              This month
            </button>
          </div>
        </div>
        <SectionError error={revenue.error} onRetry={revenue.reload} />
        <SectionError error={expenses.error} onRetry={expenses.reload} />
        {revenue.loading || expenses.loading ? <p className="muted">Loading…</p> : null}
        <section className="stat-grid">
          <article className="stat">
            <span>Today's Revenue</span>
            <strong>{revenue.data ? formatTzs(revenue.data.today) : '—'}</strong>
            <small className="period">Today</small>
          </article>
          <article className="stat">
            <span>This Month's Revenue</span>
            <strong>{revenue.data ? formatTzs(revenue.data.month) : '—'}</strong>
            <small className="period">This month</small>
          </article>
          <article
            className={
              expensePeriod != null && expensePeriod > 0 ? 'stat negative' : 'stat'
            }
          >
            <span>Operating Costs</span>
            <strong>{expensePeriod != null ? formatTzs(expensePeriod) : '—'}</strong>
            <small className="period">{periodLabel}</small>
          </article>
          <article
            className={
              providerKnown && net != null && net >= 0
                ? 'stat positive'
                : providerUnconfigured
                  ? 'stat warn'
                  : 'stat'
            }
          >
            <span>Net Contribution</span>
            <strong>{net != null ? formatTzs(net) : '—'}</strong>
            {providerUnconfigured ? (
              <span className="badge warn">Provider cost not configured</span>
            ) : (
              <small className="period">{periodLabel}</small>
            )}
          </article>
          <article className="stat">
            <span>Wakala Commissions</span>
            <strong>
              {commissionTotal != null ? formatTzs(commissionTotal) : '—'}
            </strong>
            <SectionError error={commissions.error} onRetry={commissions.reload} />
          </article>
          <article className="stat">
            <span>Withdrawal Fee Revenue</span>
            <strong>{withdrawalFee ? formatTzs(withdrawalFee.balance) : '—'}</strong>
          </article>
        </section>
      </section>

      <section className="panel">
        <h2>Revenue breakdown</h2>
        <SectionError error={revenue.error} onRetry={revenue.reload} />
        {revenue.loading ? <p className="muted">Loading…</p> : null}
        {revenue.data ? (
          <div className="money-stack">
            {revenueLines.map((row) => (
              <MoneyLine
                key={row.accountCode}
                code={row.accountCode}
                label={REVENUE_LABELS[row.accountCode] ?? accountTitle(row.name)}
                amount={formatTzs(row.balance)}
              />
            ))}
            <MoneyLine
              label="Total Revenue"
              amount={formatTzs(revenue.data.total)}
              total
            />
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h2>Operating costs</h2>
        <SectionError error={expenses.error} onRetry={expenses.reload} />
        <SectionError error={profitability.error} onRetry={profitability.reload} />
        {expenses.loading ? <p className="muted">Loading…</p> : null}
        <div className="money-stack">
          {expenseLines.map((row) => (
            <MoneyLine
              key={row.accountCode}
              code={row.accountCode}
              label={EXPENSE_LABELS[row.accountCode] ?? accountTitle(row.name)}
              amount={expenseAmount(row, profitability.data, providerUnconfigured)}
            />
          ))}
          {otherExpenses.map((row) => (
            <MoneyLine
              key={row.accountCode}
              code={row.accountCode}
              label={accountTitle(row.name)}
              amount={formatTzs(row.balance)}
            />
          ))}
          {expenses.data ? (
            <MoneyLine
              label="Total"
              amount={formatTzs(expenses.data.total)}
              total
            />
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Profitability</h2>
          <small className="period">{periodLabel}</small>
        </div>
        <div className="money-stack">
          <MoneyLine
            label="Total Revenue"
            amount={revenuePeriod != null ? formatTzs(revenuePeriod) : '—'}
          />
          <MoneyLine
            label="Operating Costs"
            amount={expensePeriod != null ? formatTzs(expensePeriod) : '—'}
          />
          <MoneyLine
            label="Net Contribution"
            amount={net != null ? formatTzs(net) : '—'}
          />
          <MoneyLine
            label="Net Margin"
            amount={margin == null ? '—' : `${margin.toFixed(1)}%`}
            total
          />
        </div>
        {providerUnconfigured ? (
          <span className="badge warn" style={{ marginTop: '0.75rem' }}>
            Provider cost not configured
          </span>
        ) : null}
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Business metrics</h2>
          <small className="period">{periodLabel}</small>
        </div>
        <SectionError error={reports.error} onRetry={reports.reload} />
        {reports.loading ? <p className="muted">Loading…</p> : null}
        {reports.data ? (
          <section className="stat-grid">
            <article className="stat">
              <span>NFC Fares</span>
              <strong>{reports.data.taps.count}</strong>
            </article>
            <article className="stat">
              <span>Fare Volume</span>
              <strong>{formatTzs(reports.data.taps.volume)}</strong>
            </article>
            <article className="stat">
              <span>Average Fare</span>
              <strong>{averageFare != null ? formatTzs(averageFare) : '—'}</strong>
            </article>
            <article className="stat">
              <span>Passenger Top-ups</span>
              <strong>{formatTzs(reports.data.topUps.volume)}</strong>
            </article>
            {conductor ? (
              <article className="stat">
                <span>Conductor Earnings Owed</span>
                <strong>{formatTzs(conductor.balance)}</strong>
              </article>
            ) : null}
            {floatAccount ? (
              <article className="stat">
                <span>Wakala Float</span>
                <strong>{formatTzs(floatAccount.balance)}</strong>
              </article>
            ) : null}
          </section>
        ) : null}
      </section>

      <section className="panel">
        <h2>Recent financial activity</h2>
        <SectionError error={ledger.error} onRetry={ledger.reload} />
        {ledger.loading ? <p className="muted">Loading…</p> : null}
        <DataTable
          columns={['Date', 'Account', 'Type', 'Direction', 'Amount']}
          empty={!ledger.loading && recentRevenue.length === 0}
          emptyText="No recent activity"
        >
          {recentRevenue.map((row) => (
            <tr key={row.id}>
              <td>{formatDate(row.createdAt)}</td>
              <td>
                <span className="account-code">{row.code}</span>
                {accountTitle(row.name)}
              </td>
              <td>{row.transactionType}</td>
              <td>{row.direction}</td>
              <td className="num">
                {formatTzs(row.direction === 'CREDIT' ? row.amount : -row.amount)}
              </td>
            </tr>
          ))}
        </DataTable>
      </section>

      <section className="panel">
        <h2>Financial accounts</h2>
        <SectionError error={accounts.error} onRetry={accounts.reload} />
        {accounts.loading ? <p className="muted">Loading…</p> : null}
        <DataTable
          columns={['Code', 'Account', 'Balance']}
          empty={!accounts.loading && (accounts.data?.length ?? 0) === 0}
          emptyText="No financial accounts"
        >
          {(accounts.data ?? []).map((row) => (
            <tr key={row.accountCode}>
              <td className="code">{row.accountCode}</td>
              <td className="account-name">{row.name}</td>
              <td className="num">{formatTzs(row.balance)}</td>
            </tr>
          ))}
        </DataTable>
      </section>
    </>
  )
}

type CompanyPositionView = {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  companyCashBalance: number
  availableForDistribution: number
  providerStatus: string
}

type CustomerFunds = {
  passengerWallets: number
  conductorEarnings: number
  wakalaFloat: number
  providerClearing: number
  note: string
}

function CompanyPosition() {
  const position = useApiResource<CompanyPositionView>('/admin/financial/company-position')
  const customers = useApiResource<CustomerFunds>('/admin/financial/customer-funds')
  const row = position.data
  return (
    <section className="panel">
      <div className="section-head">
        <h2>Company position</h2>
        <Link to="/company-finance" className="btn primary sm">
          Manage company finance
        </Link>
      </div>
      <p className="muted">Accounting profit is not the same as company cash. Customer funds are excluded.</p>
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
          <span>Available distribution</span>
          <strong>{row ? formatTzs(row.availableForDistribution) : '—'}</strong>
        </article>
      </section>
      {row?.providerStatus === 'NOT_CONNECTED' ? (
        <p className="muted">External company transfers are not connected. Approval does not mean money was sent.</p>
      ) : null}
      <h2>Customer / third-party funds</h2>
      <p className="muted">{customers.data?.note ?? 'These balances are not BusPay company profit.'}</p>
      <section className="stat-grid">
        <article className="stat">
          <span>Passenger wallets</span>
          <strong>{customers.data ? formatTzs(customers.data.passengerWallets) : '—'}</strong>
        </article>
        <article className="stat">
          <span>Conductor earnings</span>
          <strong>{customers.data ? formatTzs(customers.data.conductorEarnings) : '—'}</strong>
        </article>
        <article className="stat">
          <span>Wakala float</span>
          <strong>{customers.data ? formatTzs(customers.data.wakalaFloat) : '—'}</strong>
        </article>
        <article className="stat">
          <span>Provider clearing</span>
          <strong>{customers.data ? formatTzs(customers.data.providerClearing) : '—'}</strong>
        </article>
      </section>
    </section>
  )
}
