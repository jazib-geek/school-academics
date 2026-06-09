import { useCallback, useEffect, useState } from 'react'
import { Building2, Loader2, Save, Trash2 } from 'lucide-react'
import AcademicLayout from '../../../components/academics/AcademicLayout'
import { useAcademicInstituteSettings } from '../../../contexts/AcademicInstituteSettingsContext'
import { getStoredAcademicInstituteSettings } from '../../../services/academicAuthService'
import {
  deleteAcademicInstituteSetting,
  getAcademicInstituteSettingsList,
  upsertAcademicInstituteSetting,
} from '../../../services/academicInstituteSettingsService'

const emptyForm = () => ({
  id: '',
  instituteName: '',
  instituteAddress: '',
  instituteContact: '',
  instituteEmail: '',
  instituteLogo: '',
})

const mapDtoToForm = (dto) => ({
  id: dto?.id != null ? String(dto.id) : '',
  instituteName: dto?.instituteName || '',
  instituteAddress: dto?.instituteAddress || '',
  instituteContact: dto?.instituteContact || '',
  instituteEmail: dto?.instituteEmail || '',
  instituteLogo: dto?.instituteLogo || '',
})

function logoPreviewSrc(logo) {
  if (!logo || typeof logo !== 'string') return ''
  const trimmed = logo.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('data:')) return trimmed
  return `data:image/png;base64,${trimmed}`
}

function AcademicInstituteSettingsPage() {
  const { instituteSettings: fromContext, setInstituteSettings } = useAcademicInstituteSettings()
  const [form, setForm] = useState(() => mapDtoToForm(fromContext))
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const list = await getAcademicInstituteSettingsList()
      const row = list?.[0] ?? getStoredAcademicInstituteSettings()
      if (row) {
        setForm(mapDtoToForm(row))
      } else {
        setForm(emptyForm())
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to load institute settings.')
      const fallback = getStoredAcademicInstituteSettings()
      if (fallback) {
        setForm(mapDtoToForm(fallback))
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timerId = setTimeout(() => load(), 0)
    return () => clearTimeout(timerId)
  }, [load])

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  const onLogoFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setForm((previous) => ({ ...previous, instituteLogo: result }))
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    try {
      const saved = await upsertAcademicInstituteSetting({
        id: form.id ? Number(form.id) : undefined,
        instituteName: form.instituteName?.trim() || null,
        instituteAddress: form.instituteAddress?.trim() || null,
        instituteContact: form.instituteContact?.trim() || null,
        instituteEmail: form.instituteEmail?.trim() || null,
        instituteLogo: form.instituteLogo?.trim() || null,
      })
      setForm(mapDtoToForm(saved))
      setInstituteSettings(saved)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Save failed.')
    } finally {
      setIsSaving(false)
    }
  }

  const onDelete = async () => {
    if (!form.id) return
    if (!window.confirm('Delete institute settings for this record?')) return
    setIsDeleting(true)
    setError('')
    try {
      await deleteAcademicInstituteSetting(Number(form.id))
      setForm(emptyForm())
      setInstituteSettings(null)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Delete failed.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AcademicLayout
      pageTitle="Institute settings"
      pageSubtitle="School profile used in the academics portal (name appears in the top bar)."
      pageIcon={<Building2 size={18} />}
      isSingleCardLayout
    >
      {error ? (
        <section className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </section>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="animate-spin" size={18} />
          Loading…
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Institute name</span>
            <input
              name="instituteName"
              value={form.instituteName}
              onChange={onChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-indigo-300 focus:ring"
              placeholder="School name"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Address</span>
            <textarea
              name="instituteAddress"
              value={form.instituteAddress}
              onChange={onChange}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-indigo-300 focus:ring"
              placeholder="Address"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Contact</span>
            <input
              name="instituteContact"
              value={form.instituteContact}
              onChange={onChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-indigo-300 focus:ring"
              placeholder="Phone or contact"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input
              name="instituteEmail"
              type="email"
              value={form.instituteEmail}
              onChange={onChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-indigo-300 focus:ring"
              placeholder="Email"
            />
          </label>
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Logo (saved as Base64)</span>
            <input
              type="file"
              accept="image/*"
              onChange={onLogoFile}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-800 hover:file:bg-indigo-100"
            />
            {form.instituteLogo ? (
              <div className="mt-3 flex items-start gap-3">
                <img
                  src={logoPreviewSrc(form.instituteLogo)}
                  alt="Logo preview"
                  className="h-20 w-auto max-w-[200px] rounded border border-slate-200 bg-white object-contain p-1"
                />
                <button
                  type="button"
                  onClick={() => setForm((previous) => ({ ...previous, instituteLogo: '' }))}
                  className="text-sm text-rose-600 hover:underline"
                >
                  Remove logo
                </button>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="btn-soft btn-soft-primary inline-flex items-center gap-2 disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Save
            </button>
            {form.id ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
              >
                {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                Delete
              </button>
            ) : null}
          </div>
        </form>
      )}
    </AcademicLayout>
  )
}

export default AcademicInstituteSettingsPage
