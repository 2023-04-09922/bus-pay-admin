import { useMemo, useState } from 'react'
import { apiRequest, ApiError } from '../api/client'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { formatDate, qs, useApiResource } from '../lib/hooks'

type AlertRow = {
  id: string
  type: string
  severity: string
  message: string
  entityType: string | null
  entityId: string | null
  status: string
  createdAt: string
  ackedAt: string | null
}

type AlertsResponse = {
  page: number
  limit: number
  total: number
  alerts: AlertRow[]
}

function severityBadge(severity: string) {
  if (severity === 'CRITICAL') return 'bad'
  if (severity === 'WARNING') return 'warn'
  return 'ok'
}

export function AlertsPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const path = useMemo(
    () => `/admin/alerts${qs({ status, page, limit: 50 })}`,
    [status, page],
  )
  const { data, error, loading, reload } =
    useApiResource<AlertsResponse>(path)

  async function syncAlerts() {
    setSyncing(true)
    setActionError(null)
    setActionSuccess(null)
    try {
      const result = await apiRequest<{
        smsFailed: number
        lockedUsers: number
        created: Array<{ type: string; id: string }>
      }>('/admin/alerts/sync', { method: 'POST' })
      setActionSuccess(
        result.created.length
          ? `Synced: created ${result.created.map((c) => c.type).join(', ')}`
          : `Synced: no new alerts (SMS failed ${result.smsFailed}, locked ${result.lockedUsers})`,
      )
      reload()
    } catch (err) {
      setActionError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Sync failed',
      )
    } finally {
      setSyncing(false)
    }
  }

  async function ackAlert(id: string) {
    setBusyId(id)
    setActionError(null)
    setActionSuccess(null)
    try {
      await apiRequest(`/admin/alerts/${id}/ack`, { method: 'POST' })
      setActionSuccess('Alert acknowledged')
      reload()
    } catch (err) {
      setActionError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Ack failed',
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Alerts"
        actions={
          <button
            type="button"
            className="btn primary sm"
            disabled={syncing}
            onClick={syncAlerts}
          >
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
        }
      />

      <div className="toolbar">
        <select
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value)
          }}
        >
          <option value="">All statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="ACKED">ACKED</option>
        </select>
      </div>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {actionError ? <p className="error">{actionError}</p> : null}
      {actionSuccess ? <p className="success">{actionSuccess}</p> : null}

      <DataTable
        columns={[
          'Type',
          'Severity',
          'Message',
          'Status',
          'Created',
          'Acked',
          'Actions',
        ]}
        empty={!loading && (data?.alerts.length ?? 0) === 0}
      >
        {data?.alerts.map((a) => (
          <tr key={a.id}>
            <td>
              <code>{a.type}</code>
            </td>
            <td>
              <span className={`badge ${severityBadge(a.severity)}`}>
                {a.severity}
              </span>
            </td>
            <td>{a.message}</td>
            <td>
              <span
                className={`badge ${a.status === 'OPEN' ? 'warn' : 'ok'}`}
              >
                {a.status}
              </span>
            </td>
            <td>{formatDate(a.createdAt)}</td>
            <td>{a.ackedAt ? formatDate(a.ackedAt) : '—'}</td>
            <td>
              <div className="row-actions">
                {a.status === 'OPEN' ? (
                  <button
                    type="button"
                    className="btn primary sm"
                    disabled={busyId === a.id}
                    onClick={() => ackAlert(a.id)}
                  >
                    Ack
                  </button>
                ) : null}
              </div>
            </td>
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
