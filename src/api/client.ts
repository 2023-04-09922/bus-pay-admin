import type { ApiErrorBody } from '../types'

const TOKEN_KEY = 'buspay_admin_token'
const USER_KEY = 'buspay_admin_user'

const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setSession(token: string, userJson: string) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, userJson)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredUserJson(): string | null {
  return localStorage.getItem(USER_KEY)
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function formatMessage(body: ApiErrorBody | null, fallback: string): string {
  if (!body?.message) return fallback
  return Array.isArray(body.message) ? body.message.join(', ') : body.message
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  const data = text ? (JSON.parse(text) as unknown) : null

  if (!response.ok) {
    const body = data as ApiErrorBody | null
    throw new ApiError(
      response.status,
      formatMessage(body, `Request failed (${response.status})`),
    )
  }

  return data as T
}
