import { Briefcase } from 'lucide-react'
import NamedLookupCrudPage from './NamedLookupCrudPage.jsx'
import {
  createOccupation,
  getOccupations,
  setOccupationStatus,
  updateOccupation,
} from '../../../services/campusSettingsService'

export default function CampusOccupationsPage() {
  return (
    <NamedLookupCrudPage
      title="Occupations"
      subtitle="Parent occupation list for admission forms."
      icon={Briefcase}
      nameLabel="Occupation"
      managePermission="param_occ"
      loadRows={getOccupations}
      createRow={createOccupation}
      updateRow={updateOccupation}
      setStatus={setOccupationStatus}
    />
  )
}
