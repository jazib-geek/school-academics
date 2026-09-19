import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, Clock, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { PermissionControl } from '../../../components/campus/CampusPermissionUi.jsx'
import { hasCampusPermission } from '../../../services/authService'
import { getCampusProfile, updateCampusProfile } from '../../../services/campusProfileService'
import {
  BIOMETRIC_ATTENDANCE_TYPES,
  MONTH_OPTIONS,
  buildSessionLabel,
  formatMonthYear,
  normalizeCampusProfile,
  persistCampusProfile,
} from '../../../utils/campusProfile'

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#405189] focus:ring-2 focus:ring-indigo-100'

const emptyForm = () => {
  const year = new Date().getFullYear()
  return {
    schoolName: '',
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
  }
}

const mapDtoToForm = (dto) => {
  const n = normalizeCampusProfile(dto || {})
  return {
    schoolName: n.schoolName || '',
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
  }
}

function CampusProfileSettingsPage() {
  const canManage = hasCampusPermission('manage_campus_profile')
  const [form, setForm] = useState(emptyForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const isZkTeco = form.biometricAttendanceType === BIOMETRIC_ATTENDANCE_TYPES.ZkTeco
  const dutyDisabled = !canManage || !isZkTeco

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getCampusProfile()
      setForm(mapDtoToForm(data))
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

  const onChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((previous) => {
      const next = {
        ...previous,
        [name]: type === 'checkbox' ? checked : value,
      }

      // When start year becomes a full 4-digit year, keep end year one ahead if it was empty or still the old auto value.
      if (name === 'sessionStartYear') {
        const digits = String(value || '').replace(/\D/g, '').slice(0, 4)
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
        next.sessionEndYear = String(value || '').replace(/\D/g, '').slice(0, 4)
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
      }
      const saved = await updateCampusProfile(payload)
      setForm(mapDtoToForm(saved))
      persistCampusProfile(saved)
      toast.success('Institute settings saved.')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not save institute settings.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <CampusShell headerContext="Institute Settings">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-6xl">
          <section className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#405189] text-white">
                <Building2 size={18} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Institute Settings</h1>
                <p className="text-sm text-slate-500">
                  Campus name, contact details, session, fee years, and attendance device setup.
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 py-8 text-slate-500">
                <Loader2 className="animate-spin" size={16} />
                Loading…
              </div>
            ) : (
              <PermissionControl permission="manage_campus_profile">
                <div className="space-y-5">
                  <div className="grid items-start gap-5 lg:grid-cols-2">
                    <div className="space-y-5">
                      <div className="space-y-3 rounded-xl border border-slate-200 p-3.5">
                        <p className="text-sm font-semibold text-slate-800">Campus</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block text-sm font-medium text-slate-700">
                            School name
                            <input
                              name="schoolName"
                              className={`${inputClass} mt-1`}
                              value={form.schoolName}
                              disabled={!canManage}
                              onChange={onChange}
                            />
                          </label>
                          <label className="block text-sm font-medium text-slate-700">
                            Campus label
                            <input
                              name="campusLabel"
                              className={`${inputClass} mt-1`}
                              value={form.campusLabel}
                              disabled={!canManage}
                              onChange={onChange}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-xl border border-slate-200 p-3.5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800">Academic session</p>
                          {sessionPreview.label ? (
                            <p className="text-xs text-slate-500">
                              Label:{' '}
                              <span className="font-semibold text-slate-700">{sessionPreview.label}</span>
                              {sessionPreview.rangeText ? (
                                <>
                                  {' · '}
                                  {sessionPreview.rangeText}
                                </>
                              ) : null}
                            </p>
                          ) : null}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block text-sm font-medium text-slate-700">
                            Start month
                            <select
                              name="sessionStartMonth"
                              className={`${inputClass} mt-1`}
                              value={form.sessionStartMonth}
                              disabled={!canManage}
                              onChange={onChange}
                            >
                              {MONTH_OPTIONS.map((opt) => (
                                <option key={opt.value} value={String(opt.value)}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block text-sm font-medium text-slate-700">
                            Start year
                            <input
                              name="sessionStartYear"
                              inputMode="numeric"
                              autoComplete="off"
                              maxLength={4}
                              placeholder="2026"
                              className={`${inputClass} mt-1`}
                              value={form.sessionStartYear}
                              disabled={!canManage}
                              onChange={onChange}
                            />
                          </label>
                          <label className="block text-sm font-medium text-slate-700">
                            End month
                            <select
                              name="sessionEndMonth"
                              className={`${inputClass} mt-1`}
                              value={form.sessionEndMonth}
                              disabled={!canManage}
                              onChange={onChange}
                            >
                              {MONTH_OPTIONS.map((opt) => (
                                <option key={opt.value} value={String(opt.value)}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block text-sm font-medium text-slate-700">
                            End year
                            <input
                              name="sessionEndYear"
                              inputMode="numeric"
                              autoComplete="off"
                              maxLength={4}
                              placeholder="2027"
                              className={`${inputClass} mt-1`}
                              value={form.sessionEndYear}
                              disabled={!canManage}
                              onChange={onChange}
                            />
                          </label>
                        </div>
                        <p className="text-xs text-slate-500">
                          Session label is saved as start year–end year (for example 2026-2027).
                        </p>
                      </div>

                      <div className="space-y-3 rounded-xl border border-slate-200 p-3.5">
                        <p className="text-sm font-semibold text-slate-800">Address</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block text-sm font-medium text-slate-700">
                            Street address
                            <input
                              name="streetAddress"
                              className={`${inputClass} mt-1`}
                              value={form.streetAddress}
                              disabled={!canManage}
                              onChange={onChange}
                            />
                          </label>
                          <label className="block text-sm font-medium text-slate-700">
                            Address
                            <input
                              name="address"
                              className={`${inputClass} mt-1`}
                              value={form.address}
                              disabled={!canManage}
                              onChange={onChange}
                            />
                          </label>
                          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                            Email
                            <input
                              name="email"
                              type="email"
                              className={`${inputClass} mt-1`}
                              value={form.email}
                              disabled={!canManage}
                              onChange={onChange}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="space-y-3 rounded-xl border border-slate-200 p-3.5">
                        <p className="text-sm font-semibold text-slate-800">Phone numbers</p>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <label className="block text-sm font-medium text-slate-700">
                            Phone 1
                            <input
                              name="phone1"
                              className={`${inputClass} mt-1`}
                              value={form.phone1}
                              disabled={!canManage}
                              onChange={onChange}
                            />
                          </label>
                          <label className="block text-sm font-medium text-slate-700">
                            Phone 2
                            <input
                              name="phone2"
                              className={`${inputClass} mt-1`}
                              value={form.phone2}
                              disabled={!canManage}
                              onChange={onChange}
                            />
                          </label>
                          <label className="block text-sm font-medium text-slate-700">
                            Landline
                            <input
                              name="landline"
                              className={`${inputClass} mt-1`}
                              value={form.landline}
                              disabled={!canManage}
                              onChange={onChange}
                            />
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-4 pt-1 text-sm text-slate-700">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              name="showPhone1OnInvoice"
                              checked={form.showPhone1OnInvoice}
                              disabled={!canManage}
                              onChange={onChange}
                            />
                            Show phone 1 on invoice
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              name="showPhone2OnInvoice"
                              checked={form.showPhone2OnInvoice}
                              disabled={!canManage}
                              onChange={onChange}
                            />
                            Show phone 2 on invoice
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              name="showLandlineOnInvoice"
                              checked={form.showLandlineOnInvoice}
                              disabled={!canManage}
                              onChange={onChange}
                            />
                            Show landline on invoice
                          </label>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-xl border border-slate-200 p-3.5">
                        <p className="text-sm font-semibold text-slate-800">Generate fee years (max 3)</p>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {['feeYear1', 'feeYear2', 'feeYear3'].map((name, index) => (
                            <label key={name} className="block text-sm font-medium text-slate-700">
                              Year {index + 1}
                              <input
                                name={name}
                                type="number"
                                min="2000"
                                max="2100"
                                className={`${inputClass} mt-1`}
                                value={form[name]}
                                disabled={!canManage}
                                onChange={onChange}
                              />
                            </label>
                          ))}
                        </div>
                        <label className="block text-sm font-medium text-slate-700">
                          Receipt footer note
                          <input
                            name="receiptFooterNote"
                            className={`${inputClass} mt-1`}
                            value={form.receiptFooterNote}
                            disabled={!canManage}
                            onChange={onChange}
                          />
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            name="showAddressOnReceipts"
                            checked={form.showAddressOnReceipts}
                            disabled={!canManage}
                            onChange={onChange}
                          />
                          Show address on fee receipts
                        </label>
                      </div>

                      <div className="space-y-3 rounded-xl border border-slate-200 p-3.5">
                        <div className="flex items-start gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-50 text-[#405189]">
                            <Clock size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">Biometric attendance</p>
                            <p className="text-xs text-slate-500">
                              Choose how this campus records staff attendance. Duty times below are used when
                              importing from the wall-mounted device.
                            </p>
                          </div>
                        </div>

                        <fieldset className="space-y-2">
                          <legend className="text-xs font-semibold uppercase text-slate-500">
                            Attendance type
                          </legend>
                          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 has-[:checked]:border-[#405189] has-[:checked]:bg-indigo-50">
                            <input
                              type="radio"
                              name="biometricAttendanceType"
                              value={BIOMETRIC_ATTENDANCE_TYPES.Kiosk}
                              checked={form.biometricAttendanceType === BIOMETRIC_ATTENDANCE_TYPES.Kiosk}
                              disabled={!canManage}
                              onChange={onChange}
                              className="mt-0.5 accent-[#405189]"
                            />
                            <span>
                              <span className="font-medium text-slate-800">KIOSK (Digital Persona/Secugen)</span>
                              <span className="mt-0.5 block text-xs text-slate-500">
                                Real-time fingerprint attendance at the desk.
                              </span>
                            </span>
                          </label>
                          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 has-[:checked]:border-[#405189] has-[:checked]:bg-indigo-50">
                            <input
                              type="radio"
                              name="biometricAttendanceType"
                              value={BIOMETRIC_ATTENDANCE_TYPES.ZkTeco}
                              checked={form.biometricAttendanceType === BIOMETRIC_ATTENDANCE_TYPES.ZkTeco}
                              disabled={!canManage}
                              onChange={onChange}
                              className="mt-0.5 accent-[#405189]"
                            />
                            <span>
                              <span className="font-medium text-slate-800">ZKTeco (wall-mounted device)</span>
                              <span className="mt-0.5 block text-xs text-slate-500">
                                Import the monthly Excel sheet from the wall device.
                              </span>
                            </span>
                          </label>
                        </fieldset>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block text-sm font-medium text-slate-700">
                            Teacher check-in
                            <input
                              type="time"
                              name="teacherCheckInTime"
                              className={`${inputClass} mt-1 disabled:bg-slate-50 disabled:text-slate-500`}
                              value={form.teacherCheckInTime}
                              disabled={dutyDisabled}
                              onChange={onChange}
                            />
                          </label>
                          <label className="block text-sm font-medium text-slate-700">
                            Teacher checkout
                            <input
                              type="time"
                              name="teacherCheckOutTime"
                              className={`${inputClass} mt-1 disabled:bg-slate-50 disabled:text-slate-500`}
                              value={form.teacherCheckOutTime}
                              disabled={dutyDisabled}
                              onChange={onChange}
                            />
                          </label>
                          <label className="block text-sm font-medium text-slate-700">
                            Friday checkout
                            <input
                              type="time"
                              name="fridayCheckOutTime"
                              className={`${inputClass} mt-1 disabled:bg-slate-50 disabled:text-slate-500`}
                              value={form.fridayCheckOutTime}
                              disabled={dutyDisabled}
                              onChange={onChange}
                            />
                          </label>
                          <label className="block text-sm font-medium text-slate-700">
                            Admin earlier (minutes)
                            <input
                              type="number"
                              name="adminEarlyMinutes"
                              min="0"
                              max="1440"
                              className={`${inputClass} mt-1 disabled:bg-slate-50 disabled:text-slate-500`}
                              value={form.adminEarlyMinutes}
                              disabled={dutyDisabled}
                              onChange={onChange}
                            />
                          </label>
                          <label className="block text-sm font-medium text-slate-700">
                            Co-ordinator earlier (minutes)
                            <input
                              type="number"
                              name="coordinatorEarlyMinutes"
                              min="0"
                              max="1440"
                              className={`${inputClass} mt-1 disabled:bg-slate-50 disabled:text-slate-500`}
                              value={form.coordinatorEarlyMinutes}
                              disabled={dutyDisabled}
                              onChange={onChange}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!canManage || isSaving}
                      onClick={handleSave}
                      className="inline-flex h-12 min-w-[140px] items-center justify-center gap-2 rounded-lg bg-[#405189] px-6 text-base font-semibold text-white hover:bg-[#364574] disabled:opacity-60"
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                      Save
                    </button>
                  </div>
                </div>
              </PermissionControl>
            )}
          </section>
        </div>
      </div>
    </CampusShell>
  )
}

export default CampusProfileSettingsPage
