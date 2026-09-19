import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  KeyRound,
  Loader2,
  MoreVertical,
  PackageCheck,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Shield,
  Trash2,
  UserCheck,
  UserRound,
  UserX,
  UsersRound,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import CampusReportPrintHeader from '../../../components/campus/CampusReportPrintHeader.jsx'
import FloatingMenu from '../../../components/campus/FloatingMenu.jsx'
import {
  AccessForbiddenPanel,
  PermissionControl,
} from '../../../components/campus/CampusPermissionUi.jsx'
import { FILTER_INPUT_AUTOCOMPLETE_PROPS } from '../../../utils/filterInputProps'
import fingerprintIcon from '../../../assets/fingerprint-1.svg'
import { hasCampusPermission } from '../../../services/authService'
import {
  createEmployee,
  getAllActiveEmployees,
  getEmployee,
  getEmployeeLookups,
  getEmployees,
  setEmployeeStatus,
  updateEmployee,
} from '../../../services/employeeService'
import {
  CAMPUS_REPORT_PRINT_STYLES,
  formatReportPrintDate,
  formatReportPrintMoney,
} from '../../../utils/campusReportPrint'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100'
const initialFilters = {
  search: '',
  gender: '',
  designationId: '',
  isActive: 'true',
  pageNumber: 1,
  pageSize: 10,
}

const randomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const emptyQualification = () => ({ degree: '', board: '', grade: '', marks: '', year: '', remarks: '' })
const emptyExperience = () => ({
  instituteName: '',
  designation: '',
  fromDate: '',
  toDate: '',
  durationYears: '',
})
const emptyAsset = () => ({ assetName: '', dateOfIssue: '', assetWorth: '', remarks: '' })

const makeEmptyForm = () => ({
  employeeName: '',
  thumb_ID: '',
  fatherName: '',
  doB: '',
  gender: '',
  religion: '',
  isMarried: false,
  blood_Group: '',
  permanent_Address: '',
  homePhone: '',
  contact1: '',
  contact2: '',
  contact3: '',
  email: '',
  cnic: '',
  identityMark: '',
  refered_By: '',
  localityID: '',
  joining_Date: '',
  salary: '',
  professionalDegree: '',
  isTrained: false,
  verifiedBy: '',
  approvedBy: '',
  leaving_Date: '',
  isActive: true,
  designationID: '',
  maritalStatus: '',
  password: randomPassword(),
  canMarkStudentAttendance: false,
  canViewStudentAttendance: false,
  canViewSubjectAllocation: false,
  canEditSubjectAllocation: false,
  canViewTimetable: false,
  canEditTimetable: false,
  canViewDatesheet: false,
  canEditDatesheet: false,
  canViewDiary: false,
  canEditDiary: false,
  canAccessLessonPlan: false,
  canViewStudentExamDetail: false,
  canRecordStudentConduct: false,
  canViewStudentConduct: false,
  qualifications: [],
  experiences: [],
  assets: [],
})

const dateValue = (value) => (value ? String(value).slice(0, 10) : '')
const valueOrNull = (value) => (value === '' || value == null ? null : value)
const numberOrNull = (value) => (value === '' || value == null ? null : Number(value))

function formatEmploymentDuration(joiningDate) {
  if (!joiningDate) return '—'
  const start = new Date(joiningDate)
  if (Number.isNaN(start.getTime())) return '—'
  const now = new Date()
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (now.getDate() < start.getDate()) months -= 1
  if (months < 0) months = 0
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (years === 0 && remainingMonths === 0) return '0 mos'
  if (years === 0) return `${remainingMonths} ${remainingMonths === 1 ? 'mo' : 'mos'}`
  if (remainingMonths === 0) return `${years} ${years === 1 ? 'yr' : 'yrs'}`
  return `${years} ${years === 1 ? 'yr' : 'yrs'} ${remainingMonths} ${remainingMonths === 1 ? 'mo' : 'mos'}`
}

function Field({ label, required, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </span>
      {children}
    </label>
  )
}

