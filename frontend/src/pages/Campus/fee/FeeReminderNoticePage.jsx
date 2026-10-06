import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Mail, Printer } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { getClasses } from '../../../services/classService'
import { resolveClassLabel } from '../../../services/classSort'
import {
  getFeeReminderClassBalances,
  getFeeReminderTemplates,
} from '../../../services/feeReminderNoticeService'
import {
  buildFeeReminderVoucherHtml,
  FEE_REMINDER_VOUCHER_STYLES,
  formatIssuanceDate,
  formatNoticeDueDate,
  MONTH_NAMES,
  printFeeReminderNotices,
  richBodyPlainText,
} from '../../../utils/feeReminderNoticePrint.js'

const STEPS = ['Class & notice', 'Select students', 'Print preview']
const PER_PAGE_KEY = 'feeReminderNoticesPerPage'

const inputClass =
  'mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition focus:border-[#405189] focus:ring-2 focus:ring-indigo-100'

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function noticeAmount(row, includeFunds) {
  const tf = Number(row.tuitionBalance) || 0
  const funds = Number(row.fundsBalance) || 0
  return tf + (includeFunds ? funds : 0)
}

function FeeReminderNoticePage() {
  const [step, setStep] = useState(0)
  const [templates, setTemplates] = useState([])
  const [noticeCode, setNoticeCode] = useState('pre_due')

  const [dueMonth, setDueMonth] = useState(() => new Date().getMonth())
  const [dueYear, setDueYear] = useState(() => new Date().getFullYear())

  const [classOptions, setClassOptions] = useState([])
  const [className, setClassName] = useState('')
  const [includeFunds, setIncludeFunds] = useState(true)
  const [rows, setRows] = useState([])
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [isLoadingClass, setIsLoadingClass] = useState(false)

  const [noticesPerPage, setNoticesPerPage] = useState(() => {
    const stored = Number(localStorage.getItem(PER_PAGE_KEY))
    return stored >= 1 && stored <= 3 ? stored : 3
  })

  const issuanceDate = useMemo(() => formatIssuanceDate(new Date()), [])

  const activeTemplate = useMemo(
    () => templates.find((t) => t.code === noticeCode) || null,
    [templates, noticeCode],
  )

  const dueDateLabel = useMemo(() => {
    if (noticeCode !== 'pre_due' || !activeTemplate) return ''
    const day = activeTemplate.dayOfMonth ?? 10
    return formatNoticeDueDate(day, dueMonth, dueYear)
  }, [noticeCode, activeTemplate, dueMonth, dueYear])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [classes, tpl] = await Promise.all([getClasses().catch(() => []), getFeeReminderTemplates()])
        if (cancelled) return
        setClassOptions(Array.isArray(classes) ? classes : [])
        setTemplates(Array.isArray(tpl) ? tpl : [])
      } catch {
        if (!cancelled) toast.error('Could not load notice settings.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const loadClassBalances = useCallback(async (name) => {
    const trimmed = String(name || '').trim()
    if (!trimmed) {
      setRows([])
      setSelectedIds(new Set())
      return
    }
    setIsLoadingClass(true)
    try {
      const data = await getFeeReminderClassBalances(trimmed)
      const items = (Array.isArray(data?.items) ? data.items : [])
        .map((row) => ({
          studentId: row.studentId ?? row.StudentId,
          studentName: row.studentName ?? row.StudentName ?? 'N/A',
          className: row.className ?? row.ClassName,
          tuitionBalance: row.tuitionBalance ?? row.TuitionBalance ?? 0,
          fundsBalance: row.fundsBalance ?? row.FundsBalance ?? 0,
          isAbsentToday: Boolean(row.isAbsentToday ?? row.IsAbsentToday),
        }))
        .filter((row) => Number(row.tuitionBalance) !== 0 || Number(row.fundsBalance) !== 0)
      setRows(items)
      setSelectedIds(
        new Set(
          items.filter((r) => r.studentId && !r.isAbsentToday).map((r) => r.studentId),
        ),
      )
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not load students for this class.')
      setRows([])
      setSelectedIds(new Set())
    } finally {
      setIsLoadingClass(false)
    }
  }, [])

  useEffect(() => {
    if (className) loadClassBalances(className)
  }, [className, loadClassBalances])

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.has(r.studentId)),
    [rows, selectedIds],
  )

  const selectableRows = useMemo(() => rows.filter((r) => !r.isAbsentToday), [rows])

  const allSelected =
    selectableRows.length > 0 && selectableRows.every((r) => selectedIds.has(r.studentId))

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(selectableRows.map((r) => r.studentId).filter(Boolean)))
  }

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const templateReady = Boolean(
    activeTemplate?.title?.trim() && richBodyPlainText(activeTemplate?.bodyText),
  )

  const noticePayloads = useMemo(() => {
    if (!activeTemplate) return []
    return selectedRows.map((row) => ({
      code: noticeCode,
      title: activeTemplate.title,
      greeting: activeTemplate.greeting,
      bodyText: activeTemplate.bodyText,
      closingText: activeTemplate.closingText,
      studentId: row.studentId,
      studentName: row.studentName,
      className: row.className || className,
      amount: noticeAmount(row, includeFunds),
      dueDateLabel,
      issuanceDate,
    }))
  }, [selectedRows, noticeCode, activeTemplate, includeFunds, dueDateLabel, issuanceDate, className])

  const canGoNextClass = Boolean(className?.trim()) && templateReady
  const canGoNextStudents = selectedIds.size > 0 && !isLoadingClass && rows.length > 0

  const canGoNext = useMemo(() => {
    if (step === 0) return canGoNextClass
    if (step === 1) return canGoNextStudents
    return false
  }, [step, canGoNextClass, canGoNextStudents])

  const goBack = () => {
    if (step > 0) setStep(step - 1)
  }

  const goNext = () => {
    if (step >= STEPS.length - 1 || !canGoNext) return
    setStep(step + 1)
  }

  const handlePerPageChange = (value) => {
    const n = Number(value)
    setNoticesPerPage(n)
    localStorage.setItem(PER_PAGE_KEY, String(n))
  }

  const handlePrint = () => {
    if (!templateReady) {
      toast.error('Notice wording is not set up yet. Ask an administrator to complete Institute Settings.')
      return
    }
    if (!noticePayloads.length) {
      toast.error('Select at least one student.')
      return
    }
    printFeeReminderNotices(noticePayloads, noticesPerPage)
  }

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear()
    return [y - 1, y, y + 1]
  }, [])

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <CampusShell
        headerContext="Fee Reminder Notice"
        rowClassName="print-main-wrap flex min-h-screen w-full"
        asideClassName="no-print"
        headerClassName="no-print"
      >
        <div className="mx-auto w-full max-w-6xl space-y-4 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-amber-50 p-2 text-amber-700">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Fee Reminder Notice</h1>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  Print fee reminder vouchers for selected students in a class. Wording comes from{' '}
                  <Link to="/campus/settings/profile" className="text-[#405189] hover:underline">
                    Institute Settings
                  </Link>
                  .
                </p>
              </div>
            </div>
          </section>

        <div className="mb-2 flex flex-wrap items-center gap-2">
          {STEPS.map((label, index) => {
            const isActive = index === step
            const isComplete = index < step
            const canJump = index <= step
            return (
              <button
                key={label}
                type="button"
                disabled={!canJump}
                onClick={() => {
                  if (canJump) setStep(index)
                }}
                className={`flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-medium transition ${
                  isActive
                    ? 'bg-[#405189] text-white'
                    : isComplete
                      ? 'cursor-pointer bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                      : 'cursor-not-allowed bg-slate-100 text-slate-500'
                }`}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className="font-semibold">{index + 1}.</span>
                {label}
              </button>
            )
          })}
        </div>

        <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 px-4 text-[13px] text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#405189] px-4 text-[13px] font-medium text-white disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <span className="h-9 w-px" aria-hidden="true" />
          )}
        </div>

        {step === 0 && (
          <div className="space-y-5">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800">Notice type</h2>
              <div className="mt-3 flex flex-wrap gap-4">
                {[
                  { code: 'pre_due', label: 'Fee Reminder Voucher (before due date)' },
                  { code: 'last_due', label: 'Last Fee Reminder (past due date)' },
                ].map((opt) => (
                  <label key={opt.code} className="flex cursor-pointer items-center gap-2 text-[13px]">
                    <input
                      type="radio"
                      name="noticeType"
                      checked={noticeCode === opt.code}
                      onChange={() => setNoticeCode(opt.code)}
                      className="h-4 w-4 accent-[#405189]"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              {!templateReady && (
                <p className="mt-3 text-[12px] text-amber-800">
                  This notice type is not set up yet.{' '}
                  <Link to="/campus/settings/profile" className="font-medium text-[#405189] hover:underline">
                    Open Institute Settings
                  </Link>{' '}
                  to add the wording.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-5 md:grid-cols-2 md:items-start">
                {noticeCode === 'pre_due' && templateReady ? (
                  <div>
                    <h2 className="text-sm font-semibold text-slate-800">Due date on this print run</h2>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-[12px] font-medium text-slate-600">Due month</label>
                        <select
                          className={inputClass}
                          value={dueMonth}
                          onChange={(e) => setDueMonth(Number(e.target.value))}
                        >
                          {MONTH_NAMES.map((name, idx) => (
                            <option key={name} value={idx}>{name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[12px] font-medium text-slate-600">Due year</label>
                        <select
                          className={inputClass}
                          value={dueYear}
                          onChange={(e) => setDueYear(Number(e.target.value))}
                        >
                          {yearOptions.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="mt-2 text-[12px] text-slate-600">
                      Due date on notice: <strong className="text-slate-800">{dueDateLabel}</strong>
                    </p>
                  </div>
                ) : null}
                <div className={noticeCode === 'pre_due' && templateReady ? '' : 'md:col-span-2'}>
                  <h2 className="text-sm font-semibold text-slate-800">Choose class</h2>
                  <div className="mt-3 max-w-md">
                    <label className="text-[12px] font-medium text-slate-600">Class</label>
                    <select
                      className={inputClass}
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                    >
                      <option value="">Select class</option>
                      {classOptions.map((row) => {
                        const label = resolveClassLabel(row)
                        return (
                          <option key={row.id ?? label} value={label}>
                            {label}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Select students</h2>
                  <p className="mt-0.5 text-[12px] text-slate-500">Class: {className}</p>
                </div>
                <label className="flex items-center gap-2 text-[13px] text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeFunds}
                    onChange={(e) => setIncludeFunds(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-[#405189]"
                  />
                  Include Funds balance in notice amount
                </label>
              </div>

              {isLoadingClass && (
                <div className="mt-4 flex items-center gap-2 text-[13px] text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading students…
                </div>
              )}

              {!isLoadingClass && (
                <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-[13px] leading-snug">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 w-10">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            className="h-4 w-4 rounded border-slate-300 accent-[#405189]"
                            aria-label="Select all students"
                          />
                        </th>
                        <th className="px-3 py-2">Reg #</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Class/Sec</th>
                        <th className="px-3 py-2 text-right">TF</th>
                        <th className="px-3 py-2 text-right">Funds</th>
                        <th className="px-3 py-2 text-right">Notice amt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                            No students with outstanding balances in this class.
                          </td>
                        </tr>
                      ) : (
                        rows.map((row) => (
                          <tr key={row.studentId} className="border-t border-slate-100">
                            <td className="px-3 py-1.5">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(row.studentId)}
                                onChange={() => toggleRow(row.studentId)}
                                className="h-4 w-4 rounded border-slate-300 accent-[#405189]"
                              />
                            </td>
                            <td className="px-3 py-1.5">{row.studentId}</td>
                            <td className="px-3 py-1.5">
                              <span className="inline-flex flex-wrap items-center gap-1.5">
                                <span>{row.studentName}</span>
                                {row.isAbsentToday ? (
                                  <span
                                    className="rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-medium text-rose-800"
                                  >
                                    Absent
                                  </span>
                                ) : null}
                              </span>
                            </td>
                            <td className="px-3 py-1.5">{row.className || className}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{money(row.tuitionBalance)}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{money(row.fundsBalance)}</td>
                            <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                              {money(noticeAmount(row, includeFunds))}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <label className="text-[12px] font-medium text-slate-600">Notices per page</label>
                <select
                  className={`${inputClass} mt-1 w-32`}
                  value={noticesPerPage}
                  onChange={(e) => handlePerPageChange(e.target.value)}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#405189] px-4 text-[13px] font-medium text-white"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
            </section>

            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[12px] text-slate-500">
                Preview ({noticePayloads.length} notice{noticePayloads.length === 1 ? '' : 's'})
              </p>
              {noticePayloads.slice(0, 6).map((notice) => (
                <div
                  key={notice.studentId}
                  className="fee-reminder-preview overflow-hidden rounded border border-slate-300 bg-white"
                  dangerouslySetInnerHTML={{ __html: buildFeeReminderVoucherHtml(notice) }}
                />
              ))}
              {noticePayloads.length > 6 && (
                <p className="text-[12px] text-slate-500">
                  …and {noticePayloads.length - 6} more on print.
                </p>
              )}
            </div>

            <style>{FEE_REMINDER_VOUCHER_STYLES}</style>
          </div>
        )}
        </div>
      </CampusShell>
    </div>
  )
}

export default FeeReminderNoticePage
