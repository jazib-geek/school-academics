import { ListOrdered } from 'lucide-react'
import NamedLookupCrudPage from '../settings/NamedLookupCrudPage.jsx'
import {
  createExamType,
  deleteExamType,
  getManageExamTypes,
  moveExamType,
  setExamTypeStatus,
  updateExamType,
} from '../../../services/examService'

export default function CampusExamTypesPage() {
  return (
    <NamedLookupCrudPage
      title="Exam Types"
      subtitle="Names used on exam screens. Use the arrows to set the order."
      icon={ListOrdered}
      nameLabel="Exam type name"
      managePermission="exam_type"
      sortBy="priority"
      moveRow={moveExamType}
      loadRows={getManageExamTypes}
      createRow={createExamType}
      updateRow={updateExamType}
      setStatus={setExamTypeStatus}
      deleteRow={deleteExamType}
    />
  )
}
