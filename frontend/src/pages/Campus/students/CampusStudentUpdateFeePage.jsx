import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Banknote, Loader2, RefreshCw, UserRound, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import AsyncSelect from 'react-select/async'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import {
  DECIMAL_INPUT_ATTRS,
  INTEGER_INPUT_ATTRS,
  readDecimalInput,
  readIntegerInput,
} from '../../../utils/numericInput.js'
import { generateFeeForStudent, getFeeGenerateStudentPeriod } from '../../../services/feeGenerateService'
import { getPakistanDateParts } from '../../../utils/pakistanDate.js'
import {
  getStudentAdmissionDetail,
  mapStudentToSelectOption,
  searchStudents,
  updateStudentTuitionFee,
} from '../../../services/studentService'

const embeddedSelectStyles = {
  control: (base) => ({
    ...base,
    minHeight: '40px',
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

const feeFieldClass =
  'mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600'

function debouncePromise(fn, waitMs) {
  let timer
  return (...args) =>
    new Promise((resolve, reject) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(async () => {
        try {
          resolve(await fn(...args))
        } catch (error) {
          reject(error)
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

function formatDelta(value) {
  const amount = Number(value)
  if (!amount) return '—'
  const formatted = Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  return amount > 0 ? `+${formatted}` : `−${formatted}`
}

function CompareTable({ rows }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-[13px] leading-snug">
        <thead>
          <tr className="bg-slate-50 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2 text-left font-medium"> </th>
            <th className="px-3 py-2 text-right font-medium">Before</th>
            <th className="px-3 py-2 text-right font-medium">After</th>
            <th className="px-3 py-2 text-right font-medium">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const changed = row.afterValue != null && row.afterValue !== row.beforeValue
            const delta = changed ? row.afterValue - row.beforeValue : null
            return (
              <tr key={row.label} className={changed ? 'bg-amber-50/80' : 'bg-white'}>
                <td className="px-3 py-1.5 font-medium text-slate-700">{row.label}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-slate-800">{money(row.beforeValue)}</td>
                <td
                  className={`px-3 py-1.5 text-right tabular-nums font-semibold ${
                    changed ? 'text-emerald-700' : 'text-slate-800'
                  }`}
                >
                  {row.afterValue == null ? '—' : money(row.afterValue)}
                </td>
                <td
                  className={`px-3 py-1.5 text-right tabular-nums font-semibold ${
                    delta == null ? 'text-slate-400' : delta > 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {delta == null ? '—' : formatDelta(delta)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function parseAmount(value) {
  if (value === '' || value == null) return null
  const amount = Number(value)
  return Number.isNaN(amount) ? null : amount
}

function focusField(ref) {
  const el = ref.current
  if (!el) return
  el.focus()
  el.select?.()
}

function CampusStudentUpdateFeePage() {
  const studentSelectRef = useRef(null)
  const totalInputRef = useRef(null)
  const tuitionInputRef = useRef(null)
  const confirmButtonRef = useRef(null)
  const focusTotalAfterLoad = useRef(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [detail, setDetail] = useState(null)
  const [totalInput, setTotalInput] = useState('')
  const [tuitionInput, setTuitionInput] = useState('')
  const [description, setDescription] = useState('')
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCheckingMonth, setIsCheckingMonth] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [monthChargeBlocked, setMonthChargeBlocked] = useState(false)
  const [periodContext, setPeriodContext] = useState(null)

  const loadStudentOptions = useRef(
    debouncePromise(async (inputValue) => {
      const term = inputValue?.trim()
      if (!term || (term.length < 2 && !/^\d+$/.test(term))) return []
      const items = await searchStudents(term, 20, { exactNumericRegId: true })
      return items.map(mapStudentToSelectOption)
    }, 300),
  ).current

  const focusStudentSearch = useCallback(() => {
    requestAnimationFrame(() => studentSelectRef.current?.focus())
  }, [])

  const clearForm = useCallback(() => {
    setSelectedStudent(null)
    setDetail(null)
    setTotalInput('')
    setTuitionInput('')
    setDescription('')
    setPeriodContext(null)
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
      setTotalInput(data.classFee != null ? String(Math.trunc(Number(data.classFee) || 0)) : '0')
      setTuitionInput(data.tuitionFee != null ? String(data.tuitionFee) : '0')
      setDescription('')
    } catch (error) {
      setDetail(null)
      toast.error(error?.response?.data?.message || 'Could not load student.')
    } finally {
      setIsLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    const regId = Number(selectedStudent?.value)
    if (regId) loadDetail(regId)
    else {
      setDetail(null)
      setTotalInput('')
      setTuitionInput('')
      setDescription('')
    }
  }, [selectedStudent, loadDetail])

  useEffect(() => {
    if (isLoadingDetail || !detail || !focusTotalAfterLoad.current) return
    focusTotalAfterLoad.current = false
    requestAnimationFrame(() => focusField(totalInputRef))
  }, [isLoadingDetail, detail])

  useEffect(() => {
    const regId = detail?.regId
    if (!regId) {
      setPeriodContext(null)
      return
    }
    const { month, year } = getPakistanDateParts()
    let cancelled = false
    void (async () => {
      try {
        const data = await getFeeGenerateStudentPeriod(regId, month, year)
        if (!cancelled) setPeriodContext(data ? { ...data, month, year } : null)
      } catch (error) {
        if (!cancelled) {
          setPeriodContext(null)
          toast.error(error?.response?.data?.message || 'Could not load fee status for this month.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [detail?.regId])

  useEffect(() => {
    if (!confirmOpen) return
    requestAnimationFrame(() => confirmButtonRef.current?.focus())
  }, [confirmOpen])

  const preview = useMemo(() => {
    if (!detail) return null
    const classFee = Number(detail.classFee || 0)
    const currentTuition = Number(detail.tuitionFee || 0)
    const currentConcession = Number(detail.feeConcession ?? Math.max(0, classFee - currentTuition))
    const nextTotal = parseAmount(totalInput)
    const nextTuition = parseAmount(tuitionInput)
    const amountsReady = nextTotal != null && nextTuition != null
    const nextConcession = amountsReady ? Math.max(0, nextTotal - nextTuition) : null
    const unchanged = amountsReady && nextTotal === classFee && nextTuition === currentTuition

    return {
      className: detail.className || '—',
      classFee,
      currentTuition,
      currentConcession,
      nextTotal,
      nextTuition,
      nextConcession,
      unchanged,
      invalid: !amountsReady || nextTotal < 0 || nextTuition < 0,
    }
  }, [detail, totalInput, tuitionInput])

  const canSubmit =
    Boolean(detail) &&
    preview &&
    !preview.invalid &&
    !preview.unchanged &&
    !isSaving

  const periodReceived = Number(periodContext?.received ?? 0)
  const periodGenerated = Number(periodContext?.generated ?? 0)
  const periodLabel = periodContext
    ? `${MONTH_NAMES[(periodContext.month || 1) - 1]} ${periodContext.year}`
    : ''
  const monthFee =
    periodGenerated > 0 && preview?.nextTuition != null && periodGenerated !== preview.nextTuition
      ? {
          generated: periodGenerated,
          received: periodReceived,
          month: periodContext.month,
          year: periodContext.year,
          label: periodLabel,
        }
      : null

  const openConfirm = async (event) => {
    event.preventDefault()
    if (!canSubmit || !detail || preview.nextTuition == null) return
    const { month, year } = getPakistanDateParts()
    setIsCheckingMonth(true)
    try {
      const data = await getFeeGenerateStudentPeriod(detail.regId, month, year)
      setPeriodContext(data ? { ...data, month, year } : null)
    } catch (error) {
      setPeriodContext(null)
      toast.error(error?.response?.data?.message || 'Could not load fee status for this month.')
    } finally {
      setIsCheckingMonth(false)
      setMonthChargeBlocked(false)
      setConfirmOpen(true)
    }
  }

  const performUpdate = async (overwriteMonth) => {
    if (!canSubmit || !detail || preview.nextTuition == null || preview.nextTotal == null) return
    if (overwriteMonth && preview.nextTuition < periodReceived) {
      setMonthChargeBlocked(true)
      return
    }
    setIsSaving(true)
    const toastId = 'student-fee-update'
    toast.loading('Updating fee...', { id: toastId })
    try {
      try {
        await updateStudentTuitionFee(detail.regId, {
          tuitionFee: preview.nextTuition,
          totalFee: preview.nextTotal,
          description: description.trim() || null,
        })
      } catch (error) {
        const message = error?.response?.data?.message || ''
        const alreadySaved = /already set/i.test(message)
        if (!overwriteMonth || !alreadySaved) throw error
      }
      if (overwriteMonth && monthFee) {
        await generateFeeForStudent({
          studentId: detail.regId,
          month: monthFee.month,
          year: monthFee.year,
          amount: preview.nextTuition,
        })
      }
      toast.success(overwriteMonth && monthFee ? 'Fee updated, including this month.' : 'Fee updated.', {
        id: toastId,
      })
      setConfirmOpen(false)
      clearForm()
      focusStudentSearch()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update fee.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const totalChanged = preview && preview.nextTotal != null && preview.nextTotal !== preview.classFee
  const tuitionChanged = preview && preview.nextTuition != null && preview.nextTuition !== preview.currentTuition

  return (
    <CampusShell headerContext="Update Fee">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-5xl space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-emerald-50 p-2 text-emerald-700">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">Update Fee</h1>
                  <p className="mt-0.5 text-[13px] text-slate-500">
                    Change a student’s total fee or actual fee. Concession updates on its own.
                  </p>
                </div>
              </div>
              {detail ? (
                <button
                  type="button"
                  onClick={() => loadDetail(detail.regId)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingDetail ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              ) : null}
            </div>

            <div className="relative z-20 mt-4 flex justify-center">
              <PrefixedSelectShell icon={UserRound} label="Student" className="max-w-xl">
                <AsyncSelect
                  ref={studentSelectRef}
                  cacheOptions
                  defaultOptions={false}
                  loadOptions={loadStudentOptions}
                  value={selectedStudent}
                  onChange={(option) => {
                    focusTotalAfterLoad.current = Boolean(option)
                    setSelectedStudent(option)
                  }}
                  placeholder="Search by name or ID"
                  isClearable
                  className="text-sm"
                  styles={embeddedSelectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  menuPosition="fixed"
                  noOptionsMessage={({ inputValue }) =>
                    inputValue?.trim()?.length >= 2 ? 'No students found' : 'Type at least 2 characters'
                  }
                />
              </PrefixedSelectShell>
            </div>
          </section>

          {isLoadingDetail && (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
            </div>
          )}

          {!isLoadingDetail && detail && preview && (
            <div className="grid items-stretch gap-4 lg:grid-cols-2">
              <form onSubmit={openConfirm} className="flex h-full flex-col rounded-2xl bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">Fee</h2>
                <div className="mt-4 flex flex-1 flex-col space-y-3">
                  <label className="block text-[12px] font-medium text-slate-600">
                    Total fee
                    <input
                      {...INTEGER_INPUT_ATTRS}
                      ref={totalInputRef}
                      className={feeFieldClass}
                      value={totalInput}
                      onChange={(e) => setTotalInput(readIntegerInput(e))}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return
                        e.preventDefault()
                        focusField(tuitionInputRef)
                      }}
                    />
                  </label>
                  <label className="block text-[12px] font-medium text-slate-600">
                    Concession
                    <input
                      className={feeFieldClass}
                      value={preview.nextConcession == null ? '' : String(preview.nextConcession)}
                      disabled
                      readOnly
                    />
                  </label>
                  <label className="block text-[12px] font-medium text-slate-600">
                    Actual fee
                    <input
                      {...DECIMAL_INPUT_ATTRS}
                      ref={tuitionInputRef}
                      className={feeFieldClass}
                      value={tuitionInput}
                      onChange={(e) => setTuitionInput(readDecimalInput(e))}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' || isCheckingMonth) return
                        e.preventDefault()
                        openConfirm(e)
                      }}
                    />
                  </label>
                  <div className="mt-auto flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={!canSubmit || isCheckingMonth}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-5 text-[13px] font-medium text-white hover:bg-[#364574] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isCheckingMonth ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                      Update
                    </button>
                  </div>
                </div>
              </form>

              <section className="flex h-full flex-col rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{detail.fullName}</h2>
                    <p className="text-[13px] text-slate-500">
                      ID {detail.regId}
                      {detail.fatherName ? ` · ${detail.fatherName}` : ''}
                    </p>
                  </div>
                  <p className="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-medium text-slate-700">
                    {preview.className}
                  </p>
                </div>

                <h3 className="mb-3 mt-4 text-sm font-semibold text-slate-900">Before and after</h3>
                <CompareTable
                  rows={[
                    {
                      label: 'Total fee',
                      beforeValue: preview.classFee,
                      afterValue: preview.nextTotal,
                    },
                    {
                      label: 'Actual fee',
                      beforeValue: preview.currentTuition,
                      afterValue: preview.nextTuition == null || Number.isNaN(preview.nextTuition)
                        ? null
                        : preview.nextTuition,
                    },
                    {
                      label: 'Concession',
                      beforeValue: preview.currentConcession,
                      afterValue: preview.nextConcession,
                    },
                  ]}
                />
                <p className="mt-3 text-[12px] text-slate-500">
                  Concession is total fee minus actual fee.
                </p>

                <label className="mt-auto block pt-4 text-[12px] font-medium text-slate-600">
                  Note (optional)
                  <input
                    type="text"
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' || isCheckingMonth) return
                      e.preventDefault()
                      openConfirm(e)
                    }}
                    placeholder="Optional note"
                    maxLength={1000}
                  />
                </label>
              </section>
            </div>
          )}
        </div>
      </div>

      {confirmOpen && detail && preview ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fee-confirm-title"
            className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <Banknote size={21} />
              </div>
              <button
                type="button"
                onClick={() => !isSaving && setConfirmOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close confirmation"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-5">
              <h2 id="fee-confirm-title" className="text-lg font-bold text-slate-900">
                Update fee?
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {detail.fullName}&apos;s concession becomes{' '}
                <span className="font-semibold text-slate-800">{money(preview.nextConcession)}</span>.
                {totalChanged ? (
                  <>
                    {' '}
                    Total fee changes from{' '}
                    <span className="font-semibold text-slate-800">{money(preview.classFee)}</span> to{' '}
                    <span className="font-semibold text-slate-800">{money(preview.nextTotal)}</span>.
                  </>
                ) : null}
                {tuitionChanged ? (
                  <>
                    {' '}
                    Actual fee changes from{' '}
                    <span className="font-semibold text-slate-800">{money(preview.currentTuition)}</span> to{' '}
                    <span className="font-semibold text-slate-800">{money(preview.nextTuition)}</span>.
                  </>
                ) : null}
              </p>
              {monthFee ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-950">
                  <p>
                    {monthFee.label} fee is already generated ({money(monthFee.generated)}). Update it to{' '}
                    {money(preview.nextTuition)} as well?
                  </p>
                  {monthChargeBlocked ? (
                    <>
                      <p className="mt-1.5">
                        Tuition for <span className="font-semibold">{periodLabel}</span> already has{' '}
                        <span className="font-semibold">{money(periodReceived)}</span> received
                        {periodGenerated > 0 ? (
                          <>
                            {' '}
                            (current charge <span className="font-semibold">{money(periodGenerated)}</span>)
                          </>
                        ) : null}
                        . The new charge cannot be less than the amount received.
                      </p>
                      <p className="mt-2">
                        To charge less,{' '}
                        <Link
                          to="/campus/fee/void-receipt"
                          className="font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950"
                        >
                          void the receipt
                        </Link>{' '}
                        first, then update again.
                      </p>
                    </>
                  ) : null}
                </div>
              ) : null}
              {description.trim() ? (
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
                  <span className="font-medium text-slate-800">Note: </span>
                  {description.trim()}
                </p>
              ) : null}
            </div>
            <div className="flex flex-nowrap items-center justify-end gap-2 bg-slate-50 px-5 py-4">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setConfirmOpen(false)}
                className="shrink-0 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              {monthFee ? (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => performUpdate(false)}
                  className="shrink-0 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                >
                  No, leave this month
                </button>
              ) : null}
              <button
                ref={confirmButtonRef}
                type="button"
                disabled={isSaving || monthChargeBlocked}
                onClick={() => performUpdate(Boolean(monthFee))}
                className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[#364574] disabled:opacity-60"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Banknote size={16} />}
                {monthFee ? 'Yes, update this month' : 'Update fee'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </CampusShell>
  )
}

export default CampusStudentUpdateFeePage
