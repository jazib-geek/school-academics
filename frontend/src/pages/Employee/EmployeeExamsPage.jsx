import EmployeeBackButton from '../../components/employee/EmployeeBackButton'
import EmployeeLayout from '../../components/employee/EmployeeLayout'
import CampusStudentResultPage from '../Campus/exams/CampusStudentResultPage'

function EmployeeExamsPage() {
  return (
    <EmployeeLayout title="Exams" subtitle="Student exam results" showProfileCard={false} compactContentTop>
      <div className="space-y-3">
        <EmployeeBackButton />
        <CampusStudentResultPage embedded showSearchForm />
      </div>
    </EmployeeLayout>
  )
}

export default EmployeeExamsPage
