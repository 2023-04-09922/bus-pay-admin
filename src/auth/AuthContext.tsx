import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  apiRequest,
  ApiError,
  clearSession,
  getStoredUserJson,
  getToken,
  setSession,
} from '../api/client'
import type { AdminUser, LoginResponse } from '../types'

type AuthContextValue = {
  user: AdminUser | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readUser(): AdminUser | null {
  const raw = getStoredUserJson()
  if (!raw) return null
  try {
    return JSON.parse(raw) as AdminUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getToken())
  const [user, setUser] = useState<AdminUser | null>(() => readUser())

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiRequest<LoginResponse>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    if (result.user.role !== 'admin' && result.user.role !== 'master_agent') {
      throw new Error('This account cannot access the control center')
    }

    setSession(result.accessToken, JSON.stringify(result.user))
    setToken(result.accessToken)
    setUser(result.user)
  }, [])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const session = await apiRequest<{ user: AdminUser }>('/auth/admin/session')
        if (cancelled) return
        if (session.user.role !== 'admin' && session.user.role !== 'master_agent') {
          throw new Error('This account cannot access the control center')
        }
        setSession(token, JSON.stringify(session.user))
        setUser(session.user)
      } catch (error) {
        if (cancelled) return
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          clearSession()
          setToken(null)
          setUser(null)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const logout = useCallback(() => {
    clearSession()
    setToken(null)
    setUser(null)
  }, [])

  const refreshSession = useCallback(async () => {
    const current = getToken()
    if (!current) return
    const session = await apiRequest<{ user: AdminUser }>('/auth/admin/session')
    setSession(current, JSON.stringify(session.user))
    setToken(current)
    setUser(session.user)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      refreshSession,
    }),
    [user, token, login, logout, refreshSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
