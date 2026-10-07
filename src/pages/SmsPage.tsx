import { useApiResource } from '../lib/hooks'

export function SmsPage() {
  const data = useApiResource<unknown>('/admin/sms/providers')
  return (
    <div className="page">
      <h1>SMS</h1>
      {data.loading ? <p className="muted">Loading…</p> : null}
      {data.error ? <p className="error">{data.error}</p> : null}
      {data.data ? <pre>{JSON.stringify(data.data, null, 2)}</pre> : null}
    </div>
  )
}
