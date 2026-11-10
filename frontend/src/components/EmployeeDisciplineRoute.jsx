import { Navigate, useLocation } from 'react-router-dom'
import { isEmployeeAuthenticated, isEmployeeDisciplineIncharge } from '../services/employeeAuthService'

function EmployeeDisciplineRoute({ children }) {
  const location = useLocation()

  if (!isEmployeeAuthenticated()) {
    return <Navigate to="/employee/login" replace state={{ from: location }} />
  }

  if (!isEmployeeDisciplineIncharge()) {
    return <Navigate to="/employee/dashboard" replace />
  }

  return children
}

export default EmployeeDisciplineRoute
