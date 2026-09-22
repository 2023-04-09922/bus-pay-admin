import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  apiRequest,
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

    if (result.user.role !== 'admin') {
      throw new Error('Only admin accounts can access this dashboard')
    }

    setSession(result.accessToken, JSON.stringify(result.user))
    setToken(result.accessToken)
    setUser(result.user)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
    }),
    [user, token, login, logout],
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
