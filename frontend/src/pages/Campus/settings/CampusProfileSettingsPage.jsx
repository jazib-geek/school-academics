import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Building2,
  CalendarRange,
  Fingerprint,
  ImageIcon,
  Loader2,
  Mail,
  Phone,
  Receipt,
  Save,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import FeeReminderNoticeTemplatesSection from '../../../components/campus/FeeReminderNoticeTemplatesSection.jsx'
import {
  SettingsCard,
  SettingsField,
  SettingsToggle,
  settingsInputClass,
} from '../../../components/campus/settings/SettingsUi.jsx'
import { PermissionControl } from '../../../components/campus/CampusPermissionUi.jsx'
import { hasCampusPermission } from '../../../services/authService'
import { getCampusProfile, updateCampusProfile } from '../../../services/campusProfileService'
import { normalizeSchoolLogo } from '../../../utils/campusBranding'
import {
  BIOMETRIC_ATTENDANCE_TYPES,
  MONTH_OPTIONS,
  buildSessionLabel,
  formatMonthYear,
  normalizeCampusProfile,
  persistCampusProfile,
} from '../../../utils/campusProfile'
import {
  INTEGER_INPUT_ATTRS,
  sanitizeIntegerInput,
  withIntegerInputValue,
} from '../../../utils/numericInput.js'

const inputClass = settingsInputClass

const SETTINGS_SECTIONS = [
  { id: 'general', label: 'School profile', icon: Building2 },
  { id: 'contact', label: 'Contact & address', icon: Phone },
  { id: 'session', label: 'Academic session', icon: CalendarRange },
  { id: 'fees', label: 'Fees & receipts', icon: Receipt },
  { id: 'notices', label: 'Fee reminder notices', icon: Mail },
  { id: 'attendance', label: 'Attendance', icon: Fingerprint },
]

const emptyForm = () => {
  const year = new Date().getFullYear()
  return {
    schoolName: '',
    schoolLogo: '',
    campusLabel: '',
    streetAddress: '',
    address: '',
    phone1: '',
    phone2: '',
    landline: '',
    email: '',
    showPhone1OnInvoice: true,
    showPhone2OnInvoice: false,
    showLandlineOnInvoice: true,
    sessionStartMonth: '2',
    sessionStartYear: String(year),
    sessionEndMonth: '1',
    sessionEndYear: String(year + 1),
    feeYear1: '',
    feeYear2: '',
    feeYear3: '',
    receiptFooterNote: '',
    showAddressOnReceipts: true,
    biometricAttendanceType: BIOMETRIC_ATTENDANCE_TYPES.ZkTeco,
    teacherCheckInTime: '07:15',
    teacherCheckOutTime: '13:30',
    adminEarlyMinutes: 30,
    coordinatorEarlyMinutes: 15,
    fridayCheckOutTime: '12:30',
    showCreditStudent: false,
  }
}

const mapDtoToForm = (dto) => {
  const n = normalizeCampusProfile(dto || {})
  return {
    schoolName: n.schoolName || '',
    schoolLogo: n.schoolLogo || '',
    campusLabel: n.campusLabel || '',
    streetAddress: n.streetAddress || '',
    address: n.address || '',
    phone1: n.phone1 || '',
    phone2: n.phone2 || '',
    landline: n.landline || '',
    email: n.email || '',
    showPhone1OnInvoice: n.showPhone1OnInvoice,
    showPhone2OnInvoice: n.showPhone2OnInvoice,
    showLandlineOnInvoice: n.showLandlineOnInvoice,
    sessionStartMonth: n.sessionStartMonth != null ? String(n.sessionStartMonth) : '2',
    sessionStartYear: n.sessionStartYear != null ? String(n.sessionStartYear) : '',
    sessionEndMonth: n.sessionEndMonth != null ? String(n.sessionEndMonth) : '1',
    sessionEndYear: n.sessionEndYear != null ? String(n.sessionEndYear) : '',
    feeYear1: n.feeYear1 != null ? String(n.feeYear1) : '',
    feeYear2: n.feeYear2 != null ? String(n.feeYear2) : '',
    feeYear3: n.feeYear3 != null ? String(n.feeYear3) : '',
    receiptFooterNote: n.receiptFooterNote || '',
    showAddressOnReceipts: n.showAddressOnReceipts,
    biometricAttendanceType: n.biometricAttendanceType,
    teacherCheckInTime: n.teacherCheckInTime || '07:15',
    teacherCheckOutTime: n.teacherCheckOutTime || '13:30',
    adminEarlyMinutes: n.adminEarlyMinutes,
    coordinatorEarlyMinutes: n.coordinatorEarlyMinutes,
    fridayCheckOutTime: n.fridayCheckOutTime || '12:30',
    showCreditStudent: n.showCreditStudent,
  }
}

