import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { DashboardLayout } from './components/DashboardLayout'
import { canAccess } from './nav'
import { AuditPage } from './pages/AuditPage'
import { CardsPage } from './pages/CardsPage'
import { ConductorsPage } from './pages/ConductorsPage'
import { CompanyFinancePage } from './pages/CompanyFinancePage'
import { CreateWakalaPage } from './pages/CreateWakalaPage'
import { FinancialPage } from './pages/FinancialPage'
import { HealthPage } from './pages/HealthPage'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import { LoginPage } from './pages/LoginPage'
import { OverviewPage } from './pages/OverviewPage'
import { TopUpsPage } from './pages/TopUpsPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { WakalaPage } from './pages/WakalaPage'
import { WalletsPage } from './pages/WalletsPage'
import { PassengersPage } from './pages/PassengersPage'
import { DepositsPage } from './pages/DepositsPage'
import { PayoutsPage } from './pages/PayoutsPage'
import { WithdrawalsPage } from './pages/WithdrawalsPage'
import { RefundsPage } from './pages/RefundsPage'
import { SettlementsPage } from './pages/SettlementsPage'
import { ReportsPage } from './pages/ReportsPage'
import { AlertsPage } from './pages/AlertsPage'
import { SecurityPage } from './pages/SecurityPage'
import { SettingsPage } from './pages/SettingsPage'
import { UnauthorizedPage } from './pages/UnauthorizedPage'
import { ProfilePage } from './pages/ProfilePage'
import { SmsPage } from './pages/SmsPage'
import {
  MasterWakalaDetailPage,
  MasterWakalaListPage,
  PermissionsPage,
  RegisterMasterWakalaPage,
} from './pages/MasterWakalaPages'

function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  if (user?.mustChangePassword) {
    return <ChangePasswordPage />
  }
  return children
}

function Permit({
  codes,
  children,
}: {
  codes: string[]
  children: React.ReactNode
}) {
  const { user } = useAuth()
  if (!canAccess(user?.role, user?.permissions, codes)) {
    return <UnauthorizedPage />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <DashboardLayout />
          </Protected>
        }
      >
        <Route index element={<Permit codes={['DASHBOARD_VIEW']}><OverviewPage /></Permit>} />
        <Route path="passengers" element={<Permit codes={['PERMISSION_MANAGE']}><PassengersPage /></Permit>} />
        <Route path="conductors" element={<Permit codes={['CONDUCTOR_VIEW', 'CONDUCTOR_CREATE']}><ConductorsPage /></Permit>} />
        <Route path="wakala" element={<Permit codes={['WAKALA_VIEW']}><WakalaPage /></Permit>} />
        <Route path="wakala/register" element={<Permit codes={['WAKALA_CREATE']}><CreateWakalaPage /></Permit>} />
        <Route path="cards" element={<Permit codes={['CARD_VIEW', 'CARD_REPLACE']}><CardsPage /></Permit>} />
        <Route path="wallets" element={<Permit codes={['PERMISSION_MANAGE']}><WalletsPage /></Permit>} />
        <Route path="transactions" element={<Permit codes={['PERMISSION_MANAGE']}><TransactionsPage /></Permit>} />
        <Route path="topups" element={<Permit codes={['PERMISSION_MANAGE']}><TopUpsPage /></Permit>} />
        <Route path="withdrawals" element={<Permit codes={['PAYOUT_VIEW']}><WithdrawalsPage /></Permit>} />
        <Route path="payouts" element={<Permit codes={['PAYOUT_VIEW']}><PayoutsPage /></Permit>} />
        <Route path="deposits" element={<Permit codes={['MOBILE_MONEY_VIEW']}><DepositsPage /></Permit>} />
        <Route path="financial" element={<Permit codes={['FINANCIAL_REVENUE_VIEW', 'FINANCIAL_LEDGER_VIEW', 'FINANCIAL_RECONCILIATION_VIEW', 'FINANCIAL_COMMISSION_VIEW']}><FinancialPage /></Permit>} />
        <Route path="company-finance" element={<Permit codes={['FINANCIAL_COMPANY_VIEW']}><CompanyFinancePage /></Permit>} />
        <Route path="refunds" element={<Permit codes={['PERMISSION_MANAGE']}><RefundsPage /></Permit>} />
        <Route path="settlements" element={<Permit codes={['PERMISSION_MANAGE']}><SettlementsPage /></Permit>} />
        <Route path="reports" element={<Permit codes={['REPORT_WAKALA_VIEW', 'REPORT_CONDUCTOR_VIEW']}><ReportsPage /></Permit>} />
        <Route path="alerts" element={<Permit codes={['DASHBOARD_VIEW']}><AlertsPage /></Permit>} />
        <Route path="audit" element={<Permit codes={['AUDIT_LOG_VIEW']}><AuditPage /></Permit>} />
        <Route path="health" element={<Permit codes={['DASHBOARD_VIEW']}><HealthPage /></Permit>} />
        <Route path="security" element={<Permit codes={['PERMISSION_MANAGE']}><SecurityPage /></Permit>} />
        <Route path="settings" element={<Permit codes={['SYSTEM_SETTINGS_VIEW', 'SYSTEM_SETTINGS_UPDATE']}><SettingsPage /></Permit>} />
        <Route path="sms" element={<Permit codes={['SMS_VIEW', 'SMS_SEND']}><SmsPage /></Permit>} />
        <Route path="master-wakala" element={<Permit codes={['MASTER_WAKALA_VIEW']}><MasterWakalaListPage /></Permit>} />
        <Route path="master-wakala/new" element={<Permit codes={['MASTER_WAKALA_CREATE']}><RegisterMasterWakalaPage /></Permit>} />
        <Route path="master-wakala/:id" element={<Permit codes={['MASTER_WAKALA_VIEW']}><MasterWakalaDetailPage /></Permit>} />
        <Route path="permissions" element={<Permit codes={['PERMISSION_MANAGE']}><PermissionsPage /></Permit>} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="unauthorized" element={<UnauthorizedPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
