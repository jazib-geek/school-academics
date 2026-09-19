import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  GraduationCap,
  Loader2,
  Plus,
  Save,
  Search,
  User,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { getClasses } from '../../../services/classService'
import { FILTER_INPUT_AUTOCOMPLETE_PROPS } from '../../../utils/filterInputProps'
import {
  getAdmissionLookups,
  getNextFamilyCode,
  getStudentAdmissionDetail,
  registerStudent,
  searchFamilies,
  updateStudent,
} from '../../../services/studentService'

const inputClass =
  'h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-800 outline-none transition focus:ring-2'
const inputOk = 'border-slate-300 focus:border-[var(--campus-primary)] focus:ring-indigo-100'
const inputErr = 'border-rose-500 focus:border-rose-500 focus:ring-rose-100'
const inputDisabled = 'bg-slate-50 text-slate-600 cursor-not-allowed'

const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-slate-500'
const grid3 = 'grid gap-3 md:grid-cols-2 xl:grid-cols-3'
const grid2 = 'grid gap-3 sm:grid-cols-2'
const panelClass = 'flex h-full flex-col space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4'

const MONTH_OPTIONS = [
  { value: 1, label: 'January', short: 'Jan' },
  { value: 2, label: 'February', short: 'Feb' },
  { value: 3, label: 'March', short: 'Mar' },
  { value: 4, label: 'April', short: 'Apr' },
  { value: 5, label: 'May', short: 'May' },
  { value: 6, label: 'June', short: 'Jun' },
  { value: 7, label: 'July', short: 'Jul' },
  { value: 8, label: 'August', short: 'Aug' },
  { value: 9, label: 'September', short: 'Sep' },
  { value: 10, label: 'October', short: 'Oct' },
  { value: 11, label: 'November', short: 'Nov' },
  { value: 12, label: 'December', short: 'Dec' },
]

function monthShort(month) {
  const found = MONTH_OPTIONS.find((m) => m.value === Number(month))
  return found?.short || String(month)
}

function fieldClass(hasError, disabled = false) {
  return `${inputClass} ${hasError ? inputErr : inputOk} ${disabled ? inputDisabled : ''}`.trim()
}

const emptyForm = () => {
  const now = new Date()
  return {
    fullName: '',
    nameInUrdu: '',
    homeAddress: '',
    localityId: '',
    caste: '',
    gender: 'Male',
    isOrphan: false,
    isHafiz: false,
    religion: 'Muslim',
    dateOfBirth: '',
    bFormNum: '',
    subjectGroupId: '',
    medium: 'English',
    prevSchoolName: '',
    prevSchoolClass: '',
    fatherName: '',
    motherName: '',
    fatherCNIC: '',
    motherCNIC: '',
    fatherQualificationId: '',
    motherQualificationId: '',
    fatherMobileNo: '',
    motherPhoneNo: '',
    fatherOccupationId: '',
    motherOccupationId: '',
    homePhone: '',
    specialNotes: '',
    familyCode: '',
    familyFromExisting: false,
    classCompositeId: '',
    sessionSpan: String(now.getFullYear()),
    regDate: now.toISOString().slice(0, 10),
    classFee: 0,
    tuitionFee: '',
    admissionFee: '0',
    miscCharges: '0',
    prevBalance: '0',
    transportCharges: '0',
    branchLabel: '',
  }
}

