import { useCallback, useEffect, useState } from 'react'
import { apiRequest, ApiError } from '../api/client'

type UseListResult<T> = {
  data: T | null
  error: string | null
  loading: boolean
  reload: () => void
}

export function useApiResource<T>(
  path: string | null,
  deps: unknown[] = [],
): UseListResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(path))
  const [tick, setTick] = useState(0)

  const reload = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    if (!path) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const result = await apiRequest<T>(path)
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError || err instanceof Error
              ? err.message
              : 'Request failed',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps])

  return { data, error, loading, reload }
}

export function formatTzs(amount: number) {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(value: string | Date) {
  return new Date(value).toLocaleString()
}

export function qs(
  params: Record<string, string | number | undefined | null>,
) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}
