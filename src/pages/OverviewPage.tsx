import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest, ApiError } from '../api/client'
import type { OverviewResponse } from '../types'

function formatTzs(amount: number) {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function OverviewPage() {
  const [data, setData] = useState<OverviewResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const overview = await apiRequest<OverviewResponse>('/admin/overview')
        if (!cancelled) setData(overview)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError || err instanceof Error
              ? err.message
              : 'Failed to load overview',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Overview</h1>
          <p>Live counts and today’s volume from the BusPay API.</p>
        </div>
        <Link className="btn primary" to="/wakala">
          Register wakala
        </Link>
      </header>

      {loading ? <p className="muted">Loading overview…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {data ? (
        <>
          <section className="stat-grid">
            <article className="stat">
              <span>Wakala (agents)</span>
              <strong>{data.counts.agents}</strong>
            </article>
            <article className="stat">
              <span>Conductors</span>
              <strong>{data.counts.conductors}</strong>
            </article>
            <article className="stat">
              <span>Active cards</span>
              <strong>{data.counts.activeCards}</strong>
            </article>
            <article className="stat">
              <span>Active wallets</span>
              <strong>{data.counts.activeWallets}</strong>
            </article>
            <article className="stat">
              <span>Suspended users</span>
              <strong>{data.counts.suspendedUsers}</strong>
            </article>
            <article className="stat">
              <span>Locked accounts</span>
              <strong>{data.counts.lockedUsers}</strong>
            </article>
          </section>

          <section className="panel">
            <h2>Today</h2>
            <div className="stat-grid two">
              <article className="stat">
                <span>Tap volume</span>
                <strong>{formatTzs(data.today.tapVolume)}</strong>
                <small>{data.today.tapCount} taps</small>
              </article>
              <article className="stat">
                <span>Top-up volume</span>
                <strong>{formatTzs(data.today.topUpVolume)}</strong>
                <small>{data.today.topUpCount} top-ups</small>
              </article>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
