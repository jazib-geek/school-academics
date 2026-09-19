import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Banknote,
  CalendarDays,
  GraduationCap,
  Loader2,
  Users,
  UserRound,
  X,
} from 'lucide-react'
import AsyncSelect from 'react-select/async'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import ConfirmDialog from '../../../components/campus/ConfirmDialog.jsx'
import {
  getStudentAdmissionDetail,
  mapStudentToSelectOption,
  searchStudents,
} from '../../../services/studentService'
import { generateFeeForAll, generateFeeForStudent } from '../../../services/feeGenerateService'
import { hasCampusPermission } from '../../../services/authService'
import { getCampusPrintMeta } from '../../../utils/campusProfile'

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

const embeddedSelectStyles = {
  control: (base) => ({
    ...base,
    minHeight: '42px',
    border: 'none',
    borderRadius: '0 0.75rem 0.75rem 0',
    boxShadow: 'none',
    backgroundColor: 'transparent',
    '&:hover': { border: 'none' },
  }),
  valueContainer: (base) => ({
    ...base,
    paddingLeft: 10,
    paddingRight: 4,
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  menu: (base) => ({ ...base, zIndex: 120 }),
  menuPortal: (base) => ({ ...base, zIndex: 120 }),
}

const inputClass =
  'mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

function debouncePromise(fn, waitMs) {
  let timer
  let pending
  return (...args) =>
    new Promise((resolve, reject) => {
      if (timer) clearTimeout(timer)
      pending = { resolve, reject }
      timer = setTimeout(async () => {
        try {
          pending.resolve(await fn(...args))
        } catch (error) {
          pending.reject(error)
        }
      }, waitMs)
    })
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function buildYearOptions() {
  const { feeYears } = getCampusPrintMeta()
  if (Array.isArray(feeYears) && feeYears.length > 0) return feeYears
  const current = new Date().getFullYear()
  return [current, current + 1]
}

function RadioCard({ name, checked, onChange, title, description, icon: Icon, iconClass, disabled }) {
  return (
    <label
      className={`relative flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
        checked
          ? 'border-[var(--campus-primary)] bg-[#405189]/[0.06] shadow-sm ring-1 ring-[#405189]/30'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
      } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      <input
        type="radio"
        name={name}
        className="sr-only"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      {Icon ? (
        <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${iconClass}`}>
          <Icon size={18} />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-slate-900">{title}</p>
        {description ? <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{description}</p> : null}
      </div>
      <span
        className={`mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${
          checked ? 'border-[var(--campus-primary)] bg-[var(--campus-primary)]' : 'border-slate-300 bg-white'
        }`}
        aria-hidden
      >
        {checked ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
      </span>
    </label>
  )
}

function PrefixedSelectShell({ icon: Icon, label, children, className = '' }) {
  return (
    <div
      className={`flex w-full items-stretch rounded-xl border border-slate-300 bg-white shadow-sm focus-within:border-[var(--campus-primary)] focus-within:ring-2 focus-within:ring-indigo-100 ${className}`}
    >
      <div className="flex shrink-0 items-center gap-1.5 rounded-l-xl border-r border-slate-200 bg-slate-50 px-3 text-slate-600">
        <Icon size={16} className="text-[var(--campus-primary)]" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, tone }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    indigo: 'bg-indigo-50 text-[var(--campus-primary)]',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 shadow-sm">
      <div className="flex items-start gap-3 px-3.5 py-3">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tones[tone] || tones.slate}`}>
          <Icon size={17} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <p className="mt-0.5 break-words text-[14px] font-semibold leading-snug text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  )
}

export default function GenerateFeePage() {
  const canAll = hasCampusPermission('generate_fee_all')
  const canSingle = hasCampusPermission('generate_fee_single')

  const now = new Date()
  const yearOptions = useMemo(() => buildYearOptions(), [])
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(() => yearOptions[0] ?? now.getFullYear())
  const [mode, setMode] = useState(canAll ? 'all' : 'student')
  const [studentModalOpen, setStudentModalOpen] = useState(!canAll && canSingle)
  const [amountMode, setAmountMode] = useState('tuition')
  const [customAmount, setCustomAmount] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [detail, setDetail] = useState(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [studentGeneratedOnce, setStudentGeneratedOnce] = useState(false)
  const customAmountRef = useRef(null)

  useEffect(() => {
    if (!yearOptions.includes(year)) {
      setYear(yearOptions[0] ?? new Date().getFullYear())
    }
  }, [year, yearOptions])

  useEffect(() => {
    if (amountMode !== 'custom' || !studentModalOpen) return
    const id = window.setTimeout(() => customAmountRef.current?.focus(), 0)
    return () => window.clearTimeout(id)
  }, [amountMode, studentModalOpen])

  const loadStudentOptions = useRef(
    debouncePromise(async (inputValue) => {
      const term = inputValue?.trim()
      if (!term || term.length < 2) return []
      const items = await searchStudents(term, 20)
      return items.map(mapStudentToSelectOption)
    }, 300),
  ).current

  const resetStudentForm = useCallback(() => {
    setSelectedStudent(null)
    setDetail(null)
    setAmountMode('tuition')
    setCustomAmount('')
  }, [])

  const closeStudentModal = useCallback(() => {
    if (isGenerating) return
    setStudentModalOpen(false)
    setConfirmOpen(false)
    setStudentGeneratedOnce(false)
    resetStudentForm()
    if (canAll) setMode('all')
  }, [canAll, isGenerating, resetStudentForm])

  const openStudentModal = useCallback(() => {
    setMode('student')
    setStudentGeneratedOnce(false)
    setStudentModalOpen(true)
  }, [])

  const loadDetail = useCallback(async (regId) => {
    if (!regId) {
      setDetail(null)
      return
    }
    setIsLoadingDetail(true)
    try {
      const data = await getStudentAdmissionDetail(regId)
      setDetail(data)
      setCustomAmount('')
      setAmountMode('tuition')
    } catch (error) {
      setDetail(null)
      toast.error(error?.response?.data?.message || 'Could not load student.')
    } finally {
      setIsLoadingDetail(false)
    }
  }, [])

  const onStudentChange = (option) => {
    setSelectedStudent(option)
    const regId = Number(option?.value)
    if (regId) loadDetail(regId)
    else setDetail(null)
  }

  const monthLabel = MONTHS.find((m) => m.value === Number(month))?.label || 'Selected month'

  const canSubmitAll = canAll && mode === 'all' && !isGenerating && month && year

  const canSubmitStudent = useMemo(() => {
    if (isGenerating || !canSingle || !detail || !month || !year) return false
    if (amountMode === 'custom') {
      if (customAmount === '' || customAmount == null) return false
      const amount = Number(customAmount)
      return !Number.isNaN(amount) && amount >= 0
    }
    return Number(detail.tuitionFee || 0) >= 0
  }, [amountMode, canSingle, customAmount, detail, isGenerating, month, year])

  const confirmAmountLabel = useMemo(() => {
    if (mode === 'all') return 'Student tuition'
    if (!detail) return '—'
    if (amountMode === 'tuition') return money(detail.tuitionFee)
    return money(customAmount)
  }, [amountMode, customAmount, detail, mode])

  const confirmDescription = useMemo(() => {
    const summaryTable = (
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-[13px]">
          <tbody>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="px-3 py-2 font-medium text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={14} className="text-[var(--campus-primary)]" />
                  Month / Year
                </span>
              </th>
              <th className="px-3 py-2 font-medium text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Banknote size={14} className="text-emerald-700" />
                  Amount
                </span>
              </th>
            </tr>
            <tr>
              <td className="px-3 py-2.5 font-semibold text-slate-900">
                {monthLabel} {year}
              </td>
              <td className="px-3 py-2.5 font-semibold text-slate-900">{confirmAmountLabel}</td>
            </tr>
          </tbody>
        </table>
      </div>
    )

    if (mode === 'all') {
      return (
        <>
          <p>This will generate tuition for all active students. It may take a minute.</p>
          {summaryTable}
        </>
      )
    }
    if (!detail) return null
    return (
      <>
        <p>
          Generate fee for #{detail.regId} — {detail.fullName || 'student'}.
        </p>
        {summaryTable}
      </>
    )
  }, [confirmAmountLabel, detail, mode, monthLabel, year])

  const openConfirmAll = (event) => {
    event.preventDefault()
    if (!canSubmitAll) return
    setMode('all')
    setConfirmOpen(true)
  }

  const openConfirmStudent = (event) => {
    event.preventDefault()
    if (!canSubmitStudent) return
    setMode('student')
    setConfirmOpen(true)
  }

  const performGenerate = async () => {
    const generatingAll = mode === 'all'
    if (generatingAll && !canSubmitAll) return
    if (!generatingAll && !canSubmitStudent) return

    setIsGenerating(true)
    const toastId = 'generate-fee'
    toast.loading(
      generatingAll ? 'Generating fee for all students…' : 'Generating fee for student…',
      { id: toastId },
    )

    try {
      if (generatingAll) {
        await generateFeeForAll({ month: Number(month), year: Number(year) })
        toast.success(`Fee generated for ${monthLabel} ${year}.`, { id: toastId })
        setConfirmOpen(false)
      } else {
        const amount = amountMode === 'tuition' ? -1 : Number(customAmount)
        await generateFeeForStudent({
          studentId: detail.regId,
          month: Number(month),
          year: Number(year),
          amount,
        })
        toast.success(
          `Fee generated for #${detail.regId} — ${detail.fullName || 'student'} (${monthLabel} ${year}).`,
          { id: toastId },
        )
        setConfirmOpen(false)
        setStudentGeneratedOnce(true)
        resetStudentForm()
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not generate fee.', { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }

  if (!canAll && !canSingle) {
    return (
      <CampusShell headerContext="Generate Fee">
        <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
          <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 text-[13px] text-slate-600 shadow-sm">
            You don&apos;t have access to generate fee.
          </div>
        </div>
      </CampusShell>
    )
  }

  return (
    <CampusShell headerContext="Generate Fee">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-3xl space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-amber-50 p-2 text-amber-700">
                <Banknote className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Generate Fee</h1>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  Create tuition charges for a month — for everyone, or for one student.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[13px] font-medium text-slate-700">
                Fee month
                <select
                  className={inputClass}
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  disabled={isGenerating}
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[13px] font-medium text-slate-700">
                Year
                <select
                  className={inputClass}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  disabled={isGenerating}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-medium text-slate-700">Generate for</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {canAll ? (
                  <RadioCard
                    name="fee-mode"
                    checked={mode === 'all' && !studentModalOpen}
                    onChange={() => {
                      setMode('all')
                      setStudentModalOpen(false)
                      resetStudentForm()
                    }}
                    title="All students"
                    description={`Charge tuition for every active student in ${monthLabel} ${year}.`}
                    icon={Users}
                    iconClass="bg-amber-50 text-amber-700"
                    disabled={isGenerating}
                  />
                ) : null}
                {canSingle ? (
                  <RadioCard
                    name="fee-mode"
                    checked={mode === 'student' || studentModalOpen}
                    onChange={openStudentModal}
                    title="One student"
                    description="Pick a student and amount in a focused window."
                    icon={UserRound}
                    iconClass="bg-indigo-50 text-[var(--campus-primary)]"
                    disabled={isGenerating}
                  />
                ) : null}
              </div>
            </div>

            {mode === 'all' && canAll && !studentModalOpen ? (
              <form onSubmit={openConfirmAll} className="space-y-3">
                <p className="rounded-xl border border-amber-100 bg-amber-50/80 px-3.5 py-3 text-[13px] leading-relaxed text-amber-950">
                  Tuition will be generated for all active students for{' '}
                  <span className="font-semibold">
                    {monthLabel} {year}
                  </span>
                  . This may take up to a minute.
                </p>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!canSubmitAll}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-[13px] font-semibold text-white transition hover:bg-[#364574] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Generate fee
                  </button>
                </div>
              </form>
            ) : null}

            {canSingle && mode === 'student' && !studentModalOpen ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3.5 py-3">
                <p className="text-[13px] text-slate-700">Continue with a single student for this month.</p>
                <button
                  type="button"
                  onClick={openStudentModal}
                  className="inline-flex h-9 items-center rounded-lg bg-[var(--campus-primary)] px-3.5 text-[13px] font-semibold text-white hover:bg-[#364574]"
                >
                  Open student form
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </div>

      {studentModalOpen ? (
        <div
          role="presentation"
          className="fixed inset-0 z-[85] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={closeStudentModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-fee-title"
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-[var(--campus-primary)]">
                  <UserRound size={20} />
                </div>
                <div>
                  <h2 id="student-fee-title" className="text-base font-semibold text-slate-900">
                    Generate for one student
                  </h2>
                  <p className="mt-0.5 text-[12px] text-slate-500">Tuition charge for the selected month</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeStudentModal}
                disabled={isGenerating}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={openConfirmStudent} className="flex min-h-0 flex-1 flex-col">
              <div className="space-y-4 overflow-y-auto px-5 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-[13px] font-medium text-slate-700">
                    Fee month
                    <select
                      className={inputClass}
                      value={month}
                      onChange={(e) => setMonth(Number(e.target.value))}
                      disabled={isGenerating}
                    >
                      {MONTHS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-[13px] font-medium text-slate-700">
                    Year
                    <select
                      className={inputClass}
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      disabled={isGenerating}
                    >
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <PrefixedSelectShell icon={UserRound} label="Student">
                  <AsyncSelect
                    cacheOptions
                    defaultOptions={false}
                    loadOptions={loadStudentOptions}
                    value={selectedStudent}
                    onChange={onStudentChange}
                    placeholder="Search by name or reg. no."
                    styles={embeddedSelectStyles}
                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                    isClearable
                    isDisabled={isGenerating}
                    autoFocus
                  />
                </PrefixedSelectShell>

                {isLoadingDetail ? (
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[13px] text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading student…
                  </div>
                ) : null}

                {detail ? (
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    <StatCard
                      icon={UserRound}
                      label="Name"
                      value={detail.fullName || '—'}
                      tone="indigo"
                    />
                    <StatCard
                      icon={GraduationCap}
                      label="Class"
                      value={detail.className || '—'}
                      tone="slate"
                    />
                    <StatCard
                      icon={Banknote}
                      label="Tuition"
                      value={money(detail.tuitionFee)}
                      tone="emerald"
                    />
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3.5 py-4 text-center text-[13px] text-slate-500">
                    Search and select a student to continue.
                  </p>
                )}

                <div>
                  <p className="mb-2 text-[13px] font-medium text-slate-700">Amount</p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <RadioCard
                      name="amount-mode"
                      checked={amountMode === 'tuition'}
                      onChange={() => setAmountMode('tuition')}
                      title="Student tuition"
                      description={
                        detail
                          ? `Use stored fee of ${money(detail.tuitionFee)}`
                          : 'Use the student’s saved tuition fee'
                      }
                      icon={Banknote}
                      iconClass="bg-emerald-50 text-emerald-700"
                      disabled={isGenerating || !detail}
                    />
                    <RadioCard
                      name="amount-mode"
                      checked={amountMode === 'custom'}
                      onChange={() => setAmountMode('custom')}
                      title="Custom amount"
                      description="Enter a one-off charge for this month"
                      icon={Banknote}
                      iconClass="bg-amber-50 text-amber-700"
                      disabled={isGenerating || !detail}
                    />
                  </div>
                  {amountMode === 'custom' ? (
                    <label className="mt-3 block text-[13px] font-medium text-slate-700">
                      Amount
                      <input
                        ref={customAmountRef}
                        type="number"
                        min="0"
                        step="1"
                        className={inputClass}
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="Enter amount"
                        disabled={isGenerating || !detail}
                      />
                    </label>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3.5">
                <button
                  type="button"
                  onClick={closeStudentModal}
                  disabled={isGenerating}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {studentGeneratedOnce ? 'Close' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!canSubmitStudent}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-[13px] font-semibold text-white transition hover:bg-[#364574] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Generate fee
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Generate fee?"
        description={confirmDescription}
        confirmLabel="Generate fee"
        busy={isGenerating}
        icon={<Banknote size={21} />}
        onCancel={() => !isGenerating && setConfirmOpen(false)}
        onConfirm={performGenerate}
      />
    </CampusShell>
  )
}
