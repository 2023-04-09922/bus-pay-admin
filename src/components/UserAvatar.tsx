import { useEffect, useState } from 'react'
import { getToken } from '../api/client'

const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'
const cache = new Map<string, string>()

function initials(firstName: string, lastName: string) {
  const a = firstName.trim().charAt(0)
  const b = lastName.trim().charAt(0)
  return `${a}${b}`.toUpperCase() || 'BP'
}

export function UserAvatar({
  id,
  firstName,
  lastName,
  hasPhoto,
  updatedAt,
}: {
  id: string
  firstName: string
  lastName: string
  hasPhoto?: boolean
  updatedAt?: string | null
}) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!hasPhoto) {
      setSrc(null)
      return
    }
    const key = `${id}:${updatedAt ?? ''}`
    const cached = cache.get(key)
    if (cached) {
      setSrc(cached)
      return
    }
    const token = getToken()
    if (!token) return
    let cancelled = false
    const version = updatedAt ? `?v=${encodeURIComponent(updatedAt)}` : ''
    fetch(`${baseUrl}/admin/users/${id}/profile-photo${version}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (!blob || cancelled) return
        const url = URL.createObjectURL(blob)
        cache.set(key, url)
        setSrc(url)
      })
      .catch(() => {
        if (!cancelled) setSrc(null)
      })
    return () => {
      cancelled = true
    }
  }, [id, hasPhoto, updatedAt])

  if (!src) {
    return <span className="avatar-fallback">{initials(firstName, lastName)}</span>
  }
  return <img className="avatar-thumb" src={src} alt="" />
}
