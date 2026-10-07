import { useEffect, useState, type FormEvent } from 'react'
import { apiRequest, ApiError } from '../api/client'
import { MoneyInput } from '../components/MoneyInput'
import { PageHeader } from '../components/PageHeader'
import { formatMoneyInput, parseMoneyInput, useApiResource } from '../lib/hooks'

type Settings = {
  defaultFare: string
  lockoutMinutes: string
  smsEnabled: string
  settlementFeeBps: string
}

export function SettingsPage() {
  const { data, error, loading, reload } =
    useApiResource<Settings>('/admin/settings')
  const [form, setForm] = useState<Settings>({
    defaultFare: '',
    lockoutMinutes: '',
    smsEnabled: 'true',
    settlementFeeBps: '',
  })
  const [formLoading, setFormLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (data) {
      setForm({
        ...data,
        defaultFare: formatMoneyInput(data.defaultFare),
      })
    }
  }, [data])

  async function onSave(event: FormEvent) {
    event.preventDefault()
    setFormLoading(true)
    setActionError(null)
    setActionSuccess(null)
    try {
      const updated = await apiRequest<Settings>('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          defaultFare: String(parseMoneyInput(form.defaultFare) || ''),
          lockoutMinutes: form.lockoutMinutes.trim(),
          smsEnabled: form.smsEnabled,
          settlementFeeBps: form.settlementFeeBps.trim(),
        }),
      })
      setForm({
        ...updated,
        defaultFare: formatMoneyInput(updated.defaultFare),
      })
      setActionSuccess('Settings saved')
      reload()
    } catch (err) {
      setActionError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Save failed',
      )
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Settings"
        actions={
          <button type="button" className="btn ghost sm" onClick={reload}>
            Refresh
          </button>
        }
      />

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {actionError ? <p className="error">{actionError}</p> : null}
      {actionSuccess ? <p className="success">{actionSuccess}</p> : null}

      <form className="card-form wide" onSubmit={onSave}>
        <div className="form-grid">
          <label>
            Default fare (TZS)
            <MoneyInput
              value={form.defaultFare}
              onChange={(defaultFare) =>
                setForm((f) => ({ ...f, defaultFare }))
              }
              required
            />
          </label>
          <label>
            Lockout minutes
            <input
              value={form.lockoutMinutes}
              onChange={(e) =>
                setForm((f) => ({ ...f, lockoutMinutes: e.target.value }))
              }
              required
            />
          </label>
          <label>
            SMS enabled
            <select
              value={form.smsEnabled}
              onChange={(e) =>
                setForm((f) => ({ ...f, smsEnabled: e.target.value }))
              }
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </label>
          <label>
            Settlement fee (bps)
            <input
              value={form.settlementFeeBps}
              onChange={(e) =>
                setForm((f) => ({ ...f, settlementFeeBps: e.target.value }))
              }
              required
            />
          </label>
        </div>
        <button className="btn primary" type="submit" disabled={formLoading}>
          {formLoading ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </div>
  )
}
