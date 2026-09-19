import { Navigate, useLocation } from 'react-router-dom'
import { CampusAccessDenied } from './campus/CampusPermissionUi.jsx'
import { canAccessCampusPath, isAuthenticated } from '../services/authService'

function ProtectedRoute({ children }) {
  const location = useLocation()

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!canAccessCampusPath(location.pathname)) {
    return <CampusAccessDenied />
  }

  return children
}

export default ProtectedRoute
