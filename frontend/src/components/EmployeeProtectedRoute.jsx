import { Navigate, useLocation } from 'react-router-dom'
import { isEmployeeAuthenticated } from '../services/employeeAuthService'

function EmployeeProtectedRoute({ children }) {
  const location = useLocation()

  if (!isEmployeeAuthenticated()) {
    return <Navigate to="/employee/login" replace state={{ from: location }} />
  }

  return children
}

export default EmployeeProtectedRoute
