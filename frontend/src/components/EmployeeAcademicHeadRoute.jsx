import { Navigate, useLocation } from 'react-router-dom'
import { isEmployeeAuthenticated, isEmployeeAcademicHead } from '../services/employeeAuthService'

function EmployeeAcademicHeadRoute({ children }) {
  const location = useLocation()

  if (!isEmployeeAuthenticated()) {
    return <Navigate to="/employee/login" replace state={{ from: location }} />
  }

  if (!isEmployeeAcademicHead()) {
    return <Navigate to="/employee/dashboard" replace />
  }

  return children
}

export default EmployeeAcademicHeadRoute