function toNum(value) {
  if (value === '' || value == null) return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const ERROR_FIELD_ORDER = [
  'fullName',
  'gender',
  'familyCode',
  'classCompositeId',
  'admissionFee',
  'miscCharges',
  'prevBalance',
  'transportCharges',
]

function toDateInput(value) {
  if (!value) return ''
  const raw = String(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function mapDetailToForm(detail) {
  return {
    ...emptyForm(),
    fullName: detail.fullName || '',
    nameInUrdu: detail.nameInUrdu || '',
    homeAddress: detail.homeAddress || '',
    localityId: detail.localityId ?? '',
    caste: detail.caste || '',
    gender: detail.gender || 'Male',
    isOrphan: Boolean(detail.isOrphan),
    isHafiz: Boolean(detail.isHafiz),
    religion: detail.religion || 'Muslim',
    dateOfBirth: toDateInput(detail.dateOfBirth),
    bFormNum: detail.bFormNum || '',
    subjectGroupId: detail.subjectGroupId ?? '',
    medium: detail.medium || 'English',
    prevSchoolName: detail.prevSchoolName || '',
    prevSchoolClass: detail.prevSchoolClass || '',
    fatherName: detail.fatherName || '',
    motherName: detail.motherName || '',
    fatherCNIC: detail.fatherCNIC || '',
    motherCNIC: detail.motherCNIC || '',
    fatherQualificationId: detail.fatherQualificationId ?? '',
    motherQualificationId: detail.motherQualificationId ?? '',
    fatherMobileNo: detail.fatherMobileNo || '',
    motherPhoneNo: detail.motherPhoneNo || '',
    fatherOccupationId: detail.fatherOccupationId ?? '',
    motherOccupationId: detail.motherOccupationId ?? '',
    homePhone: detail.homePhone || '',
    specialNotes: detail.specialNotes || '',
    familyCode: detail.familyCode != null ? String(detail.familyCode) : '',
    familyFromExisting: true,
    classCompositeId: detail.classCompositeId != null ? String(detail.classCompositeId) : '',
    sessionSpan: detail.sessionSpan || '',
    regDate: toDateInput(detail.regDate) || emptyForm().regDate,
    classFee: detail.classFee ?? 0,
    tuitionFee: detail.tuitionFee != null ? String(detail.tuitionFee) : '',
    admissionFee: String(detail.admissionFee ?? 0),
    miscCharges: String(detail.miscCharges ?? 0),
    prevBalance: String(detail.prevBalance ?? 0),
    transportCharges: String(detail.transportCharges ?? 0),
    branchLabel: detail.branchLabel || '',
  }
}

function scrollToField(name) {
  const el = document.querySelector(`[data-field="${name}"]`)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const focusable = el.matches('input, select, textarea, button')
    ? el
    : el.querySelector('input, select, textarea, button')
  if (focusable && typeof focusable.focus === 'function') {
    try {
      focusable.focus({ preventScroll: true })
    } catch {
      focusable.focus()
    }
  }
}

function CampusStudentAdmitPage() {
  const navigate = useNavigate()
  const { regId: regIdParam } = useParams()
  const editRegId = Number(regIdParam)
  const isEdit = Number.isFinite(editRegId) && editRegId > 0
  const familyInfoRef = useRef(null)
  const [form, setForm] = useState(emptyForm)
  const [classes, setClasses] = useState([])
  const [lookups, setLookups] = useState({
    localities: [],
    occupations: [],
    qualifications: [],
    subjectGroups: [],
    fundTypes: [],
    mediums: ['English', 'Urdu'],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [familyModalOpen, setFamilyModalOpen] = useState(false)
  const [familyQuery, setFamilyQuery] = useState('')
  const [familyResults, setFamilyResults] = useState([])
  const [familySearching, setFamilySearching] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateTf, setGenerateTf] = useState(true)
  const [generateFunds, setGenerateFunds] = useState(true)
  const [tfMonth, setTfMonth] = useState(new Date().getMonth() + 1)
  const [tfYear, setTfYear] = useState(() => new Date().getFullYear())
  const [tfAmount, setTfAmount] = useState('')
  const [errors, setErrors] = useState({})
  const [showErrors, setShowErrors] = useState(false)

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear()
    return [current - 1, current, current + 1]
  }, [])

  const classFee = Number(form.classFee) || 0
  const tuitionFee = toNum(form.tuitionFee)
  const concession = Math.max(0, classFee - tuitionFee)

  const fundLabels = useMemo(() => {
    const byId = Object.fromEntries((lookups.fundTypes || []).map((f) => [f.id, f.name]))
    return {
      2: byId[2] || 'Admission Fee',
      3: byId[3] || 'Misc Charges',
      4: byId[4] || 'Prev Balance',
      5: byId[5] || 'Transport Charges',
    }
  }, [lookups.fundTypes])

  const filledFunds = useMemo(() => {
    const rows = [
      { key: 'admissionFee', label: fundLabels[2], amount: toNum(form.admissionFee) },
      { key: 'miscCharges', label: fundLabels[3], amount: toNum(form.miscCharges) },
      { key: 'prevBalance', label: fundLabels[4], amount: toNum(form.prevBalance) },
      { key: 'transportCharges', label: fundLabels[5], amount: toNum(form.transportCharges) },
    ]
    return rows.filter((row) => row.amount > 0)
  }, [form.admissionFee, form.miscCharges, form.prevBalance, form.transportCharges, fundLabels])

  const fundsSummaryLabel = useMemo(() => {
    if (filledFunds.length === 0) return ''
    const parts = filledFunds.map((row) => `${row.amount} (${row.label})`)
    return `Generate funds ${parts.join(', ')}`
  }, [filledFunds])

  const tuitionPeriodLabel = `Generate Tuition Fee for ${monthShort(tfMonth)} ${tfYear}`

  const validate = useCallback((current = form) => {
    const next = {}
    if (!String(current.fullName || '').trim()) next.fullName = true
    if (!String(current.gender || '').trim()) next.gender = true
    if (!isEdit) {
      if (!String(current.familyCode || '').trim()) next.familyCode = true
      if (!String(current.classCompositeId || '').trim()) next.classCompositeId = true
      ;['admissionFee', 'miscCharges', 'prevBalance', 'transportCharges'].forEach((key) => {
        if (current[key] === '' || current[key] == null) next[key] = true
      })
    }
    return next
  }, [form, isEdit])

  useEffect(() => {
    if (!showErrors) return
    setErrors(validate(form))
  }, [form, showErrors, validate])

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [classRows, lookupRows] = await Promise.all([getClasses(), getAdmissionLookups()])
      setClasses(classRows || [])
      setLookups((current) => ({ ...current, ...lookupRows }))

      if (isEdit) {
        const detail = await getStudentAdmissionDetail(editRegId)
        setForm(mapDetailToForm(detail))
      } else {
        setForm(emptyForm())
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || (isEdit ? 'Could not load student.' : 'Could not load admission form data.'))
      if (isEdit) navigate('/campus/students')
    } finally {
      setIsLoading(false)
    }
  }, [editRegId, isEdit, navigate])

  useEffect(() => {
    load()
  }, [load])

  const setValue = (name, value) => setForm((current) => ({ ...current, [name]: value }))

  const onClassChange = (classCompositeId) => {
    if (isEdit) return
    const selected = classes.find((c) => String(c.id) === String(classCompositeId))
    const fee = selected?.fee ?? 0
    setForm((current) => ({
      ...current,
      classCompositeId,
      classFee: fee,
      tuitionFee: current.tuitionFee === '' ? String(fee) : current.tuitionFee,
      branchLabel: selected?.branch || '',
    }))
  }

  const generateFamilyCode = async () => {
    if (isEdit) return
    try {
      const code = await getNextFamilyCode()
      setForm((current) => ({
        ...current,
        familyCode: String(code),
        familyFromExisting: false,
      }))
      toast.success(`Family code ${code} ready.`)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not generate family code.')
    }
  }

  const clearFamily = () => {
    if (isEdit) return
    setForm((current) => ({
      ...current,
      familyCode: '',
      familyFromExisting: false,
      fatherName: '',
      motherName: '',
      fatherCNIC: '',
      motherCNIC: '',
      fatherQualificationId: '',
      motherQualificationId: '',
      fatherMobileNo: '',
      motherPhoneNo: '',
      fatherOccupationId: '',
      motherOccupationId: '',
      homePhone: '',
      homeAddress: current.homeAddress,
    }))
  }

  const applyFamily = (family) => {
    if (isEdit) return
    setForm((current) => ({
      ...current,
      familyCode: String(family.familyId),
      familyFromExisting: true,
      fatherName: family.fatherName || '',
      motherName: family.motherName || '',
      fatherCNIC: family.fatherCNIC || '',
      motherCNIC: family.motherCNIC || '',
      fatherMobileNo: family.fatherMobileNo || '',
      motherPhoneNo: family.motherPhoneNo || '',
      fatherOccupationId: family.fatherOccupationID ?? '',
      motherOccupationId: family.motherOccupationID ?? '',
      fatherQualificationId: family.fatherQualificationID ?? '',
      motherQualificationId: family.motherQualificationID ?? '',
      homePhone: family.homePhone || '',
      homeAddress: family.homeAddress || current.homeAddress,
    }))
    setFamilyModalOpen(false)
    const fatherLabel = String(family.fatherName || '').trim() || '—'
    toast.success(`Family Data Found : ${fatherLabel}`)
    window.setTimeout(() => {
      familyInfoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const runFamilySearch = async () => {
    setFamilySearching(true)
    try {
      setFamilyResults(await searchFamilies(familyQuery))
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Family search failed.')
    } finally {
      setFamilySearching(false)
    }
  }

  const buildProfilePayload = () => ({
    fullName: form.fullName.trim(),
    nameInUrdu: form.nameInUrdu.trim() || null,
    homeAddress: form.homeAddress.trim() || null,
    localityId: form.localityId === '' ? null : Number(form.localityId),
    caste: form.caste.trim() || null,
    gender: form.gender || null,
    isOrphan: Boolean(form.isOrphan),
    isHafiz: Boolean(form.isHafiz),
    religion: form.religion || null,
    dateOfBirth: form.dateOfBirth || null,
    bFormNum: form.bFormNum.trim() || null,
    subjectGroupId: form.subjectGroupId === '' ? null : Number(form.subjectGroupId),
    medium: form.medium || null,
    prevSchoolName: form.prevSchoolName.trim() || null,
    prevSchoolClass: form.prevSchoolClass.trim() || null,
    fatherName: form.fatherName.trim() || null,
    motherName: form.motherName.trim() || null,
    fatherCNIC: form.fatherCNIC.trim() || null,
    motherCNIC: form.motherCNIC.trim() || null,
    fatherQualificationId: form.fatherQualificationId === '' ? null : Number(form.fatherQualificationId),
    motherQualificationId: form.motherQualificationId === '' ? null : Number(form.motherQualificationId),
    fatherMobileNo: form.fatherMobileNo.trim() || null,
    motherPhoneNo: form.motherPhoneNo.trim() || null,
    fatherOccupationId: form.fatherOccupationId === '' ? null : Number(form.fatherOccupationId),
    motherOccupationId: form.motherOccupationId === '' ? null : Number(form.motherOccupationId),
    homePhone: form.homePhone.trim() || null,
    specialNotes: form.specialNotes.trim() || null,
    regDate: form.regDate || null,
  })

  const submitUpdate = async () => {
    setIsSaving(true)
    const toastId = 'student-update'
    toast.loading('Saving student...', { id: toastId })
    try {
      const result = await updateStudent(editRegId, buildProfilePayload())
      toast.success(`Updated #${result.regId} — ${result.fullName}`, { id: toastId })
      navigate('/campus/students')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update student.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const openGenerateDialog = (event) => {
    event.preventDefault()
    const nextErrors = validate(form)
    setShowErrors(true)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error('Please fill the highlighted required fields.')
      const first = ERROR_FIELD_ORDER.find((key) => nextErrors[key])
        || Object.keys(nextErrors)[0]
      if (first) {
        window.setTimeout(() => scrollToField(first), 50)
      }
      return
    }

    if (isEdit) {
      void submitUpdate()
      return
    }

    setTfAmount(String(tuitionFee || classFee || 0))
    setTfMonth(new Date().getMonth() + 1)
    setTfYear(new Date().getFullYear())
    setGenerateTf(true)
    const hasFunds = [
      toNum(form.admissionFee),
      toNum(form.miscCharges),
      toNum(form.prevBalance),
      toNum(form.transportCharges),
    ].some((n) => n > 0)
    setGenerateFunds(hasFunds)
    setGenerateOpen(true)
  }

  const submitRegister = async () => {
    setIsSaving(true)
    const toastId = 'student-register'
    toast.loading('Registering student...', { id: toastId })
    try {
      const payload = {
        ...buildProfilePayload(),
        familyCode: Number(form.familyCode),
        classCompositeId: Number(form.classCompositeId),
        sessionSpan: form.sessionSpan.trim() || null,
        tuitionFee,
        classFee,
        feeConcession: concession,
        admissionFee: toNum(form.admissionFee),
        miscCharges: toNum(form.miscCharges),
        prevBalance: toNum(form.prevBalance),
        transportCharges: toNum(form.transportCharges),
        generateTuitionFee: generateTf,
        tuitionMonth: generateTf ? Number(tfMonth) : null,
        tuitionYear: generateTf ? Number(tfYear) : null,
        tuitionGenerateAmount: generateTf ? toNum(tfAmount) : null,
        generateFunds: generateFunds && filledFunds.length > 0,
        fundYear: generateFunds && filledFunds.length > 0 ? Number(tfYear) : null,
      }

      const result = await registerStudent(payload)
      toast.success(`Registered #${result.regId} — ${result.fullName}`, { id: toastId })
      setGenerateOpen(false)
      navigate('/campus/students')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not register student.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const headerContext = isEdit ? 'Edit Student' : 'Add Student'
  const officeLocked = isEdit

  if (isLoading) {
    return (
      <CampusShell headerContext={headerContext}>
        <div className="flex min-h-screen items-center justify-center gap-2 pt-16 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--campus-primary)]" />
          {isEdit ? 'Loading student...' : 'Loading admission form...'}
        </div>
      </CampusShell>
    )
  }

  return (
    <CampusShell headerContext={headerContext}>
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <form onSubmit={openGenerateDialog} className="w-full space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => navigate('/campus/students')}
                className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                title="Back to students"
                aria-label="Back to students"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                <GraduationCap size={18} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  {isEdit ? 'Edit student' : 'Admission form'}
                </h1>
                <p className="text-sm text-slate-500">
                  {isEdit
                    ? `Update profile for registration #${editRegId}.`
                    : 'Register a student and optionally generate tuition / funds.'}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm md:p-5">
            <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
              {/* Student Info — ~7 rows */}
              <div className={`${panelClass} border-sky-100 bg-sky-50/40`}>
                <div className="mb-1 flex items-center gap-2 border-b border-sky-100/80 pb-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-sky-100 text-sky-700">
                    <User size={16} />
                  </div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-sky-700">Student info</h2>
                </div>
                <div className={grid2}>
                  <label className={labelClass}>Full name
                    <input data-field="fullName" className={`${fieldClass(errors.fullName)} mt-1`} value={form.fullName} onChange={(e) => setValue('fullName', e.target.value)} />
                    {errors.fullName ? <span className="mt-1 block text-xs text-rose-600">Required</span> : null}
                  </label>
                  <label className={labelClass}>Name (Urdu)
                    <input className={`${fieldClass(false)} mt-1`} dir="rtl" value={form.nameInUrdu} onChange={(e) => setValue('nameInUrdu', e.target.value)} />
                  </label>
                </div>
                <label className={labelClass}>Address
                  <input className={`${fieldClass(false)} mt-1`} value={form.homeAddress} onChange={(e) => setValue('homeAddress', e.target.value)} />
                </label>
                <div className={grid2}>
                  <label className={labelClass}>Locality
                    <select className={`${fieldClass(false)} mt-1`} value={form.localityId} onChange={(e) => setValue('localityId', e.target.value)}>
                      <option value="">-- select --</option>
                      {(lookups.localities || []).map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>Caste
                    <input className={`${fieldClass(false)} mt-1`} value={form.caste} onChange={(e) => setValue('caste', e.target.value)} />
                  </label>
                </div>
                <div className={grid2}>
                  <label className={labelClass}>Date of birth
                    <input type="date" className={`${fieldClass(false)} mt-1`} value={form.dateOfBirth} onChange={(e) => setValue('dateOfBirth', e.target.value)} />
                  </label>
                  <label className={labelClass}>Form-B No.
                    <input className={`${fieldClass(false)} mt-1`} value={form.bFormNum} onChange={(e) => setValue('bFormNum', e.target.value)} />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <fieldset data-field="gender" className={`rounded-lg border bg-white px-3 py-2 ${errors.gender ? 'border-rose-500' : 'border-slate-200'}`}>
                    <legend className="px-1 text-xs font-semibold uppercase text-slate-500">Gender</legend>
                    {['Male', 'Female'].map((g) => (
                      <label key={g} className="mr-3 inline-flex items-center gap-1.5 text-sm text-slate-700">
                        <input type="radio" name="gender" checked={form.gender === g} onChange={() => setValue('gender', g)} className="accent-[var(--campus-primary)]" />
                        {g}
                      </label>
                    ))}
                  </fieldset>
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Flags</div>
                    <label className="mr-3 inline-flex items-center gap-1.5 text-sm"><input type="checkbox" checked={form.isOrphan} onChange={(e) => setValue('isOrphan', e.target.checked)} className="accent-[var(--campus-primary)]" />Orphan</label>
                    <label className="inline-flex items-center gap-1.5 text-sm"><input type="checkbox" checked={form.isHafiz} onChange={(e) => setValue('isHafiz', e.target.checked)} className="accent-[var(--campus-primary)]" />Hafiz</label>
                  </div>
                  <fieldset className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <legend className="px-1 text-xs font-semibold uppercase text-slate-500">Religion</legend>
                    {['Muslim', 'Non-Muslim'].map((r) => (
                      <label key={r} className="mr-3 inline-flex items-center gap-1.5 text-sm text-slate-700">
                        <input type="radio" name="religion" checked={form.religion === r} onChange={() => setValue('religion', r)} className="accent-[var(--campus-primary)]" />
                        {r}
                      </label>
                    ))}
                  </fieldset>
                </div>
                <div className={grid2}>
                  <label className={labelClass}>Subject group
                    <select className={`${fieldClass(false)} mt-1`} value={form.subjectGroupId} onChange={(e) => setValue('subjectGroupId', e.target.value)}>
                      <option value="">N/A</option>
                      {(lookups.subjectGroups || []).map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>Medium
                    <select className={`${fieldClass(false)} mt-1`} value={form.medium} onChange={(e) => setValue('medium', e.target.value)}>
                      {(lookups.mediums || ['English', 'Urdu']).map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className={grid2}>
                  <label className={labelClass}>Previous school
                    <input className={`${fieldClass(false)} mt-1`} value={form.prevSchoolName} onChange={(e) => setValue('prevSchoolName', e.target.value)} />
                  </label>
                  <label className={labelClass}>Previous class
                    <input className={`${fieldClass(false)} mt-1`} value={form.prevSchoolClass} onChange={(e) => setValue('prevSchoolClass', e.target.value)} />
                  </label>
                </div>
              </div>

              {/* Family Info — special notes fills remaining height */}
              <div ref={familyInfoRef} className={`${panelClass} scroll-mt-20 border-emerald-100 bg-emerald-50/40`}>
                <div className="mb-1 flex items-center gap-2 border-b border-emerald-100/80 pb-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Users size={16} />
                  </div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-700">Family info</h2>
                </div>
                <div className={grid2}>
                  <label className={labelClass}>Father name
                    <input className={`${fieldClass(false)} mt-1`} value={form.fatherName} onChange={(e) => setValue('fatherName', e.target.value)} />
                  </label>
                  <label className={labelClass}>Mother name
                    <input className={`${fieldClass(false)} mt-1`} value={form.motherName} onChange={(e) => setValue('motherName', e.target.value)} />
                  </label>
                </div>
                <div className={grid2}>
                  <label className={labelClass}>Father CNIC
                    <input className={`${fieldClass(false)} mt-1`} value={form.fatherCNIC} onChange={(e) => setValue('fatherCNIC', e.target.value)} />
                  </label>
                  <label className={labelClass}>Mother CNIC
                    <input className={`${fieldClass(false)} mt-1`} value={form.motherCNIC} onChange={(e) => setValue('motherCNIC', e.target.value)} />
                  </label>
                </div>
                <div className={grid2}>
                  <label className={labelClass}>Father mobile
                    <input className={`${fieldClass(false)} mt-1`} value={form.fatherMobileNo} onChange={(e) => setValue('fatherMobileNo', e.target.value)} />
                  </label>
                  <label className={labelClass}>Mother mobile
                    <input className={`${fieldClass(false)} mt-1`} value={form.motherPhoneNo} onChange={(e) => setValue('motherPhoneNo', e.target.value)} />
                  </label>
                </div>
                <div className={grid2}>
                  <label className={labelClass}>Father qualification
                    <select className={`${fieldClass(false)} mt-1`} value={form.fatherQualificationId} onChange={(e) => setValue('fatherQualificationId', e.target.value)}>
                      <option value="">N/A</option>
                      {(lookups.qualifications || []).map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>Mother qualification
                    <select className={`${fieldClass(false)} mt-1`} value={form.motherQualificationId} onChange={(e) => setValue('motherQualificationId', e.target.value)}>
                      <option value="">N/A</option>
                      {(lookups.qualifications || []).map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className={grid2}>
                  <label className={labelClass}>Father occupation
                    <select className={`${fieldClass(false)} mt-1`} value={form.fatherOccupationId} onChange={(e) => setValue('fatherOccupationId', e.target.value)}>
                      <option value="">N/A</option>
                      {(lookups.occupations || []).map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>Mother occupation
                    <select className={`${fieldClass(false)} mt-1`} value={form.motherOccupationId} onChange={(e) => setValue('motherOccupationId', e.target.value)}>
                      <option value="">N/A</option>
                      {(lookups.occupations || []).map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className={labelClass}>Home phone
                  <input className={`${fieldClass(false)} mt-1`} value={form.homePhone} onChange={(e) => setValue('homePhone', e.target.value)} />
                </label>
                <label className={`${labelClass} flex min-h-0 flex-1 flex-col`}>
                  Special notes
                  <textarea
                    className="mt-1 min-h-[120px] w-full flex-1 resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--campus-primary)]"
                    value={form.specialNotes}
                    onChange={(e) => setValue('specialNotes', e.target.value)}
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm md:p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">For office use</h2>
            <div className={grid3}>
              <label className={labelClass}>Reg date
                <input type="date" className={`${fieldClass(false)} mt-1`} value={form.regDate} onChange={(e) => setValue('regDate', e.target.value)} />
              </label>
              <label className={labelClass}>Reg no.
                <input className={`${fieldClass(false, true)} mt-1`} value={isEdit ? String(editRegId) : '[Autogenerate]'} disabled />
              </label>
              <label className={labelClass}>Family code
                <div className="mt-1 flex gap-2" data-field="familyCode">
                  <input
                    className={`${fieldClass(errors.familyCode, true)} flex-1`}
                    value={form.familyCode}
                    disabled
                    placeholder="Use + or search"
                    readOnly
                  />
                  {!officeLocked ? (
                    <>
                      <button type="button" onClick={() => void generateFamilyCode()} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white" title="Generate new family code" aria-label="Generate family code">
                        <Plus size={18} />
                      </button>
                      <button type="button" onClick={() => { setFamilyModalOpen(true); setFamilyQuery(''); setFamilyResults([]) }} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-[var(--campus-primary)]" title="Search family" aria-label="Search family">
                        <Search size={18} />
                      </button>
                      <button type="button" onClick={clearFamily} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-rose-600" title="Clear family" aria-label="Clear family">
                        <X size={18} />
                      </button>
                    </>
                  ) : null}
                </div>
                {!officeLocked && errors.familyCode ? <span className="mt-1 block text-xs text-rose-600">Required — generate (+) or look up family</span> : null}
                {!officeLocked && form.familyFromExisting ? <span className="mt-1 block text-xs text-emerald-700">Sibling of existing family</span> : null}
              </label>
            </div>
            <div className={grid3}>
              <label className={labelClass}>Class
                <select
                  data-field="classCompositeId"
                  className={`${fieldClass(errors.classCompositeId, officeLocked)} mt-1`}
                  value={form.classCompositeId}
                  disabled={officeLocked}
                  onChange={(e) => onClassChange(e.target.value)}
                >
                  <option value="">-- select --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.className}</option>
                  ))}
                </select>
                {!officeLocked && errors.classCompositeId ? <span className="mt-1 block text-xs text-rose-600">Required</span> : null}
              </label>
              <label className={labelClass}>Branch
                <input className={`${fieldClass(false, true)} mt-1`} value={form.branchLabel || '—'} disabled />
              </label>
              <label className={labelClass}>Session
                <input
                  className={`${fieldClass(false, officeLocked)} mt-1`}
                  value={form.sessionSpan}
                  disabled={officeLocked}
                  onChange={(e) => setValue('sessionSpan', e.target.value)}
                />
              </label>
            </div>
            <div className={grid3}>
              <label className={labelClass}>Class fee
                <input className={`${fieldClass(false, true)} mt-1`} value={classFee} disabled />
              </label>
              <label className={labelClass}>Tuition fee
                <input
                  type="number"
                  min="0"
                  className={`${fieldClass(false, officeLocked)} mt-1`}
                  value={form.tuitionFee}
                  disabled={officeLocked}
                  onChange={(e) => setValue('tuitionFee', e.target.value)}
                />
              </label>
              <label className={labelClass}>Concession
                <input className={`${fieldClass(false, true)} mt-1`} value={concession} disabled />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className={labelClass}>{fundLabels[2]}
                <input
                  data-field="admissionFee"
                  type="number"
                  min="0"
                  required={!officeLocked}
                  className={`${fieldClass(errors.admissionFee, officeLocked)} mt-1`}
                  value={form.admissionFee}
                  disabled={officeLocked}
                  onChange={(e) => setValue('admissionFee', e.target.value)}
                />
                {!officeLocked && errors.admissionFee ? <span className="mt-1 block text-xs text-rose-600">Required</span> : null}
              </label>
              <label className={labelClass}>{fundLabels[3]}
                <input
                  data-field="miscCharges"
                  type="number"
                  min="0"
                  required={!officeLocked}
                  className={`${fieldClass(errors.miscCharges, officeLocked)} mt-1`}
                  value={form.miscCharges}
                  disabled={officeLocked}
                  onChange={(e) => setValue('miscCharges', e.target.value)}
                />
                {!officeLocked && errors.miscCharges ? <span className="mt-1 block text-xs text-rose-600">Required</span> : null}
              </label>
              <label className={labelClass}>{fundLabels[4]}
                <input
                  data-field="prevBalance"
                  type="number"
                  min="0"
                  required={!officeLocked}
                  className={`${fieldClass(errors.prevBalance, officeLocked)} mt-1`}
                  value={form.prevBalance}
                  disabled={officeLocked}
                  onChange={(e) => setValue('prevBalance', e.target.value)}
                />
                {!officeLocked && errors.prevBalance ? <span className="mt-1 block text-xs text-rose-600">Required</span> : null}
              </label>
              <label className={labelClass}>{fundLabels[5]}
                <input
                  data-field="transportCharges"
                  type="number"
                  min="0"
                  required={!officeLocked}
                  className={`${fieldClass(errors.transportCharges, officeLocked)} mt-1`}
                  value={form.transportCharges}
                  disabled={officeLocked}
                  onChange={(e) => setValue('transportCharges', e.target.value)}
                />
                {!officeLocked && errors.transportCharges ? <span className="mt-1 block text-xs text-rose-600">Required</span> : null}
              </label>
            </div>
          </section>

          <div className="flex justify-end gap-2 pb-8">
            <button type="button" onClick={() => navigate('/campus/students')} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700">Cancel</button>
            <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-5 py-2.5 text-sm font-semibold text-white">
              <Save size={16} /> {isEdit ? 'Save changes' : 'Save'}
            </button>
          </div>
        </form>
      </div>

      {familyModalOpen && !officeLocked ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">Find family</h2>
              <button type="button" onClick={() => setFamilyModalOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  name="filterFamilySearch"
                  placeholder="Family code, father or mother name"
                  value={familyQuery}
                  onChange={(e) => setFamilyQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void runFamilySearch()
                    }
                  }}
                  {...FILTER_INPUT_AUTOCOMPLETE_PROPS}
                />
                <button type="button" onClick={() => void runFamilySearch()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-medium text-white">
                  {familySearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  Search
                </button>
              </div>
              <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-slate-200">
                {familyResults.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-500">Search to find an existing family.</p>
                ) : (
                  familyResults.map((row) => (
                    <button
                      key={row.familyId}
                      type="button"
                      onClick={() => applyFamily(row)}
                      className="flex w-full flex-col gap-0.5 border-b border-slate-100 px-4 py-3 text-left hover:bg-indigo-50"
                    >
                      <span className="font-semibold text-slate-900">Family {row.familyId}</span>
                      <span className="text-sm text-slate-600">{row.fatherName || '—'} / {row.motherName || '—'}</span>
                      <span className="text-xs text-slate-500">{row.siblingCount || 0} sibling(s) · {row.homeAddress || 'No address'}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {generateOpen && !isEdit ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">Generate fee & funds?</h2>
              <p className="mt-1 text-sm text-slate-500">Choose what to create for this new student.</p>
            </div>
            <div className="space-y-4 px-5 py-5">
              <label className="flex items-start gap-2 text-sm font-medium text-slate-800">
                <input type="checkbox" checked={generateTf} onChange={(e) => setGenerateTf(e.target.checked)} disabled={isSaving} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--campus-primary)]" />
                <span>{tuitionPeriodLabel}</span>
              </label>
              {generateTf ? (
                <div className="grid grid-cols-3 gap-2 pl-6">
                  <label className={labelClass}>Amount
                    <input type="number" min="0" disabled={isSaving} className={`${inputClass} mt-1`} value={tfAmount} onChange={(e) => setTfAmount(e.target.value)} />
                  </label>
                  <label className={labelClass}>Month
                    <select disabled={isSaving} className={`${inputClass} mt-1`} value={Number(tfMonth)} onChange={(e) => setTfMonth(Number(e.target.value))}>
                      {MONTH_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>Year
                    <select
                      disabled={isSaving}
                      className={`${inputClass} mt-1`}
                      value={Number(tfYear)}
                      onChange={(e) => setTfYear(Number(e.target.value))}
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
              {filledFunds.length > 0 ? (
                <label className="flex items-start gap-2 text-sm font-medium text-slate-800">
                  <input type="checkbox" checked={generateFunds} onChange={(e) => setGenerateFunds(e.target.checked)} disabled={isSaving} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--campus-primary)]" />
                  <span>{fundsSummaryLabel}</span>
                </label>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 bg-slate-50 px-5 py-4">
              <button type="button" disabled={isSaving} onClick={() => setGenerateOpen(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium">Back</button>
              <button type="button" disabled={isSaving} onClick={() => void submitRegister()} className="inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white">
                <Save size={16} />
                Confirm & register
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isSaving ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-md">
          <div className="flex min-w-[260px] flex-col items-center gap-3 rounded-2xl bg-white px-8 py-7 shadow-2xl">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--campus-primary)]" />
            <p className="text-base font-semibold text-slate-800">{isEdit ? 'Saving Student' : 'Registering Student'}</p>
          </div>
        </div>
      ) : null}
    </CampusShell>
  )
}

export default CampusStudentAdmitPage
