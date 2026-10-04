import EmployeeLayout from '../../components/employee/EmployeeLayout'
import HeadMonitoringPage from '../Heads/HeadMonitoringPage'

export default function EmployeeCoordinatorMonitoringPage() {
  return (
    <EmployeeLayout title="Coordinator monitoring" compactContentTop hideAppBarSubtitle>
      <HeadMonitoringPage employeeShell />
    </EmployeeLayout>
  )
}
