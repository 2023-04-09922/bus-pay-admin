import { useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError, apiRequest } from '../api/client'
import { PageHeader } from '../components/PageHeader'
import { useApiResource } from '../lib/hooks'

type MasterRow = {
  id: string
  username: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  status: string
  permissions: string[]
  onboarding?: 'PENDING_EMAIL' | 'EMAIL_SENT' | string
  emailSent?: boolean
  message?: string
}

type CatalogItem = {
  code: string
  group: string
  label: string
  sensitive: boolean
  adminOnly: boolean
}

const empty = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  nida: '',
}

export function MasterWakalaListPage() {
  const data = useApiResource<{ users: MasterRow[] }>('/admin/master-wakala')
  return (
    <div className="page">
      <PageHeader
        title="Master Wakala"
        actions={
          <Link to="/master-wakala/new" className="btn">
            Register
          </Link>
        }
      />
      {data.loading ? <p className="muted">Loading…</p> : null}
      {data.error ? <p className="error">{data.error}</p> : null}
      <div className="card">
        {(data.data?.users ?? []).map((user) => (
          <p key={user.id}>
            <Link to={`/master-wakala/${user.id}`}>
              {user.firstName} {user.lastName}
            </Link>{' '}
            <span className="muted">
              {user.onboarding === 'PENDING_EMAIL' ? 'Pending Email' : user.status}
            </span>
          </p>
        ))}
        {!data.loading && (data.data?.users.length ?? 0) === 0 ? (
          <p className="muted">No Master Wakala accounts yet.</p>
        ) : null}
      </div>
    </div>
  )
}

export function RegisterMasterWakalaPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [selected, setSelected] = useState<string[]>(['DASHBOARD_VIEW'])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const catalog = useApiResource<{ permissions: CatalogItem[] }>('/admin/permissions')
  const groups = useMemo(() => groupCatalog(catalog.data?.permissions ?? []), [catalog.data])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (needsWarning(catalog.data?.permissions ?? [], selected) && !window.confirm('Grant these sensitive permissions?')) {
      return
    }
    try {
      const created = await apiRequest<MasterRow>('/admin/master-wakala', {
        method: 'POST',
        body: JSON.stringify({ ...form, permissions: selected }),
      })
      const message =
        created.message ??
        (created.emailSent
          ? 'Master Wakala account created and onboarding email sent.'
          : 'Master Wakala account could not be fully onboarded because the onboarding email could not be sent.')
      setNotice(message)
      navigate(`/master-wakala/${created.id}`, {
        state: { message, emailSent: created.emailSent !== false },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account')
    }
  }

  return (
    <div className="page">
      <PageHeader title="Register Master Wakala" />
      <form className="card-form wide" onSubmit={onSubmit}>
        {error ? <p className="error">{error}</p> : null}
        {notice ? <p>{notice}</p> : null}
        <p className="muted">
          Sign-in uses email and password. BusPay emails a temporary password, and the Master Wakala must change it at the first sign-in.
        </p>
        <div className="form-grid">
          {(['firstName', 'lastName', 'email', 'phone', 'nida'] as const).map((key) => (
            <label key={key}>
              {key}
              <input
                value={form[key]}
                onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                required
              />
            </label>
          ))}
        </div>
        <PermissionChecks
          groups={groups}
          selected={selected}
          onChange={setSelected}
        />
        <button type="submit" className="btn">
          Create Master Wakala
        </button>
      </form>
    </div>
  )
}

