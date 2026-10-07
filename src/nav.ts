export type NavItem = {
  to: string
  label: string
  end?: boolean
  anyOf: string[]
}

export type NavSection = {
  label: string
  items: NavItem[]
}

export const NAV: NavSection[] = [
  {
    label: '',
    items: [{ to: '/', label: 'Dashboard', end: true, anyOf: ['DASHBOARD_VIEW'] }],
  },
  {
    label: 'OPERATIONS',
    items: [
      { to: '/wakala', label: 'Wakala', anyOf: ['WAKALA_VIEW'] },
      { to: '/wakala/register', label: 'Register Wakala', anyOf: ['WAKALA_CREATE'] },
      { to: '/conductors', label: 'Conductors', anyOf: ['CONDUCTOR_VIEW', 'CONDUCTOR_CREATE'] },
      { to: '/cards', label: 'D-Cards', anyOf: ['CARD_VIEW', 'CARD_REPLACE'] },
    ],
  },
  {
    label: 'MASTER WAKALA',
    items: [
      { to: '/master-wakala', label: 'Master Wakala List', end: true, anyOf: ['MASTER_WAKALA_VIEW'] },
      { to: '/master-wakala/new', label: 'Register Master Wakala', anyOf: ['MASTER_WAKALA_CREATE'] },
    ],
  },
  {
    label: 'REPORTS',
    items: [
      { to: '/reports', label: 'Wakala Reports', anyOf: ['REPORT_WAKALA_VIEW'] },
      { to: '/reports', label: 'Conductor Reports', anyOf: ['REPORT_CONDUCTOR_VIEW'] },
    ],
  },
  {
    label: 'PAYMENTS',
    items: [
      { to: '/deposits', label: 'Mobile Money', anyOf: ['MOBILE_MONEY_VIEW'] },
      { to: '/payouts', label: 'Payouts', anyOf: ['PAYOUT_VIEW'] },
    ],
  },
  {
    label: 'FINANCIAL',
    items: [
      { to: '/financial', label: 'Revenue', anyOf: ['FINANCIAL_REVENUE_VIEW'] },
      { to: '/financial#ledger', label: 'Ledger', anyOf: ['FINANCIAL_LEDGER_VIEW'] },
      { to: '/financial#reconciliation', label: 'Reconciliation', anyOf: ['FINANCIAL_RECONCILIATION_VIEW'] },
      { to: '/company-finance', label: 'Company Finance', anyOf: ['FINANCIAL_COMPANY_VIEW'] },
      { to: '/financial#commissions', label: 'Wakala Commissions', anyOf: ['FINANCIAL_COMMISSION_VIEW'] },
    ],
  },
  {
    label: 'RECORDS',
    items: [
      { to: '/passengers', label: 'Passengers', anyOf: ['PERMISSION_MANAGE'] },
      { to: '/wallets', label: 'Wallets', anyOf: ['PERMISSION_MANAGE'] },
      { to: '/transactions', label: 'Transactions', anyOf: ['PERMISSION_MANAGE'] },
      { to: '/topups', label: 'Top-ups', anyOf: ['PERMISSION_MANAGE'] },
      { to: '/withdrawals', label: 'Withdrawals', anyOf: ['PAYOUT_VIEW'] },
      { to: '/refunds', label: 'Refunds', anyOf: ['PERMISSION_MANAGE'] },
      { to: '/settlements', label: 'Settlements', anyOf: ['PERMISSION_MANAGE'] },
      { to: '/alerts', label: 'Alerts', anyOf: ['DASHBOARD_VIEW'] },
      { to: '/health', label: 'Health', anyOf: ['DASHBOARD_VIEW'] },
      { to: '/security', label: 'Security', anyOf: ['PERMISSION_MANAGE'] },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { to: '/sms', label: 'SMS', anyOf: ['SMS_VIEW', 'SMS_SEND'] },
      { to: '/settings', label: 'Settings', anyOf: ['SYSTEM_SETTINGS_VIEW', 'SYSTEM_SETTINGS_UPDATE'] },
    ],
  },
  {
    label: 'SECURITY',
    items: [
      { to: '/audit', label: 'Audit Logs', anyOf: ['AUDIT_LOG_VIEW'] },
      { to: '/permissions', label: 'Permissions', anyOf: ['PERMISSION_MANAGE'] },
    ],
  },
]

export function roleLabel(role: string | undefined): string {
  if (role === 'admin') return 'ADMIN'
  if (role === 'master_agent') return 'MASTER WAKALA'
  return role ? role.toUpperCase() : ''
}

export function canAccess(
  role: string | undefined,
  permissions: string[] | undefined,
  codes: string[],
): boolean {
  if (!codes.length) return true
  if (role === 'admin') return true
  return codes.some((code) => permissions?.includes(code))
}

export function visibleNav(
  role: string | undefined,
  permissions: string[] | undefined,
): NavSection[] {
  return NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      canAccess(role, permissions, item.anyOf),
    ),
  })).filter((section) => section.items.length > 0)
}
