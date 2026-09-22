import { useMemo, useState } from 'react'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { formatDate, qs, useApiResource } from '../lib/hooks'

type AuditRow = {
  id: string
  action: string
  entityType: string
  entityId: string | null
  createdAt: string
  actor: {
    id: string
    username: string
    firstName: string
    lastName: string
    role: string
  }
}

type AuditResponse = {
  page: number
  limit: number
  total: number
  logs: AuditRow[]
}

export function AuditPage() {
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)

  const path = useMemo(
    () => `/admin/audit-logs${qs({ action, page, limit: 50 })}`,
    [action, page],
  )
  const { data, error, loading } = useApiResource<AuditResponse>(path)

  return (
    <div className="page">
      <PageHeader
        title="Audit log"
        description="Admin and system actions across entities."
      />

      <div className="toolbar">
        <input
          placeholder="Filter by action (e.g. CARD_FREEZE)…"
          value={action}
          onChange={(e) => {
            setPage(1)
            setAction(e.target.value)
          }}
        />
      </div>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <DataTable
        columns={['Action', 'Entity', 'Entity ID', 'Actor', 'Created']}
        empty={!loading && (data?.logs.length ?? 0) === 0}
      >
        {data?.logs.map((log) => (
          <tr key={log.id}>
            <td>
              <code>{log.action}</code>
            </td>
            <td>{log.entityType}</td>
            <td>
              {log.entityId ? <code>{log.entityId}</code> : '—'}
            </td>
            <td>
              {log.actor.firstName} {log.actor.lastName}
              <br />
              <span className="muted">{log.actor.username}</span>
            </td>
            <td>{formatDate(log.createdAt)}</td>
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
