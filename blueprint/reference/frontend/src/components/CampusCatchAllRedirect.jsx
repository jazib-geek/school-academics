import { Navigate, useLocation } from 'react-router-dom'
import { getCampusLandingPath, isAuthenticated } from '../services/authService'

/** Unknown routes: stay in-app when logged in (do not dump to login). */
export default function CampusCatchAllRedirect() {
  const location = useLocation()
  if (isAuthenticated()) {
    return <Navigate to={getCampusLandingPath()} replace />
  }
  return <Navigate to="/login" replace state={{ from: location }} />
}
