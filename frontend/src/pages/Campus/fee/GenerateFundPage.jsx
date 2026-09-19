import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  GraduationCap,
  HandCoins,
  Hash,
  Loader2,
  Users,
  UserRound,
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
import {
  generateFundBulk,
  generateFundForStudent,
  getStudentFunds,
} from '../../../services/fundGenerateService'
import { getCampusFundTypes, hasCampusPermission } from '../../../services/authService'
import { getClasses } from '../../../services/classService'

const ANNUAL_FUND_TYPE_IDS = [2, 3, 4, 5]

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
  menu: (base) => ({ ...base, zIndex: 80 }),
  menuPortal: (base) => ({ ...base, zIndex: 80 }),
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
    sky: 'bg-sky-50 text-sky-700',
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

function resolveAnnualFundTypes() {
  const cached = getCampusFundTypes().filter((f) => ANNUAL_FUND_TYPE_IDS.includes(f.id))
  if (cached.length > 0) {
    return ANNUAL_FUND_TYPE_IDS.map((id) => {
      const match = cached.find((f) => f.id === id)
      return { id, name: match?.name || `Fund ${id}` }
    })
  }
  return ANNUAL_FUND_TYPE_IDS.map((id) => ({ id, name: `Fund ${id}` }))
}

export default function GenerateFundPage() {
  const canAll = hasCampusPermission('generate_fund_all')
  const canSingle = hasCampusPermission('generate_fund_single')
  const fundTypes = useMemo(() => resolveAnnualFundTypes(), [])

  const [mode, setMode] = useState(canSingle ? 'student' : 'bulk')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [detail, setDetail] = useState(null)
  const [amounts, setAmounts] = useState(() =>
    Object.fromEntries(fundTypes.map((t) => [t.id, ''])),
  )
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [classes, setClasses] = useState([])
  const [bulkFundTypeId, setBulkFundTypeId] = useState(fundTypes[0]?.id || 2)
  const [bulkAmount, setBulkAmount] = useState('')
  const [bulkClassId, setBulkClassId] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const loadStudentOptions = useRef(
    debouncePromise(async (inputValue) => {
      const term = inputValue?.trim()
      if (!term || term.length < 2) return []
      const items = await searchStudents(term, 20)
      return items.map(mapStudentToSelectOption)
    }, 300),
  ).current

  useEffect(() => {
    if (!canAll) return
    getClasses()
      .then((rows) => setClasses(rows || []))
      .catch(() => setClasses([]))
  }, [canAll])

  const loadStudent = useCallback(
    async (regId) => {
      if (!regId) {
        setDetail(null)
        setAmounts(Object.fromEntries(fundTypes.map((t) => [t.id, ''])))
        return
      }
      setIsLoadingDetail(true)
      try {
        const [admission, funds] = await Promise.all([
          getStudentAdmissionDetail(regId),
          getStudentFunds(regId),
        ])
        setDetail(admission)
        const next = Object.fromEntries(fundTypes.map((t) => [t.id, '']))
        for (const item of funds?.amounts || []) {
          if (item?.fundTypeId != null) {
            next[item.fundTypeId] = item.amount != null ? String(item.amount) : ''
          }
        }
        setAmounts(next)
      } catch (error) {
        setDetail(null)
        toast.error(error?.response?.data?.message || 'Could not load student funds.')
      } finally {
        setIsLoadingDetail(false)
      }
    },
    [fundTypes],
  )

  const onStudentChange = (option) => {
    setSelectedStudent(option)
    loadStudent(Number(option?.value) || 0)
  }

  const canSubmit = useMemo(() => {
    if (isGenerating) return false
    if (mode === 'student') {
      if (!canSingle || !detail) return false
      return fundTypes.some((t) => {
        const raw = amounts[t.id]
        if (raw === '' || raw == null) return false
        const n = Number(raw)
        return !Number.isNaN(n) && n >= 0
      })
    }
    if (!canAll) return false
    const amount = Number(bulkAmount)
    return !Number.isNaN(amount) && amount >= 0 && Boolean(bulkFundTypeId)
  }, [amounts, bulkAmount, bulkFundTypeId, canAll, canSingle, detail, fundTypes, isGenerating, mode])

  const confirmDescription = useMemo(() => {
    if (mode === 'student' && detail) {
      const parts = fundTypes
        .map((t) => {
          const raw = amounts[t.id]
          if (raw === '' || raw == null) return null
          return `${t.name}: ${money(raw)}`
        })
        .filter(Boolean)
      return `Generate funds for #${detail.regId} — ${detail.fullName || 'student'} (${parts.join(', ')}).`
    }
    const typeName = fundTypes.find((t) => t.id === Number(bulkFundTypeId))?.name || 'fund'
    const classLabel = bulkClassId
      ? classes.find((c) => String(c.id) === String(bulkClassId))?.className ||
        classes.find((c) => String(c.id) === String(bulkClassId))?.name ||
        `class ${bulkClassId}`
      : 'all active students'
    return `Generate ${typeName} of ${money(bulkAmount)} for ${classLabel}.`
  }, [amounts, bulkAmount, bulkClassId, bulkFundTypeId, classes, detail, fundTypes, mode])

  const openConfirm = (event) => {
    event.preventDefault()
    if (!canSubmit) return
    setConfirmOpen(true)
  }

  const performGenerate = async () => {
    if (!canSubmit) return
    setIsGenerating(true)
    const toastId = 'generate-fund'
    toast.loading('Generating funds…', { id: toastId })
    try {
      if (mode === 'student') {
        const payloadAmounts = fundTypes
          .map((t) => {
            const raw = amounts[t.id]
            if (raw === '' || raw == null) return null
            return {
              fundTypeId: t.id,
              name: t.name,
              amount: Number(raw),
            }
          })
          .filter(Boolean)
        const regId = detail.regId
        await generateFundForStudent({
          studentId: regId,
          amounts: payloadAmounts,
        })
        toast.success(`Funds generated for #${regId}.`, { id: toastId })
        setSelectedStudent(null)
        setDetail(null)
        setAmounts(Object.fromEntries(fundTypes.map((t) => [t.id, ''])))
      } else {
        await generateFundBulk({
          fundTypeId: Number(bulkFundTypeId),
          amount: Number(bulkAmount),
          classCompositeId: bulkClassId ? Number(bulkClassId) : null,
        })
        toast.success('Funds generated.', { id: toastId })
        setBulkAmount('')
        setBulkClassId('')
      }
      setConfirmOpen(false)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not generate funds.', { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }

  if (!canAll && !canSingle) {
    return (
      <CampusShell headerContext="Generate Fund">
        <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
          <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 text-[13px] text-slate-600 shadow-sm">
            You don&apos;t have access to generate funds.
          </div>
        </div>
      </CampusShell>
    )
  }

  return (
    <CampusShell headerContext="Generate Fund">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-3xl space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-sky-50 p-2 text-sky-700">
                <HandCoins className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Generate Fund</h1>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  Create admission and other annual fund charges for a student, a class, or everyone.
                </p>
              </div>
            </div>
          </section>

          <form onSubmit={openConfirm} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
            <div>
              <p className="mb-2 text-[13px] font-medium text-slate-700">Generate for</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {canSingle ? (
                  <RadioCard
                    name="fund-mode"
                    checked={mode === 'student'}
                    onChange={() => setMode('student')}
                    title="One student"
                    description="Set admission and other funds for a single student."
                    icon={UserRound}
                    iconClass="bg-indigo-50 text-[var(--campus-primary)]"
                    disabled={isGenerating}
                  />
                ) : null}
                {canAll ? (
                  <RadioCard
                    name="fund-mode"
                    checked={mode === 'bulk'}
                    onChange={() => setMode('bulk')}
                    title="Class / all students"
                    description="Apply one fund type and amount across a class or everyone."
                    icon={Users}
                    iconClass="bg-sky-50 text-sky-700"
                    disabled={isGenerating}
                  />
                ) : null}
              </div>
            </div>

            {mode === 'student' ? (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
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
                  />
                </PrefixedSelectShell>

                {isLoadingDetail ? (
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-[13px] text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading student…
                  </div>
                ) : null}

                {detail ? (
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    <StatCard
                      icon={Hash}
                      label="Reg. no."
                      value={`#${detail.regId}`}
                      tone="sky"
                    />
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
                  </div>
                ) : !isLoadingDetail ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-white/80 px-3.5 py-4 text-center text-[13px] text-slate-500">
                    Search and select a student to continue.
                  </p>
                ) : null}

                <div>
                  <p className="mb-2 text-[13px] font-medium text-slate-700">Fund amounts</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {fundTypes.map((t) => (
                      <label
                        key={t.id}
                        className="block rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[13px] font-medium text-slate-700 shadow-sm"
                      >
                        {t.name}
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className={inputClass}
                          value={amounts[t.id] ?? ''}
                          onChange={(e) =>
                            setAmounts((prev) => ({
                              ...prev,
                              [t.id]: e.target.value,
                            }))
                          }
                          placeholder="0"
                          disabled={isGenerating || !detail}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <label className="block text-[13px] font-medium text-slate-700">
                  Fund type
                  <select
                    className={inputClass}
                    value={bulkFundTypeId}
                    onChange={(e) => setBulkFundTypeId(Number(e.target.value))}
                    disabled={isGenerating}
                  >
                    {fundTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[13px] font-medium text-slate-700">
                  Amount
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className={inputClass}
                    value={bulkAmount}
                    onChange={(e) => setBulkAmount(e.target.value)}
                    placeholder="Enter amount"
                    disabled={isGenerating}
                  />
                </label>
                <label className="block text-[13px] font-medium text-slate-700">
                  Class
                  <select
                    className={inputClass}
                    value={bulkClassId}
                    onChange={(e) => setBulkClassId(e.target.value)}
                    disabled={isGenerating}
                  >
                    <option value="">All active students</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.className || c.name || `Class ${c.id}`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-[13px] font-semibold text-white transition hover:bg-[#364574] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Generate fund
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Generate funds?"
        description={confirmDescription}
        confirmLabel="Generate fund"
        busy={isGenerating}
        icon={<HandCoins size={21} />}
        onCancel={() => !isGenerating && setConfirmOpen(false)}
        onConfirm={performGenerate}
      />
    </CampusShell>
  )
}