function Section({ icon: Icon, title, description, children, action }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-700">
          <Icon size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function EmployeeForm({ employeeId, lookups, onClose, onSaved }) {
  const [form, setForm] = useState(makeEmptyForm)
  const [isLoading, setIsLoading] = useState(Boolean(employeeId))
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!employeeId) return
    let active = true
    getEmployee(employeeId)
      .then((data) => {
        if (!active) return
        setForm({
          ...makeEmptyForm(),
          ...data,
          doB: dateValue(data.doB),
          joining_Date: dateValue(data.joining_Date),
          leaving_Date: dateValue(data.leaving_Date),
          localityID: data.localityID ?? '',
          designationID: data.designationID ?? '',
          salary: data.salary ?? '',
          email: data.email ?? '',
          canMarkStudentAttendance: Boolean(data.canMarkStudentAttendance),
          canViewStudentAttendance: Boolean(data.canViewStudentAttendance),
          canViewSubjectAllocation: Boolean(data.canViewSubjectAllocation),
          canEditSubjectAllocation: Boolean(data.canEditSubjectAllocation),
          canViewTimetable: Boolean(data.canViewTimetable),
          canEditTimetable: Boolean(data.canEditTimetable),
          canViewDatesheet: Boolean(data.canViewDatesheet),
          canEditDatesheet: Boolean(data.canEditDatesheet),
          canViewDiary: Boolean(data.canViewDiary),
          canEditDiary: Boolean(data.canEditDiary),
          canAccessLessonPlan: Boolean(data.canAccessLessonPlan),
          canViewStudentExamDetail: Boolean(data.canViewStudentExamDetail),
          canRecordStudentConduct: Boolean(data.canRecordStudentConduct),
          canViewStudentConduct: Boolean(data.canViewStudentConduct),
          qualifications: (data.qualifications || []).map((x) => ({ ...x, year: x.year ?? '' })),
          experiences: (data.experiences || []).map((x) => ({
            ...x,
            fromDate: dateValue(x.fromDate),
            toDate: dateValue(x.toDate),
            durationYears: x.durationYears ?? '',
          })),
          assets: (data.assets || []).map((x) => ({
            ...x,
            dateOfIssue: dateValue(x.dateOfIssue),
            assetWorth: x.assetWorth ?? '',
          })),
        })
      })
      .catch((error) => {
        toast.error(error?.response?.data?.message || 'Could not load employee.')
        onClose()
      })
      .finally(() => active && setIsLoading(false))
    return () => {
      active = false
    }
  }, [employeeId, onClose])

  const setValue = (name, value) => setForm((current) => ({ ...current, [name]: value }))

  const EDIT_IMPLIES_VIEW = {
    canEditSubjectAllocation: 'canViewSubjectAllocation',
    canEditTimetable: 'canViewTimetable',
    canEditDatesheet: 'canViewDatesheet',
    canEditDiary: 'canViewDiary',
  }

  const setAppAccessFlag = (name, checked) => {
    setForm((current) => {
      const next = { ...current, [name]: checked }
      const viewFlag = EDIT_IMPLIES_VIEW[name]
      if (viewFlag && checked) next[viewFlag] = true
      const editFlag = Object.keys(EDIT_IMPLIES_VIEW).find((edit) => EDIT_IMPLIES_VIEW[edit] === name)
      if (editFlag && !checked) next[editFlag] = false
      return next
    })
  }
  const updateRow = (collection, index, name, value) =>
    setForm((current) => ({
      ...current,
      [collection]: current[collection].map((row, rowIndex) =>
        rowIndex === index ? { ...row, [name]: value } : row,
      ),
    }))
  const addRow = (collection, factory) =>
    setForm((current) => ({ ...current, [collection]: [...current[collection], factory()] }))
  const removeRow = (collection, index) =>
    setForm((current) => ({
      ...current,
      [collection]: current[collection].filter((_, rowIndex) => rowIndex !== index),
    }))

  const payload = useMemo(
    () => ({
      ...form,
      email: valueOrNull(form.email),
      localityID: numberOrNull(form.localityID),
      designationID: numberOrNull(form.designationID),
      salary: numberOrNull(form.salary),
      doB: valueOrNull(form.doB),
      joining_Date: valueOrNull(form.joining_Date),
      leaving_Date: valueOrNull(form.leaving_Date),
      qualifications: form.qualifications.map((x) => ({ ...x, id: x.id || 0, year: numberOrNull(x.year) })),
      experiences: form.experiences.map((x) => ({
        ...x,
        id: x.id || 0,
        fromDate: valueOrNull(x.fromDate),
        toDate: valueOrNull(x.toDate),
        durationYears: numberOrNull(x.durationYears),
      })),
      assets: form.assets.map((x) => ({
        ...x,
        id: x.id || 0,
        dateOfIssue: valueOrNull(x.dateOfIssue),
        assetWorth: numberOrNull(x.assetWorth),
      })),
    }),
    [form],
  )

  const submit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    const toastId = 'employee-save'
    toast.loading(employeeId ? 'Updating employee...' : 'Creating employee...', { id: toastId })
    try {
      if (employeeId) await updateEmployee(employeeId, payload)
      else await createEmployee(payload)
      toast.success(employeeId ? 'Employee updated.' : 'Employee created.', { id: toastId })
      onSaved()
    } catch (error) {
      const validation = error?.response?.data?.errors
      const firstValidation = validation ? Object.values(validation).flat()[0] : ''
      toast.error(firstValidation || error?.response?.data?.message || 'Could not save employee.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="animate-spin text-indigo-600" />
          Loading employee...
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-white/95 px-5 py-4 shadow-lg backdrop-blur">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
            {employeeId ? `Employee #${employeeId}` : 'New employee'}
          </p>
          <h2 className="text-xl font-extrabold text-slate-900">
            {employeeId ? 'Edit employee profile' : 'Create employee profile'}
          </h2>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--campus-primary)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />}
            {employeeId ? 'Save changes' : 'Create employee'}
          </button>
        </div>
      </div>

      <Section icon={UserRound} title="Personal information" description="Identity, contact and residential details">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Employee name" required className="xl:col-span-2">
            <input className={inputClass} value={form.employeeName} onChange={(e) => setValue('employeeName', e.target.value)} required />
          </Field>
          <Field label="Father name">
            <input className={inputClass} value={form.fatherName || ''} onChange={(e) => setValue('fatherName', e.target.value)} />
          </Field>
          <Field label="Date of birth">
            <input type="date" className={inputClass} value={form.doB} onChange={(e) => setValue('doB', e.target.value)} />
          </Field>
          <Field label="Gender">
            <select className={inputClass} value={form.gender || ''} onChange={(e) => setValue('gender', e.target.value)}>
              <option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option>
            </select>
          </Field>
          <Field label="Religion">
            <input className={inputClass} value={form.religion || ''} onChange={(e) => setValue('religion', e.target.value)} />
          </Field>
          <Field label="Marital status">
            <select className={inputClass} value={form.maritalStatus || ''} onChange={(e) => {
              setValue('maritalStatus', e.target.value)
              setValue('isMarried', e.target.value === 'Married')
            }}>
              <option value="">Select status</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
            </select>
          </Field>
          <Field label="Blood group">
            <select className={inputClass} value={form.blood_Group || ''} onChange={(e) => setValue('blood_Group', e.target.value)}>
              <option value="">Select group</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((x) => <option key={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="CNIC">
            <input className={inputClass} value={form.cnic || ''} onChange={(e) => setValue('cnic', e.target.value)} placeholder="00000-0000000-0" />
          </Field>
          <Field label="Contact 1" required>
            <input className={inputClass} value={form.contact1} onChange={(e) => setValue('contact1', e.target.value)} required />
          </Field>
          <Field label="Contact 2">
            <input className={inputClass} value={form.contact2 || ''} onChange={(e) => setValue('contact2', e.target.value)} />
          </Field>
          <Field label="Contact 3">
            <input className={inputClass} value={form.contact3 || ''} onChange={(e) => setValue('contact3', e.target.value)} />
          </Field>
          <Field label="Home phone">
            <input className={inputClass} value={form.homePhone || ''} onChange={(e) => setValue('homePhone', e.target.value)} />
          </Field>
          <Field label="Email" className="xl:col-span-2">
            <input
              type="text"
              inputMode="email"
              autoComplete="email"
              className={inputClass}
              value={form.email || ''}
              onChange={(e) => setValue('email', e.target.value)}
              placeholder="Optional"
            />
          </Field>
          <Field label="Locality">
            <select className={inputClass} value={form.localityID} onChange={(e) => setValue('localityID', e.target.value)}>
              <option value="">Select locality</option>
              {lookups.localities.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </Field>
          <Field label="Identity mark">
            <input className={inputClass} value={form.identityMark || ''} onChange={(e) => setValue('identityMark', e.target.value)} />
          </Field>
          <Field label="Permanent address" className="md:col-span-2 xl:col-span-3">
            <textarea rows="2" className={inputClass} value={form.permanent_Address || ''} onChange={(e) => setValue('permanent_Address', e.target.value)} />
          </Field>
          <Field label="Referred by">
            <input className={inputClass} value={form.refered_By || ''} onChange={(e) => setValue('refered_By', e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section icon={BriefcaseBusiness} title="Employment details" description="Designation, compensation, access and current status">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Designation" required>
            <select className={inputClass} value={form.designationID} onChange={(e) => setValue('designationID', e.target.value)} required>
              <option value="">Select designation</option>
              {lookups.designations.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </Field>
          <Field label="Salary" required>
            <div className="relative">
              <BadgeDollarSign size={17} className="absolute left-3 top-3 text-slate-400" />
              <input type="number" min="0" className={`${inputClass} pl-9`} value={form.salary} onChange={(e) => setValue('salary', e.target.value)} required />
            </div>
          </Field>
          <Field label="Joining date">
            <input type="date" className={inputClass} value={form.joining_Date} onChange={(e) => setValue('joining_Date', e.target.value)} />
          </Field>
          <Field label="Leaving date">
            <input type="date" className={inputClass} value={form.leaving_Date} onChange={(e) => setValue('leaving_Date', e.target.value)} />
          </Field>
          <Field label="Professional degree">
            <select className={inputClass} value={form.professionalDegree || ''} onChange={(e) => setValue('professionalDegree', e.target.value)}>
              <option value="">Select degree</option><option>BEd</option><option>MEd</option><option>ADE</option>
            </select>
          </Field>
          <Field label="Biometric device ID / Username">
            <input className={inputClass} value={form.thumb_ID || ''} onChange={(e) => setValue('thumb_ID', e.target.value)} placeholder="Used to sign in to the employee app" />
          </Field>
          <Field label="Password" required>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound size={16} className="absolute left-3 top-3 text-slate-400" />
                <input className={`${inputClass} pl-9 font-mono`} minLength="6" value={form.password} onChange={(e) => setValue('password', e.target.value)} required />
              </div>
              <button type="button" title="Generate password" onClick={() => setValue('password', randomPassword())} className="rounded-xl border border-slate-200 px-3 text-indigo-700">
                <RefreshCw size={17} />
              </button>
            </div>
          </Field>
          <Field label="Verified by">
            <input className={inputClass} value={form.verifiedBy || ''} onChange={(e) => setValue('verifiedBy', e.target.value)} />
          </Field>
          <Field label="Approved by">
            <input className={inputClass} value={form.approvedBy || ''} onChange={(e) => setValue('approvedBy', e.target.value)} />
          </Field>
          <div className="flex flex-wrap items-center gap-5 md:col-span-2 xl:col-span-3">
            {[['isTrained', 'Professionally trained'], ['isActive', 'Active employee']].map(([name, label]) => (
              <label key={name} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={Boolean(form[name])} onChange={(e) => setValue(name, e.target.checked)} className="h-4 w-4 accent-indigo-600" />
                {label}
              </label>
            ))}
          </div>
        </div>
      </Section>

      <Section
        icon={Shield}
        title="App access"
        description="Employee portal screens this person can open (coordinators always have full access)"
      >
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Attendance</p>
            <div className="flex flex-wrap gap-3">
              {[
                ['canMarkStudentAttendance', 'Mark student attendance'],
                ['canViewStudentAttendance', 'View student attendance'],
              ].map(([name, label]) => (
                <label
                  key={name}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(form[name])}
                    onChange={(e) => setAppAccessFlag(name, e.target.checked)}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Academics</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                ['canViewSubjectAllocation', 'View subject allocation'],
                ['canEditSubjectAllocation', 'Add / edit subject allocation'],
                ['canViewTimetable', 'View timetable'],
                ['canEditTimetable', 'Add / edit timetable'],
                ['canViewDatesheet', 'View datesheet'],
                ['canEditDatesheet', 'Add / edit datesheet'],
                ['canViewDiary', 'View diary'],
                ['canEditDiary', 'Add / edit diary'],
              ].map(([name, label]) => (
                <label
                  key={name}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(form[name])}
                    onChange={(e) => setAppAccessFlag(name, e.target.checked)}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Conduct</p>
            <div className="flex flex-wrap gap-3">
              {[
                ['canRecordStudentConduct', 'Record class conduct'],
                ['canViewStudentConduct', 'View student conduct'],
              ].map(([name, label]) => (
                <label
                  key={name}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(form[name])}
                    onChange={(e) => setAppAccessFlag(name, e.target.checked)}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Other</p>
            <div className="flex flex-wrap gap-3">
              {[
                ['canAccessLessonPlan', 'Lesson plan'],
                ['canViewStudentExamDetail', 'View student exam detail'],
              ].map(([name, label]) => (
                <label
                  key={name}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(form[name])}
                    onChange={(e) => setAppAccessFlag(name, e.target.checked)}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section
        icon={GraduationCap}
        title="Qualifications"
        description="Academic history and certifications"
        action={<button type="button" onClick={() => addRow('qualifications', emptyQualification)} className="inline-flex items-center gap-1 rounded-lg bg-indigo-100 px-3 py-2 text-xs font-bold text-indigo-700"><Plus size={15} /> Add</button>}
      >
        {form.qualifications.length === 0 ? <EmptyRows text="No qualifications added." /> : (
          <div className="space-y-3">{form.qualifications.map((row, index) => (
            <RepeatRow key={row.id || index} index={index} onRemove={() => removeRow('qualifications', index)}>
              <input className={inputClass} placeholder="Degree" value={row.degree || ''} onChange={(e) => updateRow('qualifications', index, 'degree', e.target.value)} />
              <input className={inputClass} placeholder="Board / university" value={row.board || ''} onChange={(e) => updateRow('qualifications', index, 'board', e.target.value)} />
              <input className={inputClass} placeholder="Grade" value={row.grade || ''} onChange={(e) => updateRow('qualifications', index, 'grade', e.target.value)} />
              <input className={inputClass} placeholder="Marks" value={row.marks || ''} onChange={(e) => updateRow('qualifications', index, 'marks', e.target.value)} />
              <input type="number" className={inputClass} placeholder="Year" value={row.year ?? ''} onChange={(e) => updateRow('qualifications', index, 'year', e.target.value)} />
              <input className={inputClass} placeholder="Remarks" value={row.remarks || ''} onChange={(e) => updateRow('qualifications', index, 'remarks', e.target.value)} />
            </RepeatRow>
          ))}</div>
        )}
      </Section>

      <Section
        icon={BriefcaseBusiness}
        title="Experience"
        description="Previous employment history"
        action={<button type="button" onClick={() => addRow('experiences', emptyExperience)} className="inline-flex items-center gap-1 rounded-lg bg-indigo-100 px-3 py-2 text-xs font-bold text-indigo-700"><Plus size={15} /> Add</button>}
      >
        {form.experiences.length === 0 ? <EmptyRows text="No experience added." /> : (
          <div className="space-y-3">{form.experiences.map((row, index) => (
            <RepeatRow key={row.id || index} index={index} onRemove={() => removeRow('experiences', index)}>
              <input className={inputClass} placeholder="Institute name" value={row.instituteName || ''} onChange={(e) => updateRow('experiences', index, 'instituteName', e.target.value)} />
              <input className={inputClass} placeholder="Designation" value={row.designation || ''} onChange={(e) => updateRow('experiences', index, 'designation', e.target.value)} />
              <input type="date" className={inputClass} title="From date" value={row.fromDate || ''} onChange={(e) => updateRow('experiences', index, 'fromDate', e.target.value)} />
              <input type="date" className={inputClass} title="To date" value={row.toDate || ''} onChange={(e) => updateRow('experiences', index, 'toDate', e.target.value)} />
              <input type="number" min="0" className={inputClass} placeholder="Duration years" value={row.durationYears ?? ''} onChange={(e) => updateRow('experiences', index, 'durationYears', e.target.value)} />
            </RepeatRow>
          ))}</div>
        )}
      </Section>

      <Section
        icon={PackageCheck}
        title="Assets issued"
        description="Items assigned to this employee"
        action={<button type="button" onClick={() => addRow('assets', emptyAsset)} className="inline-flex items-center gap-1 rounded-lg bg-indigo-100 px-3 py-2 text-xs font-bold text-indigo-700"><Plus size={15} /> Add</button>}
      >
        {form.assets.length === 0 ? <EmptyRows text="No assets added." /> : (
          <div className="space-y-3">{form.assets.map((row, index) => (
            <RepeatRow key={row.id || index} index={index} onRemove={() => removeRow('assets', index)}>
              <input className={inputClass} placeholder="Asset name" value={row.assetName || ''} onChange={(e) => updateRow('assets', index, 'assetName', e.target.value)} />
              <input type="date" className={inputClass} title="Date of issue" value={row.dateOfIssue || ''} onChange={(e) => updateRow('assets', index, 'dateOfIssue', e.target.value)} />
              <input type="number" min="0" className={inputClass} placeholder="Asset worth" value={row.assetWorth ?? ''} onChange={(e) => updateRow('assets', index, 'assetWorth', e.target.value)} />
              <input className={inputClass} placeholder="Remarks" value={row.remarks || ''} onChange={(e) => updateRow('assets', index, 'remarks', e.target.value)} />
            </RepeatRow>
          ))}</div>
        )}
      </Section>
    </form>
  )
}

function RepeatRow({ index, onRemove, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Entry {index + 1}</span>
        <button type="button" onClick={onRemove} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-100"><Trash2 size={15} /></button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </div>
  )
}

function EmptyRows({ text }) {
  return <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center text-sm text-slate-500">{text}</p>
}

function GenderAvatar({ gender }) {
  const isFemale = (gender || '').toLowerCase() === 'female'

  return (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
        isFemale ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
      }`}
      title={gender || 'Male'}
    >
      {isFemale ? (
        <svg viewBox="0 0 100 100" className="h-5 w-5" aria-hidden="true">
          <path style={{ fill: '#5F3E20', stroke: '#311710' }} d="M24 57c7-8 1-30 4-38C32 8 36 1 47 1c13 0 20 10 24 20 1 2 0 8 2 14 2 5-1 10-1 12 0 5-1 3 3 10-7 17-40 13-51 0z" />
          <path style={{ fill: '#E78FB3', stroke: '#B85D87' }} d="M40 51c-5 6-22 4-25 17-2 7-1 30 14 28-1-18-3-27-3-27s2 17 3 25c11 6 28 6 42-1 0-8-1-15 0-22 1-6 0 24 0 24s9 2 12-7c2-11 5-27-9-31-11-3-12-6-14-6z" />
          <path style={{ fill: '#DBBFA8', stroke: '#693311' }} d="M50 50C33 50 22 4 49 3.4 73 5 66 50 50 50z" />
          <path style={{ fill: '#5F3E20' }} d="M46 12c-4 5-9 9-14 10-5 1 2-20 15-20 7 0 17 4 19 18-8 1-18-5-20-8z" />
        </svg>
      ) : (
        <svg viewBox="0 0 100 100" className="h-5 w-5" aria-hidden="true">
          <path style={{ fill: '#427794', stroke: '#2A424F' }} d="M39 52c-5 6-20 3-23 16-2 7-2 30 13 28-1-18-3-27-3-27s2 17 3 25c11 6 28 6 42-1 0-8-1-15 0-22 1-6 0 24 0 24s9 2 12-7c2-11 5-29-13-33-11-2-8-3-10-3z" />
          <path style={{ fill: '#CDA68E', stroke: '#693311' }} d="M50 50C33 50 21 4.1 49 3.4 79 3.3 66 50 50 50z" />
          <path style={{ fill: '#553932', stroke: '#311710' }} d="M33 30C29 19 29 2.2 49 1.2 66 2.1 72 18 66 30c0-5 1-7-2-11-5-1-12 0-18-7-2 6-16 3-13 18z" />
        </svg>
      )}
    </span>
  )
}

export default function EmployeesPage() {
  const canViewEmployees = hasCampusPermission('view_employees')
  const canManageEmployees = hasCampusPermission('manage_employees')
  const [filters, setFilters] = useState(initialFilters)
  const [result, setResult] = useState({ items: [], totalCount: 0, totalPages: 0, pageNumber: 1 })
  const [lookups, setLookups] = useState({ designations: [], localities: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [editorId, setEditorId] = useState(undefined)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [openActionId, setOpenActionId] = useState(null)
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null)
  const [statusEmployee, setStatusEmployee] = useState(null)
  const [isStatusSaving, setIsStatusSaving] = useState(false)
  const [printEmployees, setPrintEmployees] = useState([])
  const [isPrinting, setIsPrinting] = useState(false)

  const closeActionMenu = () => {
    setOpenActionId(null)
    setActionMenuAnchorEl(null)
  }

  const toggleActionMenu = (employeeId, event) => {
    event.stopPropagation()
    if (openActionId === employeeId) {
      closeActionMenu()
      return
    }
    setOpenActionId(employeeId)
    setActionMenuAnchorEl(event.currentTarget)
  }

  const openActionEmployee =
    openActionId == null ? null : result.items.find((item) => item.id === openActionId) || null

  const load = useCallback(async (query) => {
    if (!hasCampusPermission('view_employees')) {
      setResult({ items: [], totalCount: 0, totalPages: 0, pageNumber: 1 })
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const data = await getEmployees({
        ...query,
        designationId: query.designationId || undefined,
        isActive: query.isActive === '' ? undefined : query.isActive === 'true',
      })
      setResult(data || { items: [], totalCount: 0, totalPages: 0, pageNumber: 1 })
    } catch {
      toast.error('Could not load employees.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    getEmployeeLookups().then(setLookups).catch(() => toast.error('Could not load employee lookups.'))
    const timerId = setTimeout(() => load(initialFilters), 0)
    return () => clearTimeout(timerId)
  }, [load])

  useEffect(() => {
    if (!statusEmployee) return
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setStatusEmployee(null)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [statusEmployee])

  const applyFilters = (event) => {
    event.preventDefault()
    const next = { ...filters, pageNumber: 1 }
    setFilters(next)
    load(next)
  }
  const applyFilterChange = (name, value) => {
    const next = { ...filters, [name]: value, pageNumber: 1 }
    setFilters(next)
    load(next)
  }
  const resetFilters = () => {
    setFilters(initialFilters)
    load(initialFilters)
  }
  const changePage = (pageNumber) => {
    const next = { ...filters, pageNumber }
    setFilters(next)
    load(next)
  }
  const openCreate = () => {
    setEditorId(undefined)
    setIsEditorOpen(true)
  }
  const openEdit = (id) => {
    setEditorId(id)
    setIsEditorOpen(true)
  }
  const closeEditor = useCallback(() => setIsEditorOpen(false), [])
  const saved = () => {
    setIsEditorOpen(false)
    load(filters)
  }
  const confirmStatusChange = async () => {
    if (!statusEmployee) return
    const nextStatus = !statusEmployee.isActive
    setIsStatusSaving(true)
    try {
      await setEmployeeStatus(statusEmployee.id, nextStatus)
      toast.success(nextStatus ? 'Employee activated.' : 'Employee deactivated.')
      setStatusEmployee(null)
      load(filters)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update employee status.')
    } finally {
      setIsStatusSaving(false)
    }
  }

  const formatDate = (value) => {
    if (!value) return '-'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString()
  }

  const handlePrint = async () => {
    if (!canViewEmployees) return
    setIsPrinting(true)
    try {
      const items = await getAllActiveEmployees()
      if (items.length === 0) {
        toast.error('No active employees to print.')
        setIsPrinting(false)
        return
      }
      setPrintEmployees(items)
      window.setTimeout(() => {
        window.print()
        setIsPrinting(false)
      }, 50)
    } catch {
      toast.error('Could not load employees for printing.')
      setIsPrinting(false)
    }
  }

  const printSubtitle = `As on Date : ${formatReportPrintDate(new Date())}`

  return (
    <div className="print-page-root min-h-screen bg-slate-100">
      <style>{CAMPUS_REPORT_PRINT_STYLES}</style>
      <CampusShell
        headerContext="Employees"
        rowClassName="print-main-wrap flex min-h-screen w-full"
        asideClassName="no-print"
        headerClassName="no-print"
      >
        <div className="print-content-wrap w-full space-y-4 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        {isEditorOpen ? (
          <div className="no-print">
            <EmployeeForm employeeId={editorId} lookups={lookups} onClose={closeEditor} onSaved={saved} />
          </div>
        ) : (
          <div className="no-print space-y-4">
            <form onSubmit={applyFilters} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                    <UsersRound size={18} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">Employees Directory</h1>
                    <p className="text-sm text-slate-500">Search and manage employees with quick filters.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PermissionControl allowed={canViewEmployees}>
                    <button
                      type="button"
                      onClick={handlePrint}
                      disabled={isPrinting}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
                    >
                      {isPrinting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                      Print
                    </button>
                  </PermissionControl>
                  <PermissionControl allowed={canManageEmployees}>
                    <button
                      type="button"
                      onClick={openCreate}
                      className="inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-medium text-white"
                    >
                      <Plus size={18} /> Add employee
                    </button>
                  </PermissionControl>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-5">
                  <input
                    name="filterEmployeeSearch"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Name, ID, contact or biometric ID"
                    value={filters.search}
                    onChange={(e) => setFilters((x) => ({ ...x, search: e.target.value }))}
                    {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
                  />
                </div>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-5"
                  value={filters.designationId}
                  onChange={(e) => applyFilterChange('designationId', e.target.value)}
                >
                  <option value="">Designation</option>
                  {lookups.designations.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
                <div className="md:col-span-2">
                  <button type="button" onClick={resetFilters} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    Reset
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
                  <span className="text-sm font-semibold text-slate-700">Gender:</span>
                  {[
                    ['', 'All'],
                    ['Male', 'Male'],
                    ['Female', 'Female'],
                  ].map(([value, label]) => (
                    <label key={label} className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="radio"
                        name="employee-gender"
                        value={value}
                        checked={filters.gender === value}
                        onChange={(e) => applyFilterChange('gender', e.target.value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
                  <span className="text-sm font-semibold text-slate-700">Status:</span>
                  {[
                    ['true', 'Active'],
                    ['', 'All'],
                    ['false', 'Deactivated'],
                  ].map(([value, label]) => (
                    <label key={label} className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="radio"
                        name="employee-status"
                        value={value}
                        checked={filters.isActive === value}
                        onChange={(e) => applyFilterChange('isActive', e.target.value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </form>

            <div className="overflow-hidden bg-white shadow-sm">
              {!canViewEmployees ? (
                <AccessForbiddenPanel
                  title="Employee list restricted"
                  message="You don't have access to view the employee list."
                  className="m-4 border-0 bg-transparent py-12"
                />
              ) : isLoading ? (
                <div className="flex items-center justify-center gap-3 py-16 text-slate-500"><Loader2 className="animate-spin text-indigo-600" /> Loading employees...</div>
              ) : result.items.length === 0 ? (
                <div className="py-16 text-center text-slate-500"><UsersRound className="mx-auto mb-3 text-slate-300" size={38} /><p>No employees match these filters.</p></div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-full text-[13px] leading-snug">
                      <thead><tr><th className="px-3 py-2 text-left">Employee</th><th className="px-3 py-2 text-left">Designation</th><th className="px-3 py-2 text-left">Contact</th><th className="px-3 py-2 text-left">Joining date</th><th className="px-3 py-2 text-right">Salary</th><th className="w-24 px-3 py-2 text-left">Status</th><th className="w-20 px-3 py-2 text-right">Actions</th></tr></thead>
                      <tbody>{result.items.map((employee) => (
                        <tr key={employee.id} className="group border-t border-slate-100 hover:bg-indigo-50/40">
                          <td className="px-3 py-1.5">
                            <div className="flex items-center gap-2">
                              <GenderAvatar gender={employee.gender} />
                              <div className="min-w-0">
                                <div className="truncate font-bold text-slate-800">{employee.employeeName}</div>
                                {employee.thumb_ID ? (
                                  <div className="flex items-center gap-1 truncate text-xs text-slate-500">
                                    <img src={fingerprintIcon} alt="" className="h-4 w-4 shrink-0 opacity-70" />
                                    <span className="truncate">{employee.thumb_ID}</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-1.5">{employee.designationName || '-'}</td>
                          <td className="px-3 py-1.5">{employee.contact1 || '-'}</td>
                          <td className="px-3 py-1.5">{formatDate(employee.joining_Date)}</td>
                          <td className="group/salary px-3 py-1.5 text-right font-semibold">
                            <span className="text-slate-400 group-hover/salary:hidden">••••••</span>
                            <span className="hidden group-hover/salary:inline">{Number(employee.salary || 0).toLocaleString()}</span>
                          </td>
                          <td className="w-24 px-3 py-1.5"><Status active={employee.isActive} /></td>
                          <td className="w-20 px-3 py-1.5 text-right">
                            <button type="button" aria-haspopup="menu" aria-expanded={openActionId === employee.id} onClick={(event) => toggleActionMenu(employee.id, event)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100">
                              <MoreVertical size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                  <div className="divide-y divide-slate-100 md:hidden">{result.items.map((employee) => (
                    <div key={employee.id} className="group p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <GenderAvatar gender={employee.gender} />
                          <div className="min-w-0">
                            <h3 className="truncate font-bold text-slate-800">{employee.employeeName}</h3>
                            <p className="truncate text-xs text-slate-500">{employee.designationName || 'No designation'}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Status active={employee.isActive} />
                          <button type="button" aria-haspopup="menu" aria-expanded={openActionId === employee.id} onClick={(event) => toggleActionMenu(employee.id, event)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100">
                            <MoreVertical size={15} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <span>{employee.contact1 || '-'}</span>
                        <span className="text-right">Joined {formatDate(employee.joining_Date)}</span>
                        <span className="group/salary col-span-2 text-right">
                          <span className="text-slate-400 group-hover/salary:hidden">Salary ••••••</span>
                          <span className="hidden font-semibold group-hover/salary:inline">Salary {Number(employee.salary || 0).toLocaleString()}</span>
                        </span>
                      </div>
                    </div>
                  ))}</div>
                  <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm">
                    <span className="text-slate-500">Page {result.pageNumber || 1} of {Math.max(result.totalPages || 1, 1)}</span>
                    <div className="flex gap-2">
                      <button disabled={(result.pageNumber || 1) <= 1} onClick={() => changePage(result.pageNumber - 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronLeft size={17} /></button>
                      <button disabled={(result.pageNumber || 1) >= result.totalPages} onClick={() => changePage(result.pageNumber + 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronRight size={17} /></button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

          {printEmployees.length > 0 ? (
            <div className="print-only print-sheet print-area">
              <CampusReportPrintHeader title="ACTIVE EMPLOYEES" subtitle={printSubtitle} />
              <table className="legacy-print-table">
                <thead>
                  <tr>
                    <th style={{ width: '8%' }}>ID</th>
                    <th style={{ width: '24%', textAlign: 'left' }}>Name</th>
                    <th style={{ width: '22%', textAlign: 'left' }}>Father Name</th>
                    <th style={{ width: '14%' }}>Joining</th>
                    <th style={{ width: '14%' }}>Duration</th>
                    <th style={{ width: '18%' }}>Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {printEmployees.map((employee) => (
                    <tr key={employee.id}>
                      <td style={{ textAlign: 'center' }}>{employee.id}</td>
                      <td style={{ textAlign: 'left' }}>{employee.employeeName || '—'}</td>
                      <td style={{ textAlign: 'left' }}>{employee.fatherName || '—'}</td>
                      <td style={{ textAlign: 'center' }}>{formatReportPrintDate(employee.joining_Date)}</td>
                      <td style={{ textAlign: 'center' }}>{formatEmploymentDuration(employee.joining_Date)}</td>
                      <td style={{ textAlign: 'right' }}>{formatReportPrintMoney(employee.salary)}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td colSpan={5} style={{ textAlign: 'center' }}>
                      TOTAL
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {formatReportPrintMoney(
                        printEmployees.reduce((sum, employee) => sum + Number(employee.salary || 0), 0),
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      <FloatingMenu
        open={Boolean(openActionEmployee)}
        anchorEl={actionMenuAnchorEl}
        onClose={closeActionMenu}
        preferredWidth={176}
        className="no-print w-44 rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg"
      >
        {openActionEmployee ? (
          <>
            <PermissionControl allowed={canManageEmployees} className="block w-full">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeActionMenu()
                  openEdit(openActionEmployee.id)
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Pencil size={16} className="text-indigo-600" /> Edit
              </button>
            </PermissionControl>
            <PermissionControl allowed={canManageEmployees} className="block w-full">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeActionMenu()
                  setStatusEmployee(openActionEmployee)
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${
                  openActionEmployee.isActive ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {openActionEmployee.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                {openActionEmployee.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </PermissionControl>
          </>
        ) : null}
      </FloatingMenu>
      {statusEmployee ? (
        <div className="no-print fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="employee-status-title" className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className={`grid h-11 w-11 place-items-center rounded-xl ${statusEmployee.isActive ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {statusEmployee.isActive ? <UserX size={21} /> : <UserCheck size={21} />}
              </div>
              <button type="button" onClick={() => setStatusEmployee(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close confirmation">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-5">
              <h2 id="employee-status-title" className="text-lg font-bold text-slate-900">
                {statusEmployee.isActive ? 'Deactivate employee?' : 'Activate employee?'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {statusEmployee.isActive
                  ? `${statusEmployee.employeeName} will no longer appear in active employee lists or be able to use active employee access. Their records will remain saved.`
                  : `${statusEmployee.employeeName} will be restored to active employee lists.`}
              </p>
            </div>
            <div className="flex justify-end gap-2 bg-slate-50 px-5 py-4">
              <button type="button" disabled={isStatusSaving} onClick={() => setStatusEmployee(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                Cancel
              </button>
              <button type="button" disabled={isStatusSaving} onClick={confirmStatusChange} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${statusEmployee.isActive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {isStatusSaving ? <Loader2 size={16} className="animate-spin" /> : statusEmployee.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                {statusEmployee.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </CampusShell>
    </div>
  )
}

function Status({ active }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{active ? 'Active' : 'Inactive'}</span>
}
