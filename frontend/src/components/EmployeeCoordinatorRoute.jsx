import { Navigate, useLocation } from 'react-router-dom'
import { isEmployeeAuthenticated, isEmployeeCoordinator } from '../services/employeeAuthService'

function EmployeeCoordinatorRoute({ children }) {
  const location = useLocation()

  if (!isEmployeeAuthenticated()) {
    return <Navigate to="/employee/login" replace state={{ from: location }} />
  }

  if (!isEmployeeCoordinator()) {
    return <Navigate to="/employee/dashboard" replace />
  }

  return children
}

export default EmployeeCoordinatorRoute
