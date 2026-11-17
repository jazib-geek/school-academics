import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/Auth/LoginPage.jsx'
import DashboardPage from './pages/Campus/dashboard/DashboardPage.jsx'
import CampusActivityLogsPage from './pages/Campus/activity-logs/CampusActivityLogsPage.jsx'
import CampusDesignationsPage from './pages/Campus/designations/CampusDesignationsPage.jsx'
import CampusUsersPage from './pages/Campus/users/CampusUsersPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import CampusCatchAllRedirect from './components/CampusCatchAllRedirect.jsx'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/campus/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/activity-logs"
        element={
          <ProtectedRoute>
            <CampusActivityLogsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/designations"
        element={
          <ProtectedRoute>
            <CampusDesignationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/users"
        element={
          <ProtectedRoute>
            <CampusUsersPage />
          </ProtectedRoute>
        }
      />
      <Route path="/dashboard" element={<Navigate to="/campus/dashboard" replace />} />
      <Route path="*" element={<CampusCatchAllRedirect />} />
    </Routes>
  )
}

export default App
