import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth'
import { subscribePush } from './lib/push'
import Onboarding from './components/Onboarding'
import VendorDashboard from './pages/VendorDashboard'
import RiderDashboard from './pages/RiderDashboard'
import TrackingPage from './pages/TrackingPage'
import AdminPage from './pages/AdminPage'
import WalletPage from './pages/WalletPage'
import HistoryPage from './pages/HistoryPage'
import RatingsPage from './pages/RatingsPage'
import SettingsPage from './pages/SettingsPage'
import InstallPrompt from './components/InstallPrompt'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RoleRoute({ role, children }: { role: string; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user || user.role !== role) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)

  // Register for Web Push once authenticated (best-effort).
  useEffect(() => {
    if (token) subscribePush()
  }, [token])

  return (
    <>
      <Routes>
      <Route path="/login" element={<Onboarding />} />
      <Route path="/track/:slug" element={<TrackingPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            {user?.role === 'rider' ? (
              <Navigate to="/rider" replace />
            ) : (
              <Navigate to="/vendor" replace />
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendor"
        element={
          <ProtectedRoute>
            <RoleRoute role="vendor">
              <VendorDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/rider"
        element={
          <ProtectedRoute>
            <RoleRoute role="rider">
              <RiderDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/wallet"
        element={
          <ProtectedRoute>
            <WalletPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ratings"
        element={
          <ProtectedRoute>
            <RatingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    <InstallPrompt />
    </>
  )
}