function CampusProfileSettingsPage() {
  const canManage = hasCampusPermission('manage_campus_profile')
  const [form, setForm] = useState(emptyForm)
  const [savedForm, setSavedForm] = useState(emptyForm)
  const [activeSection, setActiveSection] = useState('general')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const isZkTeco = form.biometricAttendanceType === BIOMETRIC_ATTENDANCE_TYPES.ZkTeco
  const dutyDisabled = !canManage || !isZkTeco

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getCampusProfile()
      const mapped = mapDtoToForm(data)
      setForm(mapped)
      setSavedForm(mapped)
      if (data) persistCampusProfile(data)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load institute settings.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const sessionPreview = useMemo(() => {
    const startYear = Number(form.sessionStartYear)
    const endYear = Number(form.sessionEndYear)
    const label = buildSessionLabel(startYear, endYear)
    const range = formatMonthYear(form.sessionStartMonth, startYear)
    const rangeEnd = formatMonthYear(form.sessionEndMonth, endYear)
    return {
      label,
      rangeText: range && rangeEnd ? `${range} – ${rangeEnd}` : '',
    }
  }, [
    form.sessionStartMonth,
    form.sessionStartYear,
    form.sessionEndMonth,
    form.sessionEndYear,
  ])

  const onLogoFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      event.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (result) {
        setForm((previous) => ({ ...previous, schoolLogo: result }))
      }
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const onChange = (event) => {
    const { name, value, type, checked } = event.target
    const normalized =
      type === 'checkbox'
        ? event
        : ['feeYear1', 'feeYear2', 'feeYear3', 'adminEarlyMinutes', 'coordinatorEarlyMinutes'].includes(name)
          ? withIntegerInputValue(event)
          : event
    const fieldValue = type === 'checkbox' ? checked : normalized.target.value
    setForm((previous) => {
      const next = {
        ...previous,
        [name]: fieldValue,
      }

      // When start year becomes a full 4-digit year, keep end year one ahead if it was empty or still the old auto value.
      if (name === 'sessionStartYear') {
        const digits = sanitizeIntegerInput(value).slice(0, 4)
        next.sessionStartYear = digits
        if (digits.length === 4) {
          const start = Number(digits)
          if (start >= 2000 && start <= 2100) {
            const prevStart = Number(previous.sessionStartYear)
            const prevEnd = Number(previous.sessionEndYear)
            const wasAuto = !previous.sessionEndYear
              || (Number.isFinite(prevStart) && prevEnd === prevStart + 1)
            if (wasAuto) next.sessionEndYear = String(start + 1)
          }
        }
      }

      if (name === 'sessionEndYear') {
        next.sessionEndYear = sanitizeIntegerInput(value).slice(0, 4)
      }

      return next
    })
  }

  const parseYear = (value) => {
    const trimmed = String(value || '').trim()
    if (!trimmed) return null
    const n = Number(trimmed)
    if (!Number.isFinite(n)) return null
    return Math.trunc(n)
  }

  const parseMonth = (value) => {
    const n = Number(value)
    if (!Number.isFinite(n) || n < 1 || n > 12) return null
    return Math.trunc(n)
  }

  const handleSave = async () => {
    const startMonth = parseMonth(form.sessionStartMonth)
    const startYear = parseYear(form.sessionStartYear)
    const endMonth = parseMonth(form.sessionEndMonth)
    const endYear = parseYear(form.sessionEndYear)

    if (!startMonth || !startYear || !endMonth || !endYear) {
      toast.error('Set the session start and end month and year.')
      return
    }

    const start = new Date(startYear, startMonth - 1, 1)
    const end = new Date(endYear, endMonth - 1, 1)
    if (end < start) {
      toast.error('Session end must be on or after the start.')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        schoolName: form.schoolName.trim() || null,
        schoolLogo: form.schoolLogo?.trim() || null,
        campusLabel: form.campusLabel.trim() || null,
        streetAddress: form.streetAddress.trim() || null,
        address: form.address.trim() || null,
        phone1: form.phone1.trim() || null,
        phone2: form.phone2.trim() || null,
        landline: form.landline.trim() || null,
        email: form.email.trim() || null,
        showPhone1OnInvoice: form.showPhone1OnInvoice,
        showPhone2OnInvoice: form.showPhone2OnInvoice,
        showLandlineOnInvoice: form.showLandlineOnInvoice,
        sessionStartMonth: startMonth,
        sessionStartYear: startYear,
        sessionEndMonth: endMonth,
        sessionEndYear: endYear,
        feeYear1: parseYear(form.feeYear1),
        feeYear2: parseYear(form.feeYear2),
        feeYear3: parseYear(form.feeYear3),
        receiptFooterNote: form.receiptFooterNote.trim() || null,
        showAddressOnReceipts: form.showAddressOnReceipts,
        biometricAttendanceType: form.biometricAttendanceType,
        teacherCheckInTime: form.teacherCheckInTime || '07:15',
        teacherCheckOutTime: form.teacherCheckOutTime || '13:30',
        adminEarlyMinutes: Number(form.adminEarlyMinutes) || 0,
        coordinatorEarlyMinutes: Number(form.coordinatorEarlyMinutes) || 0,
        fridayCheckOutTime: form.fridayCheckOutTime || '12:30',
        showCreditStudent: form.showCreditStudent,
      }
      const saved = await updateCampusProfile(payload)
      const mapped = mapDtoToForm(saved)
      setForm(mapped)
      setSavedForm(mapped)
      persistCampusProfile(saved)
      toast.success('Institute settings saved.')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not save institute settings.')
    } finally {
      setIsSaving(false)
    }
  }

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(savedForm), [form, savedForm])
  const logoSrc = normalizeSchoolLogo(form.schoolLogo)

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return (
          <SettingsCard title="School profile" description="Name and logo shown on reports, receipts, and the app header.">
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <SettingsField label="School name">
                  <input name="schoolName" className={inputClass} value={form.schoolName} disabled={!canManage} onChange={onChange} />
                </SettingsField>
                <SettingsField label="Campus label" hint="Short name shown next to the school name, such as a branch or area">
                  <input name="campusLabel" className={inputClass} value={form.campusLabel} disabled={!canManage} onChange={onChange} />
                </SettingsField>
              </div>
              <div>
                <span className="text-[13px] font-medium text-slate-700">School logo</span>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    {logoSrc ? (
                      <img src={logoSrc} alt="" className="h-full w-full object-contain p-1" />
                    ) : (
                      <ImageIcon size={22} className="text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {canManage ? (
                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50">
                          <Upload size={14} />
                          {logoSrc ? 'Change logo' : 'Upload logo'}
                          <input type="file" accept="image/*" onChange={onLogoFile} className="sr-only" />
                        </label>
                        {logoSrc ? (
                          <button
                            type="button"
                            className="inline-flex h-8 items-center rounded-lg px-3 text-[13px] font-medium text-rose-600 hover:bg-rose-50"
                            onClick={() => setForm((prev) => ({ ...prev, schoolLogo: '' }))}
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    <p className="text-xs text-slate-500">PNG or JPG, square works best.</p>
                  </div>
                </div>
              </div>
            </div>
          </SettingsCard>
        )
      case 'contact':
        return (
          <>
            <SettingsCard title="Phone numbers" description="Contact numbers for parents and printed documents.">
              <div className="grid gap-4 sm:grid-cols-3">
                <SettingsField label="Phone 1">
                  <input name="phone1" className={inputClass} value={form.phone1} disabled={!canManage} onChange={onChange} />
                </SettingsField>
                <SettingsField label="Phone 2">
                  <input name="phone2" className={inputClass} value={form.phone2} disabled={!canManage} onChange={onChange} />
                </SettingsField>
                <SettingsField label="Landline">
                  <input name="landline" className={inputClass} value={form.landline} disabled={!canManage} onChange={onChange} />
                </SettingsField>
              </div>
            </SettingsCard>
            <SettingsCard title="Address & email">
              <div className="grid gap-4 sm:grid-cols-2">
                <SettingsField label="Street address">
                  <input name="streetAddress" className={inputClass} value={form.streetAddress} disabled={!canManage} onChange={onChange} />
                </SettingsField>
                <SettingsField label="Address">
                  <input name="address" className={inputClass} value={form.address} disabled={!canManage} onChange={onChange} />
                </SettingsField>
                <SettingsField label="Email" className="sm:col-span-2">
                  <input name="email" type="email" className={inputClass} value={form.email} disabled={!canManage} onChange={onChange} />
                </SettingsField>
              </div>
            </SettingsCard>
          </>
        )
      case 'session':
        return (
          <SettingsCard
            title="Academic session"
            description="Saved as start year–end year (for example 2026-2027)."
            aside={
              sessionPreview.label ? (
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-[#405189]">
                  {sessionPreview.label}
                  {sessionPreview.rangeText ? ` · ${sessionPreview.rangeText}` : ''}
                </span>
              ) : null
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Start', month: 'sessionStartMonth', year: 'sessionStartYear', placeholder: '2026' },
                { label: 'End', month: 'sessionEndMonth', year: 'sessionEndYear', placeholder: '2027' },
              ].map((row) => (
                <div key={row.label} className="rounded-lg border border-slate-200 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{row.label}</p>
                  <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
                    <select name={row.month} className={inputClass} value={form[row.month]} disabled={!canManage} onChange={onChange}>
                      {MONTH_OPTIONS.map((opt) => (
                        <option key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <input
                      name={row.year}
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={4}
                      placeholder={row.placeholder}
                      className={inputClass}
                      value={form[row.year]}
                      disabled={!canManage}
                      onChange={onChange}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SettingsCard>
        )
      case 'fees':
        return (
          <>
            <SettingsCard title="Fee years" description="Years available when generating fees (up to three).">
              <div className="grid gap-4 sm:grid-cols-3">
                {['feeYear1', 'feeYear2', 'feeYear3'].map((name, index) => (
                  <SettingsField key={name} label={`Year ${index + 1}`}>
                    <input name={name} {...INTEGER_INPUT_ATTRS} maxLength={4} className={inputClass} value={form[name]} disabled={!canManage} onChange={onChange} />
                  </SettingsField>
                ))}
              </div>
            </SettingsCard>
            <SettingsCard title="Receipts & invoices" description="Choose what is printed on fee receipts and invoices.">
              <SettingsField label="Receipt footer note">
                <input name="receiptFooterNote" className={inputClass} value={form.receiptFooterNote} disabled={!canManage} onChange={onChange} />
              </SettingsField>
              <div className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
                <SettingsToggle name="showAddressOnReceipts" checked={form.showAddressOnReceipts} disabled={!canManage} onChange={onChange} label="Show address on receipts" />
                <SettingsToggle name="showPhone1OnInvoice" checked={form.showPhone1OnInvoice} disabled={!canManage} onChange={onChange} label="Show phone 1 on invoice" />
                <SettingsToggle name="showPhone2OnInvoice" checked={form.showPhone2OnInvoice} disabled={!canManage} onChange={onChange} label="Show phone 2 on invoice" />
                <SettingsToggle name="showLandlineOnInvoice" checked={form.showLandlineOnInvoice} disabled={!canManage} onChange={onChange} label="Show landline on invoice" />
              </div>
            </SettingsCard>
            <SettingsCard title="Students">
              <div className="-my-3">
                <SettingsToggle
                  name="showCreditStudent"
                  checked={form.showCreditStudent}
                  disabled={!canManage}
                  onChange={onChange}
                  label="Credit students"
                  description="Show the credit student option on admission and the student list."
                />
              </div>
            </SettingsCard>
          </>
        )
      case 'notices':
        return <FeeReminderNoticeTemplatesSection disabled={!canManage} />
      case 'attendance':
        return (
          <>
            <SettingsCard title="Attendance device" description="How this campus records staff attendance.">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { value: BIOMETRIC_ATTENDANCE_TYPES.Kiosk, title: 'KIOSK (Digital Persona/Secugen)', text: 'Real-time fingerprint attendance at the desk.' },
                  { value: BIOMETRIC_ATTENDANCE_TYPES.ZkTeco, title: 'ZKTeco (wall-mounted device)', text: 'Import the monthly Excel sheet from the wall device.' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm transition hover:border-slate-300 has-[:checked]:border-[#405189] has-[:checked]:bg-indigo-50/60"
                  >
                    <input
                      type="radio"
                      name="biometricAttendanceType"
                      value={opt.value}
                      checked={form.biometricAttendanceType === opt.value}
                      disabled={!canManage}
                      onChange={onChange}
                      className="mt-0.5 accent-[#405189]"
                    />
                    <span>
                      <span className="block text-[13px] font-medium text-slate-800">{opt.title}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{opt.text}</span>
                    </span>
                  </label>
                ))}
              </div>
            </SettingsCard>
            <SettingsCard
              title="Duty times"
              description={isZkTeco ? 'Used when importing from the wall-mounted device.' : 'Available when the wall-mounted device is selected.'}
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <SettingsField label="Teacher check-in">
                  <input type="time" name="teacherCheckInTime" className={inputClass} value={form.teacherCheckInTime} disabled={dutyDisabled} onChange={onChange} />
                </SettingsField>
                <SettingsField label="Teacher checkout">
                  <input type="time" name="teacherCheckOutTime" className={inputClass} value={form.teacherCheckOutTime} disabled={dutyDisabled} onChange={onChange} />
                </SettingsField>
                <SettingsField label="Friday checkout">
                  <input type="time" name="fridayCheckOutTime" className={inputClass} value={form.fridayCheckOutTime} disabled={dutyDisabled} onChange={onChange} />
                </SettingsField>
                <SettingsField label="Admin arrives earlier" hint="Minutes before teacher check-in">
                  <input {...INTEGER_INPUT_ATTRS} name="adminEarlyMinutes" className={inputClass} value={form.adminEarlyMinutes} disabled={dutyDisabled} onChange={onChange} />
                </SettingsField>
                <SettingsField label="Co-ordinator arrives earlier" hint="Minutes before teacher check-in">
                  <input {...INTEGER_INPUT_ATTRS} name="coordinatorEarlyMinutes" className={inputClass} value={form.coordinatorEarlyMinutes} disabled={dutyDisabled} onChange={onChange} />
                </SettingsField>
              </div>
            </SettingsCard>
          </>
        )
      default:
        return null
    }
  }

  const showSaveBar = activeSection !== 'notices' || isDirty

  return (
    <CampusShell headerContext="Institute Settings">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#405189] text-white">
              <Building2 size={18} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Institute Settings</h1>
              <p className="text-[13px] text-slate-500">Manage how this campus appears and works across the app.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 rounded-xl bg-white p-6 text-slate-500">
              <Loader2 className="animate-spin" size={16} />
              Loading…
            </div>
          ) : (
            <PermissionControl permission="manage_campus_profile">
              <div className="grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <nav
                  aria-label="Settings sections"
                  className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 lg:sticky lg:top-20 lg:flex-col lg:overflow-visible"
                >
                  {SETTINGS_SECTIONS.map(({ id, label, icon: Icon }) => {
                    const active = activeSection === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setActiveSection(id)}
                        className={`inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-left text-[13px] font-medium transition ${
                          active ? 'bg-indigo-50 text-[#405189]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                        }`}
                      >
                        <Icon size={16} className={active ? 'text-[#405189]' : 'text-slate-400'} />
                        {label}
                      </button>
                    )
                  })}
                </nav>

                <div className="min-w-0 space-y-4">
                  {renderSection()}

                  {showSaveBar ? (
                    <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
                      <span className={`mr-auto text-xs font-medium ${isDirty ? 'text-amber-700' : 'text-slate-400'}`}>
                        {isDirty ? 'You have unsaved changes' : 'All changes saved'}
                      </span>
                      <button
                        type="button"
                        disabled={!isDirty || isSaving}
                        onClick={() => setForm(savedForm)}
                        className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Discard
                      </button>
                      <button
                        type="button"
                        disabled={!canManage || !isDirty || isSaving}
                        onClick={handleSave}
                        className="inline-flex h-9 min-w-[120px] items-center justify-center gap-1.5 rounded-lg bg-[#405189] px-4 text-[13px] font-semibold text-white hover:bg-[#364574] disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Save changes
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </PermissionControl>
          )}
        </div>
      </div>
    </CampusShell>
  )
}

export default CampusProfileSettingsPage
