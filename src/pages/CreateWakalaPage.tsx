import { useState, type FormEvent } from 'react'
import { apiRequest, ApiError } from '../api/client'
import type { CreateWakalaPayload, CreateWakalaResponse } from '../types'

const emptyForm: CreateWakalaPayload = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  nida: '',
  password: '',
}

type Props = { embedded?: boolean }

export function CreateWakalaPage({ embedded = false }: Props) {
  const [form, setForm] = useState<CreateWakalaPayload>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CreateWakalaResponse | null>(null)
  const [loading, setLoading] = useState(false)

  function update<K extends keyof CreateWakalaPayload>(
    key: K,
    value: CreateWakalaPayload[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const created = await apiRequest<CreateWakalaResponse>(
        '/auth/admin/wakala',
        {
          method: 'POST',
          body: JSON.stringify({
            ...form,
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            nida: form.nida.trim(),
          }),
        },
      )
      setResult(created)
      setForm(emptyForm)
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not register wakala',
      )
    } finally {
      setLoading(false)
    }
  }

  const formEl = (
    <form className="card-form wide" onSubmit={onSubmit}>
      <div className="form-grid">
        <label>
          First name
          <input
            value={form.firstName}
            onChange={(e) => update('firstName', e.target.value)}
            required
          />
        </label>
        <label>
          Last name
          <input
            value={form.lastName}
            onChange={(e) => update('lastName', e.target.value)}
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            required
          />
        </label>
        <label>
          Phone
          <input
            placeholder="+2557XXXXXXXX"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            required
          />
        </label>
        <label>
          NIDA
          <input
            value={form.nida}
            onChange={(e) => update('nida', e.target.value)}
            required
            minLength={20}
            maxLength={20}
          />
        </label>
        <label>
          Temporary password
          <input
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            required
            minLength={8}
          />
        </label>
      </div>

      <p className="muted">
        Password needs upper, lower, number, and symbol (8+ characters). Creates
        an ACTIVE agent who can sign in immediately.
      </p>

      {error ? <p className="error">{error}</p> : null}
      {result ? (
        <p className="success">
          {result.message}: <code>{result.username}</code> · till{' '}
          <code>{result.tillNumber}</code>
        </p>
      ) : null}

      <button className="btn primary" type="submit" disabled={loading}>
        {loading ? 'Creating…' : 'Create wakala'}
      </button>
    </form>
  )

  if (embedded) return formEl

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Register wakala</h1>
          <p>Creates an ACTIVE agent account for the mobile app.</p>
        </div>
      </header>
      {formEl}
    </div>
  )
}
