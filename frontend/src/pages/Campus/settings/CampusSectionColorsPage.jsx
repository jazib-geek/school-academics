import { Palette } from 'lucide-react'
import NamedLookupCrudPage from './NamedLookupCrudPage.jsx'
import {
  createSectionColor,
  deleteSectionColor,
  getSectionColors,
  setSectionColorStatus,
  updateSectionColor,
} from '../../../services/campusSettingsService'

export default function CampusSectionColorsPage() {
  return (
    <NamedLookupCrudPage
      title="Section Colors"
      subtitle="Colors / boards used when building class sections."
      icon={Palette}
      nameLabel="Section color name"
      managePermission="param_section_color"
      loadRows={getSectionColors}
      createRow={createSectionColor}
      updateRow={updateSectionColor}
      setStatus={setSectionColorStatus}
      deleteRow={deleteSectionColor}
    />
  )
}
