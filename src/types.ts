export type AdminUser = {
  id: string
  username: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  role: string
  tillNumber: string | null
}

export type LoginResponse = {
  message: string
  accessToken: string
  user: AdminUser
}

export type OverviewResponse = {
  counts: {
    agents: number
    conductors: number
    activeCards: number
    activeWallets: number
    suspendedUsers: number
    lockedUsers: number
  }
  today: {
    tapVolume: number
    tapCount: number
    topUpVolume: number
    topUpCount: number
  }
}

export type CreateWakalaPayload = {
  firstName: string
  lastName: string
  email: string
  phone: string
  nida: string
  password: string
}

export type CreateWakalaResponse = {
  message: string
  username: string
  role: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  tillNumber: string | null
}

export type ApiErrorBody = {
  message?: string | string[]
  statusCode?: number
}
