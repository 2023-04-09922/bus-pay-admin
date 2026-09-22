import { useMemo, useState } from 'react'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { formatTzs, qs, useApiResource } from '../lib/hooks'

type ReportsSummary = {
  taps: { count: number; volume: number }
  topUps: { count: number; volume: number }
  byMerchant: Array<{
    merchantCode: string
    name: string
    volume: number
    count: number
  }>
  byAgentTopUps: Array<{
    agentUserId: string | null
    username: string | null
    name: string | null
    volume: number
    count: number
  }>
}

export function ReportsPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const path = useMemo(
    () => `/admin/reports/summary${qs({ from, to })}`,
    [from, to],
  )
  const { data, error, loading, reload } =
    useApiResource<ReportsSummary>(path)

  return (
    <div className="page">
      <PageHeader
        title="Reports"
        description="Tap and top-up volume summary by merchant and agent."
        actions={
          <button type="button" className="btn ghost sm" onClick={reload}>
            Refresh
          </button>
        }
      />

      <div className="toolbar">
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          title="From"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          title="To"
        />
      </div>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {data ? (
        <>
          <section className="stat-grid">
            <article className="stat">
              <span>Tap count</span>
              <strong>{data.taps.count}</strong>
            </article>
            <article className="stat">
              <span>Tap volume</span>
              <strong>{formatTzs(data.taps.volume)}</strong>
            </article>
            <article className="stat">
              <span>Top-up count</span>
              <strong>{data.topUps.count}</strong>
            </article>
            <article className="stat">
              <span>Top-up volume</span>
              <strong>{formatTzs(data.topUps.volume)}</strong>
            </article>
          </section>

          <section className="panel" style={{ marginBottom: '1.25rem' }}>
            <h2>By merchant</h2>
            <DataTable
              columns={['Code', 'Name', 'Taps', 'Volume']}
              empty={data.byMerchant.length === 0}
            >
              {data.byMerchant.map((m) => (
                <tr key={m.merchantCode}>
                  <td>
                    <code>{m.merchantCode}</code>
                  </td>
                  <td>{m.name}</td>
                  <td>{m.count}</td>
                  <td>{formatTzs(m.volume)}</td>
                </tr>
              ))}
            </DataTable>
          </section>

          <section className="panel">
            <h2>By agent (top-ups)</h2>
            <DataTable
              columns={['Agent', 'Username', 'Top-ups', 'Volume']}
              empty={data.byAgentTopUps.length === 0}
            >
              {data.byAgentTopUps.map((a) => (
                <tr key={a.agentUserId ?? a.username ?? 'unknown'}>
                  <td>{a.name ?? '—'}</td>
                  <td>{a.username ? <code>{a.username}</code> : '—'}</td>
                  <td>{a.count}</td>
                  <td>{formatTzs(a.volume)}</td>
                </tr>
              ))}
            </DataTable>
          </section>
        </>
      ) : null}
    </div>
  )
}
