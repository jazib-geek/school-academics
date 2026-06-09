import { Navigate, useLocation } from 'react-router-dom'
import { isAcademicAuthenticated } from '../services/academicAuthService'

function AcademicProtectedRoute({ children }) {
  const location = useLocation()

  if (!isAcademicAuthenticated()) {
    return <Navigate to="/academics/login" replace state={{ from: location }} />
  }

  return children
}

export default AcademicProtectedRoute
