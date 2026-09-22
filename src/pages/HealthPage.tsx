import { PageHeader } from '../components/PageHeader'
import { useApiResource } from '../lib/hooks'

type HealthResponse = {
  status: string
  database: {
    status: string
    database?: string
    schema?: string
    user?: string
    responseTimeMs?: number
  }
  smsOutbox: {
    pending: number
    failed: number
  }
}

export function HealthPage() {
  const { data, error, loading, reload } =
    useApiResource<HealthResponse>('/admin/health')

  const dbUp = data?.database.status === 'up'

  return (
    <div className="page">
      <PageHeader
        title="Health"
        description="Database connectivity and SMS outbox backlog."
        actions={
          <button type="button" className="btn ghost sm" onClick={reload}>
            Refresh
          </button>
        }
      />

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {data ? (
        <>
          <section className="stat-grid">
            <article className="stat">
              <span>Overall</span>
              <strong>
                <span
                  className={`badge ${data.status === 'ok' ? 'ok' : 'bad'}`}
                >
                  {data.status}
                </span>
              </strong>
            </article>
            <article className="stat">
              <span>Database</span>
              <strong>
                <span className={`badge ${dbUp ? 'ok' : 'bad'}`}>
                  {data.database.status}
                </span>
              </strong>
              {data.database.responseTimeMs != null ? (
                <small>{data.database.responseTimeMs} ms</small>
              ) : null}
            </article>
            <article className="stat">
              <span>SMS pending</span>
              <strong>{data.smsOutbox.pending}</strong>
            </article>
            <article className="stat">
              <span>SMS failed</span>
              <strong>
                <span
                  className={`badge ${data.smsOutbox.failed > 0 ? 'bad' : 'ok'}`}
                >
                  {data.smsOutbox.failed}
                </span>
              </strong>
            </article>
          </section>

          <section className="panel">
            <h2>Database</h2>
            {dbUp ? (
              <p className="muted">
                {data.database.database ?? '—'} · schema{' '}
                {data.database.schema ?? '—'} · user{' '}
                {data.database.user ?? '—'}
                {data.database.responseTimeMs != null
                  ? ` · ${data.database.responseTimeMs} ms`
                  : ''}
              </p>
            ) : (
              <p className="error">Database is unreachable.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
