import { Award } from 'lucide-react'
import NamedLookupCrudPage from './NamedLookupCrudPage.jsx'
import {
  createDegree,
  getDegrees,
  setDegreeStatus,
  updateDegree,
} from '../../../services/campusSettingsService'

export default function CampusDegreesPage() {
  return (
    <NamedLookupCrudPage
      title="Degrees"
      subtitle="Qualification list used on admission forms."
      icon={Award}
      nameLabel="Degree title"
      managePermission="param_degree"
      loadRows={getDegrees}
      createRow={createDegree}
      updateRow={updateDegree}
      setStatus={setDegreeStatus}
      emptyForm={{ name: '', type: '', isActive: true }}
      mapFormFromRow={(row) => ({
        name: row.name || '',
        type: row.type || '',
        isActive: row.isActive ?? true,
      })}
      buildPayload={(form) => ({
        name: form.name.trim(),
        type: form.type?.trim() || null,
        isActive: Boolean(form.isActive),
      })}
      extraColumns={[
        { key: 'type', label: 'Type', render: (row) => row.type || '—' },
      ]}
      renderExtraFields={(form, setForm, inputClass) => (
        <label className="block text-xs font-semibold uppercase text-slate-500">
          Type (optional)
          <input className={`${inputClass} mt-1`} value={form.type || ''} onChange={(e) => setForm((c) => ({ ...c, type: e.target.value }))} />
        </label>
      )}
    />
  )
}
