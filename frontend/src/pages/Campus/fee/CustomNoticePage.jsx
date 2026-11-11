import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Mail, Printer } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import RichTextEditor from '../../../components/campus/RichTextEditor.jsx'
import { getClasses } from '../../../services/classService'
import { getClassGradeRank, resolveClassLabel } from '../../../services/classSort'
import { previewCustomNotice } from '../../../services/customNoticeService'
import { getExamTypes } from '../../../services/examService'
import {
  buildCustomNoticeVoucherHtml,
  CUSTOM_NOTICE_STYLES,
  printCustomNotices,
} from '../../../utils/customNoticePrint.js'
import { richBodyPlainText } from '../../../utils/feeReminderNoticePrint.js'

const PER_PAGE_KEY = 'customNoticesPerPage'
const STEPS = ['Notice', 'Students', 'Preview']

const AUDIENCE_TOKENS = {
  'overall-balance': ['studentName', 'class', 'regNo', 'tuitionBalance', 'fundsBalance', 'overallBalance'],
  'tuition-balance': ['studentName', 'class', 'regNo', 'tuitionBalance'],
  'funds-balance': ['studentName', 'class', 'regNo', 'fundsBalance'],
  'absent-today': ['studentName', 'class', 'regNo'],
  'absent-days': ['studentName', 'class', 'regNo', 'absentDays'],
  'absent-owing': ['studentName', 'class', 'regNo', 'tuitionBalance', 'fundsBalance', 'overallBalance'],
  'low-marks': ['studentName', 'class', 'regNo', 'examName', 'percent'],
  'whole-class': ['studentName', 'class', 'regNo'],
}

const CATEGORIES = [
  { id: 'fees', label: 'Fees' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'exams', label: 'Exams' },
  { id: 'general', label: 'General' },
]

const AUDIENCES = [
  {
    id: 'overall-balance',
    category: 'fees',
    title: 'Overall balance',
    hint: 'Tuition and funds still due',
  },
  {
    id: 'tuition-balance',
    category: 'fees',
    title: 'Tuition balance',
    hint: 'Tuition still due',
  },
  {
    id: 'funds-balance',
    category: 'fees',
    title: 'Funds balance',
    hint: 'Funds still due',
  },
  {
    id: 'absent-today',
    category: 'attendance',
    title: 'Absent today',
    hint: 'Marked absent today',
  },
  {
    id: 'absent-days',
    category: 'attendance',
    title: 'Absent for several days',
    hint: 'Absent on each recent school day',
  },
  {
    id: 'absent-owing',
    category: 'attendance',
    title: 'Absent and still owing',
    hint: 'Absent today with money still due',
  },
  {
    id: 'low-marks',
    category: 'exams',
    title: 'Low marks',
    hint: 'Percent below the mark you set',
  },
  {
    id: 'whole-class',
    category: 'general',
    title: 'Whole class',
    hint: 'Every student in one class',
  },
]

const BALANCE_AUDIENCES = new Set(['overall-balance', 'tuition-balance', 'funds-balance'])

const BALANCE_OPS = [
  { value: 'gte', label: 'At least' },
  { value: 'gt', label: 'More than' },
  { value: 'lte', label: 'At most' },
  { value: 'lt', label: 'Less than' },
  { value: 'eq', label: 'Exactly' },
]

const TOKENS = [
  { id: 'studentName', token: '{studentName}', label: 'Student name' },
  { id: 'class', token: '{class}', label: 'Class' },
  { id: 'regNo', token: '{regNo}', label: 'Reg no.' },
  { id: 'tuitionBalance', token: '{tuitionBalance}', label: 'Tuition' },
  { id: 'fundsBalance', token: '{fundsBalance}', label: 'Funds' },
  { id: 'overallBalance', token: '{overallBalance}', label: 'Overall' },
  { id: 'absentDays', token: '{absentDays}', label: 'Absent days' },
  { id: 'examName', token: '{examName}', label: 'Exam' },
  { id: 'percent', token: '{percent}', label: 'Percent' },
]

