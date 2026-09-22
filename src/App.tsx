import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { DashboardLayout } from './components/DashboardLayout'
import { AuditPage } from './pages/AuditPage'
import { CardsPage } from './pages/CardsPage'
import { ConductorsPage } from './pages/ConductorsPage'
import { HealthPage } from './pages/HealthPage'
import { LoginPage } from './pages/LoginPage'
import { OverviewPage } from './pages/OverviewPage'
import { TopUpsPage } from './pages/TopUpsPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { WakalaPage } from './pages/WakalaPage'
import { WalletsPage } from './pages/WalletsPage'
import { PassengersPage } from './pages/PassengersPage'
import { WithdrawalsPage } from './pages/WithdrawalsPage'
import { RefundsPage } from './pages/RefundsPage'
import { SettlementsPage } from './pages/SettlementsPage'
import { ReportsPage } from './pages/ReportsPage'
import { AlertsPage } from './pages/AlertsPage'
import { SecurityPage } from './pages/SecurityPage'
import { SettingsPage } from './pages/SettingsPage'

function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
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
        <Route index element={<OverviewPage />} />
        <Route path="passengers" element={<PassengersPage />} />
        <Route path="conductors" element={<ConductorsPage />} />
        <Route path="wakala" element={<WakalaPage />} />
        <Route path="cards" element={<CardsPage />} />
        <Route path="wallets" element={<WalletsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="topups" element={<TopUpsPage />} />
        <Route path="withdrawals" element={<WithdrawalsPage />} />
        <Route path="refunds" element={<RefundsPage />} />
        <Route path="settlements" element={<SettlementsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="health" element={<HealthPage />} />
        <Route path="security" element={<SecurityPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
