import { Navigate, useLocation } from 'react-router-dom'
import { isEmployeeAuthenticated } from '../services/employeeAuthService'
import { hasAnyEmployeeAppAccess, hasEmployeeAppAccess, isEmployeeCoordinator } from '../services/employeeAppAccess'

/**
 * Protects an employee route by app-access flag(s).
 * Coordinators always pass. Use `anyOf` for OR, `allOf` for AND.
 * When `coordinatorOnly` is true, only coordinators may enter.
 */
function EmployeeAppAccessRoute({ children, anyOf = [], allOf = [], coordinatorOnly = false }) {
  const location = useLocation()

  if (!isEmployeeAuthenticated()) {
    return <Navigate to="/employee/login" replace state={{ from: location }} />
  }

  if (coordinatorOnly) {
    if (!isEmployeeCoordinator()) {
      return <Navigate to="/employee/dashboard" replace />
    }
    return children
  }

  if (isEmployeeCoordinator()) return children

  const anyOk = anyOf.length === 0 || hasAnyEmployeeAppAccess(...anyOf)
  const allOk = allOf.length === 0 || allOf.every((flag) => hasEmployeeAppAccess(flag))

  if (!anyOk || !allOk) {
    return <Navigate to="/employee/dashboard" replace />
  }

  return children
}

export default EmployeeAppAccessRoute