export function MasterWakalaDetailPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const flashed = (location.state as { message?: string; emailSent?: boolean } | null) ?? null
  const detail = useApiResource<MasterRow>(id ? `/admin/master-wakala/${id}` : null)
  const catalog = useApiResource<{ permissions: CatalogItem[] }>('/admin/permissions')
  const [selected, setSelected] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const groups = useMemo(() => groupCatalog(catalog.data?.permissions ?? []), [catalog.data])
  const current = selected ?? detail.data?.permissions ?? []

  async function savePermissions() {
    if (needsWarning(catalog.data?.permissions ?? [], current) && !window.confirm('Grant these sensitive permissions?')) {
      return
    }
    setError(null)
    try {
      await apiRequest(`/admin/master-wakala/${id}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissions: current }),
      })
      setMessage('Permissions saved')
      detail.reload()
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Save failed')
    }
  }

  async function action(path: string) {
    setError(null)
    try {
      await apiRequest(path, { method: 'POST' })
      setMessage('Updated')
      detail.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  async function resendCredentials() {
    setError(null)
    try {
      const result = await apiRequest<{ message?: string; emailSent?: boolean }>(
        `/admin/master-wakala/${id}/credentials`,
        { method: 'POST' },
      )
      setMessage(
        result.message ??
          (result.emailSent
            ? 'Onboarding email sent.'
            : 'Master Wakala account could not be fully onboarded because the onboarding email could not be sent.'),
      )
      detail.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send credentials')
    }
  }

  const user = detail.data
  return (
    <div className="page">
      <PageHeader title={user ? `${user.firstName} ${user.lastName}` : 'Master Wakala'} />
      {detail.loading ? <p className="muted">Loading…</p> : null}
      {detail.error ? <p className="error">{detail.error}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {message ? <p>{message}</p> : null}
      {!message && flashed?.message ? (
        <p className={flashed.emailSent === false ? 'error' : undefined}>{flashed.message}</p>
      ) : null}
      {user ? (
        <div className="card">
          <p>{user.email}</p>
          <p>{user.phone}</p>
          <p>{user.onboarding === 'PENDING_EMAIL' ? 'Pending Email' : user.status}</p>
          <div className="row-actions">
            <button type="button" className="btn" onClick={resendCredentials}>
              Resend Credentials
            </button>
            {user.status === 'ACTIVE' ? (
              <button type="button" className="btn ghost" onClick={() => action(`/admin/master-wakala/${id}/block`)}>
                Block
              </button>
            ) : (
              <button type="button" className="btn ghost" onClick={() => action(`/admin/master-wakala/${id}/unblock`)}>
                Unblock
              </button>
            )}
            <button type="button" className="btn ghost" onClick={() => action(`/admin/master-wakala/${id}/deactivate`)}>
              Deactivate
            </button>
          </div>
          <PermissionChecks groups={groups} selected={current} onChange={setSelected} />
          <button type="button" className="btn" onClick={savePermissions}>
            Save Permissions
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function PermissionsPage() {
  const data = useApiResource<{ users: MasterRow[] }>('/admin/master-wakala')
  return (
    <div className="page">
      <PageHeader title="Permissions" />
      <p className="muted">
        Only an admin can change Master Wakala permissions. ADMIN keeps full access without individual rows.
      </p>
      {(data.data?.users ?? []).map((user) => (
        <p key={user.id}>
          <Link to={`/master-wakala/${user.id}`}>
            {user.firstName} {user.lastName}
          </Link>
        </p>
      ))}
    </div>
  )
}

function groupCatalog(items: CatalogItem[]) {
  const groups = new Map<string, CatalogItem[]>()
  for (const item of items) {
    const list = groups.get(item.group) ?? []
    list.push(item)
    groups.set(item.group, list)
  }
  return [...groups.entries()]
}

function needsWarning(items: CatalogItem[], selected: string[]) {
  return items.some((item) => item.sensitive && selected.includes(item.code) && !item.adminOnly)
}

function PermissionChecks({
  groups,
  selected,
  onChange,
}: {
  groups: [string, CatalogItem[]][]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <div>
      {groups.map(([group, items]) => (
        <fieldset key={group}>
          <legend>{group}</legend>
          {items.map((item) => (
            <label key={item.code}>
              <input
                type="checkbox"
                checked={selected.includes(item.code)}
                disabled={item.adminOnly}
                onChange={(event) => {
                  if (item.adminOnly) return
                  onChange(
                    event.target.checked
                      ? [...selected, item.code]
                      : selected.filter((code) => code !== item.code),
                  )
                }}
              />
              {item.label}
              {item.adminOnly ? ' (ADMIN only)' : ''}
              {item.sensitive && !item.adminOnly ? ' — privileged' : ''}
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  )
}