const inputClass =
  'mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition focus:border-[#405189] focus:ring-2 focus:ring-indigo-100'

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function normalizeStudentId(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

function compareRows(a, b) {
  const rankA = getClassGradeRank(a.className)
  const rankB = getClassGradeRank(b.className)
  if (rankA !== rankB) return rankA - rankB
  const classCompare = String(a.className || '').localeCompare(String(b.className || ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
  if (classCompare !== 0) return classCompare
  return (normalizeStudentId(a.studentId) ?? 0) - (normalizeStudentId(b.studentId) ?? 0)
}

function mapRow(row) {
  return {
    studentId: normalizeStudentId(row.studentId ?? row.StudentId),
    studentName: row.studentName ?? row.StudentName ?? 'N/A',
    className: row.className ?? row.ClassName ?? '',
    tuitionBalance: Number(row.tuitionBalance ?? row.TuitionBalance ?? 0),
    fundsBalance: Number(row.fundsBalance ?? row.FundsBalance ?? 0),
    overallBalance: Number(row.overallBalance ?? row.OverallBalance ?? 0),
    absentDays: row.absentDays ?? row.AbsentDays ?? null,
    examName: row.examName ?? row.ExamName ?? '',
    percent: row.percent ?? row.Percent ?? null,
  }
}

function CustomNoticePage() {
  const editorRef = useRef(null)
  const [category, setCategory] = useState('fees')
  const [audienceId, setAudienceId] = useState('overall-balance')
  const [classOptions, setClassOptions] = useState([])
  const [examTypes, setExamTypes] = useState([])
  const [className, setClassName] = useState('')
  const [balanceOp, setBalanceOp] = useState('gte')
  const [balanceAmount, setBalanceAmount] = useState('')
  const [absentDays, setAbsentDays] = useState('3')
  const [examTypeId, setExamTypeId] = useState('')
  const [maxPercent, setMaxPercent] = useState('40')
  const [step, setStep] = useState(0)
  const [stepDir, setStepDir] = useState(1)
  const [bodyText, setBodyText] = useState('')
  const [rows, setRows] = useState([])
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [isSearching, setIsSearching] = useState(false)
  const [noticesPerPage, setNoticesPerPage] = useState(() => {
    const stored = Number(localStorage.getItem(PER_PAGE_KEY))
    return stored >= 1 && stored <= 3 ? stored : 2
  })

  const audience = AUDIENCES.find((item) => item.id === audienceId) || AUDIENCES[0]
  const visibleAudiences = AUDIENCES.filter((item) => item.category === category)
  const showBalance = BALANCE_AUDIENCES.has(audienceId)
  const classRequired = audienceId === 'whole-class'
  const visibleTokens = TOKENS.filter((item) => (AUDIENCE_TOKENS[audienceId] || []).includes(item.id))

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [classes, types] = await Promise.all([
          getClasses().catch(() => []),
          getExamTypes().catch(() => []),
        ])
        if (cancelled) return
        setClassOptions(Array.isArray(classes) ? classes : [])
        const list = Array.isArray(types) ? types : []
        setExamTypes(list)
        if (list.length > 0) {
          setExamTypeId(String(list[0].id ?? list[0].Id ?? ''))
        }
      } catch {
        if (!cancelled) toast.error('Could not load classes.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const insertToken = (token) => {
    editorRef.current?.insertText(token)
  }

  const hasMessage = Boolean(richBodyPlainText(bodyText))

  const findStudents = async () => {
    if (classRequired && !className.trim()) {
      toast.error('Choose a class.')
      return false
    }
    if (audienceId === 'absent-days') {
      const days = Number(absentDays)
      if (!Number.isInteger(days) || days < 1 || days > 30) {
        toast.error('Enter how many school days, from 1 to 30.')
        return false
      }
    }
    if (audienceId === 'low-marks') {
      if (!examTypeId) {
        toast.error('Choose an exam.')
        return false
      }
      const percent = Number(maxPercent)
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        toast.error('Enter a percent from 0 to 100.')
        return false
      }
    }
    if (showBalance && balanceAmount !== '') {
      const amount = Number(balanceAmount)
      if (!Number.isFinite(amount) || amount < 0) {
        toast.error('Enter an amount of zero or more.')
        return false
      }
    }

    setIsSearching(true)
    try {
      const data = await previewCustomNotice({
        audienceId,
        className: className.trim() || null,
        balanceOp: showBalance ? balanceOp : null,
        balanceAmount: showBalance && balanceAmount !== '' ? Number(balanceAmount) : null,
        absentDays: audienceId === 'absent-days' ? Number(absentDays) : null,
        examTypeId: audienceId === 'low-marks' ? Number(examTypeId) : null,
        maxPercent: audienceId === 'low-marks' ? Number(maxPercent) : null,
      })
      const items = (Array.isArray(data?.items) ? data.items : Array.isArray(data?.Items) ? data.Items : [])
        .map(mapRow)
        .filter((row) => row.studentId != null)
        .sort(compareRows)
      setRows(items)
      setSelectedIds(new Set(items.map((row) => row.studentId)))
      if (items.length === 0) {
        toast.message('No students match this notice.')
        return false
      }
      return true
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not find students.')
      setRows([])
      setSelectedIds(new Set())
      return false
    } finally {
      setIsSearching(false)
    }
  }

  const goBack = () => {
    if (step === 0) return
    setStepDir(-1)
    setStep(step - 1)
  }

  const goNext = async () => {
    if (step === 0) {
      if (!hasMessage) {
        toast.error('Write the notice before continuing.')
        return
      }
      const found = await findStudents()
      if (!found) return
      setStepDir(1)
      setStep(1)
      return
    }
    if (step === 1) {
      if (selectedIds.size === 0) {
        toast.error('Select at least one student.')
        return
      }
      setStepDir(1)
      setStep(2)
    }
  }

  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.studentId))

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(rows.map((row) => row.studentId)))
  }

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.has(row.studentId)),
    [rows, selectedIds],
  )

  const noticePayloads = useMemo(
    () =>
      selectedRows.map((row) => ({
        ...row,
        bodyText,
      })),
    [selectedRows, bodyText],
  )

  const handlePrint = () => {
    if (!hasMessage) {
      toast.error('Write the notice before printing.')
      return
    }
    if (!noticePayloads.length) {
      toast.error('Select at least one student.')
      return
    }
    printCustomNotices(noticePayloads, noticesPerPage)
  }

  const handlePerPageChange = (value) => {
    const n = Number(value)
    setNoticesPerPage(n)
    localStorage.setItem(PER_PAGE_KEY, String(n))
  }

  const columnCount =
    4 + (showBalance || audienceId === 'absent-owing' ? 3 : 0) + (audienceId === 'absent-days' ? 1 : 0) + (audienceId === 'low-marks' ? 2 : 0)

  const showMoney = showBalance || audienceId === 'absent-owing'
  const canGoNext = step === 0 ? hasMessage && !isSearching : step === 1 ? selectedIds.size > 0 : false

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <CampusShell
        headerContext="Custom Notice"
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
                <h1 className="text-lg font-semibold text-slate-900">Custom Notice</h1>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  Write a message, choose who it is for, then print a slip for each student.
                </p>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-2">
            {STEPS.map((label, index) => {
              const isActive = index === step
              const isComplete = index < step
              return (
                <button
                  key={label}
                  type="button"
                  disabled={!isComplete}
                  onClick={() => {
                    if (!isComplete) return
                    setStepDir(-1)
                    setStep(index)
                  }}
                  className={`flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-medium transition ${
                    isActive
                      ? 'bg-[#405189] text-white'
                      : isComplete
                        ? 'cursor-pointer bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                        : 'cursor-default bg-slate-100 text-slate-500'
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span className="font-semibold">{index + 1}.</span>
                  {label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0 || isSearching}
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
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePrint}
                disabled={!noticePayloads.length}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#405189] px-4 text-[13px] font-medium text-white disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
            )}
          </div>

          <div
            key={step}
            className={`custom-notice-step ${stepDir < 0 ? 'custom-notice-step--back' : ''}`}
          >
          {step === 0 && (
          <div className="grid gap-4 lg:grid-cols-5 lg:items-start">
            <section className="rounded-2xl bg-white p-4 shadow-sm lg:col-span-2">
              <div className="mb-3 flex flex-wrap gap-1.5">
                {CATEGORIES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCategory(item.id)
                      if (audience.category === item.id) return
                      const first = AUDIENCES.find((entry) => entry.category === item.id)
                      if (!first) return
                      setAudienceId(first.id)
                      setRows([])
                      setSelectedIds(new Set())
                    }}
                    className={`rounded-full px-2.5 py-1.5 text-xs font-medium ${
                      category === item.id
                        ? 'bg-[#405189] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="grid gap-2">
                {visibleAudiences.map((item) => {
                  const selected = item.id === audienceId
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setAudienceId(item.id)
                        setRows([])
                        setSelectedIds(new Set())
                      }}
                      className={`rounded-xl border px-3 py-3 text-left ${
                        selected
                          ? 'border-[#405189] bg-indigo-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="text-[13px] font-semibold text-slate-900">{item.title}</div>
                      <div className="mt-0.5 text-[12px] text-slate-500">{item.hint}</div>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm lg:col-span-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">{audience.title}</h2>
                <p className="mt-0.5 text-[12px] text-slate-500">{audience.hint}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className={classRequired ? '' : 'sm:col-span-2'}>
                  <label className="text-[12px] font-medium text-slate-600">
                    Class{classRequired ? '' : ' (optional)'}
                  </label>
                  <select
                    className={inputClass}
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                  >
                    {classRequired ? <option value="">Select class</option> : <option value="">All classes</option>}
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

                {showBalance && (
                  <>
                    <div>
                      <label className="text-[12px] font-medium text-slate-600">Balance</label>
                      <select
                        className={inputClass}
                        value={balanceOp}
                        onChange={(e) => setBalanceOp(e.target.value)}
                      >
                        {BALANCE_OPS.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[12px] font-medium text-slate-600">Amount (optional)</label>
                      <input
                        className={inputClass}
                        inputMode="decimal"
                        value={balanceAmount}
                        onChange={(e) => setBalanceAmount(e.target.value)}
                        placeholder="Any amount still due"
                      />
                    </div>
                  </>
                )}

                {audienceId === 'absent-days' && (
                  <div>
                    <label className="text-[12px] font-medium text-slate-600">School days in a row</label>
                    <input
                      className={inputClass}
                      inputMode="numeric"
                      value={absentDays}
                      onChange={(e) => setAbsentDays(e.target.value)}
                    />
                  </div>
                )}

                {audienceId === 'low-marks' && (
                  <>
                    <div>
                      <label className="text-[12px] font-medium text-slate-600">Exam</label>
                      <select
                        className={inputClass}
                        value={examTypeId}
                        onChange={(e) => setExamTypeId(e.target.value)}
                      >
                        {examTypes.map((item) => {
                          const id = item.id ?? item.Id
                          const name = item.name ?? item.Name ?? `Exam ${id}`
                          return (
                            <option key={id} value={id}>
                              {name}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="text-[12px] font-medium text-slate-600">Below percent</label>
                      <input
                        className={inputClass}
                        inputMode="decimal"
                        value={maxPercent}
                        onChange={(e) => setMaxPercent(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="text-[12px] font-medium text-slate-600">Notice</label>
                <RichTextEditor
                  ref={editorRef}
                  className="mt-1"
                  value={bodyText}
                  onChange={setBodyText}
                  placeholder="Write the notice. Use the buttons to drop in a student's own details."
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {visibleTokens.map((item) => (
                    <button
                      key={item.token}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => insertToken(item.token)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
          )}

          {step === 1 && (
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">
              Students ({selectedIds.size} selected)
            </h2>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-[13px] leading-snug">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="w-10 px-3 py-2">
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
                    {showMoney && (
                      <>
                        <th className="px-3 py-2 text-right">TF</th>
                        <th className="px-3 py-2 text-right">Funds</th>
                        <th className="px-3 py-2 text-right">Overall</th>
                      </>
                    )}
                    {audienceId === 'absent-days' && <th className="px-3 py-2 text-right">Days</th>}
                    {audienceId === 'low-marks' && (
                      <>
                        <th className="px-3 py-2">Exam</th>
                        <th className="px-3 py-2 text-right">Percent</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={columnCount} className="px-3 py-6 text-center text-slate-500">
                        No students match this notice.
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
                        <td className="px-3 py-1.5">{row.studentName}</td>
                        <td className="px-3 py-1.5">{row.className || '—'}</td>
                        {showMoney && (
                          <>
                            <td className="px-3 py-1.5 text-right tabular-nums">{money(row.tuitionBalance)}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{money(row.fundsBalance)}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{money(row.overallBalance)}</td>
                          </>
                        )}
                        {audienceId === 'absent-days' && (
                          <td className="px-3 py-1.5 text-right tabular-nums">{row.absentDays ?? '—'}</td>
                        )}
                        {audienceId === 'low-marks' && (
                          <>
                            <td className="px-3 py-1.5">{row.examName || '—'}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">
                              {row.percent == null ? '—' : Number(row.percent).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
          )}

          {step === 2 && (
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] text-slate-600">
                  {noticePayloads.length} notice{noticePayloads.length === 1 ? '' : 's'} ready to print.
                </p>
                <label className="text-[12px] font-medium text-slate-600">
                  Notices per page
                  <select
                    className={`${inputClass} ml-2 mt-0 inline-block w-16`}
                    value={noticesPerPage}
                    onChange={(e) => handlePerPageChange(e.target.value)}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </label>
              </div>
              {noticePayloads.slice(0, 3).map((notice) => (
                <div
                  key={notice.studentId}
                  dangerouslySetInnerHTML={{ __html: buildCustomNoticeVoucherHtml(notice) }}
                />
              ))}
              {noticePayloads.length > 3 && (
                <p className="text-[12px] text-slate-500">
                  {noticePayloads.length - 3} more will be included when you print.
                </p>
              )}
            </section>
          )}
          </div>

          <style>{`
            ${CUSTOM_NOTICE_STYLES}
            .custom-notice-step {
              animation: custom-notice-step-in 220ms ease;
            }
            .custom-notice-step--back {
              animation-name: custom-notice-step-in-back;
            }
            @keyframes custom-notice-step-in {
              from { opacity: 0; transform: translateX(10px); }
              to { opacity: 1; transform: none; }
            }
            @keyframes custom-notice-step-in-back {
              from { opacity: 0; transform: translateX(-10px); }
              to { opacity: 1; transform: none; }
            }
            @media (prefers-reduced-motion: reduce) {
              .custom-notice-step { animation: none; }
            }
          `}</style>
        </div>
      </CampusShell>
    </div>
  )
}

export default CustomNoticePage
