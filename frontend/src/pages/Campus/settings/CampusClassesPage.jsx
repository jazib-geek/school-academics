import { GraduationCap } from 'lucide-react'
import NamedLookupCrudPage from './NamedLookupCrudPage.jsx'
import {
  createSettingClass,
  getSettingClasses,
  setSettingClassStatus,
  updateSettingClass,
} from '../../../services/campusSettingsService'

export default function CampusClassesPage() {
  return (
    <NamedLookupCrudPage
      title="Classes"
      subtitle="Registered class levels (Playgroup, Nursery, One, …)."
      icon={GraduationCap}
      nameLabel="Class name"
      managePermission="param_class"
      loadRows={getSettingClasses}
      createRow={createSettingClass}
      updateRow={updateSettingClass}
      setStatus={setSettingClassStatus}
      emptyForm={{ name: '', sortBy: '', isHifz: false, isActive: true }}
      mapFormFromRow={(row) => ({
        name: row.name || '',
        sortBy: row.sortBy ?? '',
        isHifz: Boolean(row.isHifz),
        isActive: row.isActive ?? true,
      })}
      buildPayload={(form) => ({
        name: form.name.trim(),
        sortBy: form.sortBy === '' ? null : Number(form.sortBy),
        isHifz: Boolean(form.isHifz),
        isActive: Boolean(form.isActive),
      })}
      extraColumns={[
        { key: 'sort', label: 'Sort', render: (row) => row.sortBy ?? '—' },
        { key: 'hifz', label: 'Hifz', render: (row) => (row.isHifz ? 'Yes' : '—') },
      ]}
      renderExtraFields={(form, setForm, inputClass) => (
        <>
          <label className="block text-xs font-semibold uppercase text-slate-500">
            Sort order
            <input type="number" className={`${inputClass} mt-1`} value={form.sortBy} onChange={(e) => setForm((c) => ({ ...c, sortBy: e.target.value }))} />
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={Boolean(form.isHifz)} onChange={(e) => setForm((c) => ({ ...c, isHifz: e.target.checked }))} className="h-4 w-4 accent-[var(--campus-primary)]" />
            Is Hifz
          </label>
        </>
      )}
    />
  )
}
