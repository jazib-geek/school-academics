import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Award,
  BookOpen,
  Columns2,
  FileBarChart2,
  GraduationCap,
  Grid3x3,
  LayoutList,
  Loader2,
  Medal,
  MessageSquareText,
  Printer,
  Sparkles,
  Star,
  Trophy,
  Users,
  UsersRound,
  Wand2,
  X,
} from 'lucide-react'
import Select from 'react-select'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import ExamReportPrintView from '../../../components/campus/exam-reports/ExamReportPrintView.jsx'
import { EXAM_PRINT_LANDSCAPE_LAYOUTS } from '../../../components/campus/exam-reports/examPrintShared'
import { EXAM_REPORT_PRINT_CSS } from '../../../components/campus/exam-reports/examPrintStyles'
import { getCampusLabel } from '../../../constants/branding.js'
import { EXAM_REPORT_PERMISSIONS } from '../../../constants/campusPermissions.js'
import { hasCampusPermission } from '../../../services/authService'
import { getClasses } from '../../../services/classService'
import { getExamTypes } from '../../../services/examService'
import {
  getExamExecutiveSnapshot,
  getExamReportClassSubjects,
  getSmartExamCatalog,
  runSmartExamReport,
} from '../../../services/examReportService'

const FREQUENT_REPORT_IDS = [
  'result-card',
  'result-card-multiple',
  'result-card-fancy',
  'award-list-2col',
  'award-list-remarks',
  'award-list-12col',
  'award-list-subjects',
  'top-n',
]

const CATEGORIES = [
  { id: 'frequent', label: 'Frequently used', icon: Star },
  { id: 'result-cards', label: 'Result cards', icon: GraduationCap },
  { id: 'award-lists', label: 'Award lists', icon: LayoutList },
  { id: 'positions', label: 'Positions', icon: Trophy },
]

const REPORT_NATURE_BADGE = {
  'result-cards': 'bg-sky-500',
  'award-lists': 'bg-emerald-500',
  positions: 'bg-amber-500',
}

const REPORT_ICONS = {
  'result-card': GraduationCap,
  'result-card-multiple': Users,
  'result-card-junior': Award,
  'result-card-multiple-junior': UsersRound,
  'result-card-fancy': Sparkles,
  'fancy-multiple': Wand2,
  'award-list-2col': Columns2,
  'award-list-remarks': MessageSquareText,
  'award-list-12col': Grid3x3,
  'award-list-subjects': BookOpen,
  'top-n': Trophy,
  'top-n-junior': Medal,
}

const getReportNatureKey = (item) =>
  item?.category && REPORT_NATURE_BADGE[item.category] ? item.category : 'result-cards'

const getReportIcon = (item) => REPORT_ICONS[item?.id] || FileBarChart2

const money = (value) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })

const filterExamCatalogByPermission = (items) =>
  (items || []).filter((item) => {
    if (hasCampusPermission('rpt_exam')) return true
    const code = EXAM_REPORT_PERMISSIONS[item.id]
    if (!code) return false
    return hasCampusPermission(code)
  })

function SnapshotCard({ label, value, icon: Icon, accent }) {
  const accentMap = {
    violet: { border: 'border-violet-500', icon: 'text-violet-600' },
    emerald: { border: 'border-emerald-500', icon: 'text-emerald-600' },
    rose: { border: 'border-rose-500', icon: 'text-rose-600' },
    amber: { border: 'border-amber-500', icon: 'text-amber-600' },
    indigo: { border: 'border-indigo-500', icon: 'text-indigo-600' },
  }
  const tone = accentMap[accent] || accentMap.indigo

  return (
    <article className={`rounded-2xl border-t-4 ${tone.border} bg-white p-4 shadow-sm ring-1 ring-slate-100`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>
        {Icon ? <Icon size={18} className={tone.icon} /> : null}
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums text-slate-800 sm:text-2xl">{value ?? '—'}</p>
    </article>
  )
}

function buildDefaultParams(report) {
  const params = {}
  for (const def of report?.parameters || []) {
    if (def.defaultValue != null && def.defaultValue !== '') {
      params[def.key] = String(def.defaultValue)
    } else if (report.presetParameters?.[def.key] != null) {
      params[def.key] = String(report.presetParameters[def.key])
    } else {
      params[def.key] = ''
    }
  }
  return params
}

export default function CampusExamReportsPage() {
  const campus = localStorage.getItem('campus') || 'N/A'
  const campusLabel = getCampusLabel(campus)
  const [searchParams, setSearchParams] = useSearchParams()

  const [catalog, setCatalog] = useState([])
  const [snapshot, setSnapshot] = useState(null)
  const [classOptions, setClassOptions] = useState([])
  const [examTypeOptions, setExamTypeOptions] = useState([])
  const [category, setCategory] = useState('frequent')
  const [reportId, setReportId] = useState('')
  const [params, setParams] = useState({})
  const [result, setResult] = useState(null)
  const [isResultOpen, setIsResultOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isBooting, setIsBooting] = useState(true)
  const [error, setError] = useState('')
  const [runError, setRunError] = useState('')
  const [classSubjects, setClassSubjects] = useState([])
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([])
  const [subjectsLoading, setSubjectsLoading] = useState(false)
  const [subjectsError, setSubjectsError] = useState('')

  const selectedReport = useMemo(
    () => catalog.find((item) => item.id === reportId) || null,
    [catalog, reportId],
  )

  const catalogFiltered = useMemo(() => {
    if (category === 'frequent') {
      const byId = new Map(catalog.map((item) => [item.id, item]))
      return FREQUENT_REPORT_IDS.map((id) => byId.get(id)).filter(Boolean)
    }
    return catalog.filter((item) => item.category === category)
  }, [catalog, category])

  const classSelectOptions = useMemo(
    () =>
      (classOptions || []).map((item) => ({
        value: String(item.id ?? item.ID ?? ''),
        label: item.className || item.ClassName || item.name || item.label || String(item.id),
      })),
    [classOptions],
  )

  const examSelectOptions = useMemo(
    () =>
      (examTypeOptions || []).map((item) => ({
        value: String(item.id ?? item.ID ?? ''),
        label: item.name || item.Name || item.examTypeName || String(item.id),
      })),
    [examTypeOptions],
  )

  const pageOrientation = EXAM_PRINT_LANDSCAPE_LAYOUTS.has(result?.layout) ? 'landscape' : 'portrait'
  const needsSubjectPicker = reportId === 'award-list-subjects'

  useEffect(() => {
    let cancelled = false
    const boot = async () => {
      setIsBooting(true)
      try {
        const [catalogData, snapshotData, classes, types] = await Promise.all([
          getSmartExamCatalog(),
          getExamExecutiveSnapshot().catch(() => null),
          getClasses().catch(() => []),
          getExamTypes().catch(() => []),
        ])
        if (cancelled) return
        const allowedCatalog = filterExamCatalogByPermission(catalogData)
        setCatalog(allowedCatalog)
        setSnapshot(snapshotData)
        setClassOptions(classes || [])
        setExamTypeOptions(Array.isArray(types) ? types : types?.data || [])

        const presetFromUrl = searchParams.get('preset')
        const initial =
          allowedCatalog.find((item) => item.id === presetFromUrl) ||
          allowedCatalog.find((item) => item.id === 'result-card') ||
          allowedCatalog[0]
        if (initial) {
          setReportId(initial.id)
          setParams(buildDefaultParams(initial))
        }
      } catch (bootError) {
        if (!cancelled) {
          setError(bootError?.response?.data?.message || 'Unable to load exam reports.')
        }
      } finally {
        if (!cancelled) setIsBooting(false)
      }
    }
    boot()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectReport = (report) => {
    const nextParams = buildDefaultParams(report)
    setReportId(report.id)
    setParams(nextParams)
    setResult(null)
    setRunError('')
    setIsResultOpen(false)
    setClassSubjects([])
    setSelectedSubjectIds([])
    setSubjectsError('')
    setSearchParams(report.isPreset ? { preset: report.id } : {})
  }

  const closeResultModal = () => {
    setIsResultOpen(false)
    setRunError('')
  }

  const executeReport = async (id, paramValues) => {
    if (!id) return
    setIsResultOpen(true)
    setIsLoading(true)
    setRunError('')
    setResult(null)
    try {
      const cleaned = {}
      for (const [key, value] of Object.entries(paramValues || {})) {
        if (value === '' || value == null) continue
        cleaned[key] = value
      }
      if (id === 'award-list-subjects') {
        cleaned.subjectIds = selectedSubjectIds
      }
      const data = await runSmartExamReport(id, cleaned)
      setResult(data)
    } catch (requestError) {
      setRunError(
        requestError?.response?.data?.message ||
          requestError?.response?.data?.Message ||
          'Unable to run report.',
      )
      setResult(null)
    } finally {
      setIsLoading(false)
    }
  }

  const runReport = async () => {
    await executeReport(reportId, params)
  }

  useEffect(() => {
    if (reportId !== 'award-list-subjects') return undefined

    const sectionId = Number(params.classCompositeId)
    if (!sectionId) {
      setClassSubjects([])
      setSelectedSubjectIds([])
      setSubjectsError('')
      setSubjectsLoading(false)
      return undefined
    }

    let cancelled = false
    const load = async () => {
      setSubjectsLoading(true)
      setSubjectsError('')
      try {
        const rows = await getExamReportClassSubjects(sectionId)
        if (cancelled) return
        const list = Array.isArray(rows) ? rows : []
        setClassSubjects(list)
        setSelectedSubjectIds(list.map((item) => item.subjectId).filter(Boolean))
        if (list.length === 0) {
          setSubjectsError('No subjects are set for this class.')
        }
      } catch {
        if (!cancelled) {
          setClassSubjects([])
          setSelectedSubjectIds([])
          setSubjectsError('Unable to load subjects for this class.')
        }
      } finally {
        if (!cancelled) setSubjectsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [reportId, params.classCompositeId])

  const toggleSubject = (subjectId) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId],
    )
  }

  useEffect(() => {
    if (!isResultOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeResultModal()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isResultOpen])

  const renderParamInput = (def) => {
    const value = params[def.key] ?? ''
    const onChange = (next) => setParams((prev) => ({ ...prev, [def.key]: next }))

    if (def.type === 'classComposite' || def.optionsSource === 'classes') {
      return (
        <Select
          isClearable={!def.required}
          isSearchable
          options={classSelectOptions}
          placeholder="Search class"
          value={classSelectOptions.find((opt) => opt.value === String(value)) || null}
          onChange={(selectedOption) => onChange(selectedOption?.value || '')}
          className="text-sm"
          classNamePrefix="exam-class-select"
          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
          styles={{
            control: (baseStyles) => ({
              ...baseStyles,
              minHeight: '40px',
              borderRadius: '0.5rem',
            }),
          }}
        />
      )
    }

    if (def.optionsSource === 'examTypes' || (def.type === 'select' && def.optionsSource === 'examTypes')) {
      return (
        <Select
          isClearable={!def.required}
          isSearchable
          options={examSelectOptions}
          placeholder="Exam type"
          value={examSelectOptions.find((opt) => opt.value === String(value)) || null}
          onChange={(selectedOption) => onChange(selectedOption?.value || '')}
          className="text-sm"
          classNamePrefix="exam-type-select"
          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
          styles={{
            control: (baseStyles) => ({
              ...baseStyles,
              minHeight: '40px',
              borderRadius: '0.5rem',
            }),
          }}
        />
      )
    }

    if (def.type === 'select' && def.options?.length) {
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {!def.required ? <option value="">Select</option> : null}
          {def.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )
    }

    return (
      <input
        type={def.type === 'int' ? 'number' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    )
  }

  return (
    <div className="print-page-root min-h-screen bg-slate-50">
      <style>{`
        ${EXAM_REPORT_PRINT_CSS}
        @page { size: ${pageOrientation}; margin: 12mm; }
        @media print {
          * { color: #000 !important; background: transparent !important; box-shadow: none !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body, #root { background: #ffffff !important; margin: 0 !important; padding: 0 !important; }
          .no-print, .hide-in-print { display: none !important; }
          .print-only { display: block !important; }
          .print-page-root, .print-main-wrap, .print-content-wrap {
            background: #ffffff !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            min-height: auto !important;
          }
          .print-only.print-sheet {
            padding: 6mm !important;
            box-sizing: border-box !important;
          }
          table thead, table thead th {
            background: #ffffff !important;
            color: #000 !important;
          }
        }
        .print-only { display: none; }
      `}</style>

      <CampusShell
        headerContext="Exam Reports"
        rowClassName="print-main-wrap flex min-h-screen w-full"
        asideClassName="no-print"
        headerClassName="no-print"
      >
        <div className="print-content-wrap w-full space-y-4 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
          {error ? (
            <div className="no-print rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {isBooting ? (
            <div className="no-print flex min-h-[50vh] items-center justify-center rounded-2xl bg-white p-10 shadow-sm ring-1 ring-slate-100">
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <Loader2 className="animate-spin text-[var(--campus-primary)]" size={28} />
                <p className="text-sm font-medium">Loading Exam Reports…</p>
              </div>
            </div>
          ) : (
            <>
              <section className="no-print space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                    <Award size={18} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">Exam Reports</h1>
                    <p className="text-sm text-slate-500">
                      Result cards, award lists, and position sheets for {campusLabel}.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <SnapshotCard
                    label="Active students"
                    value={snapshot ? money(snapshot.activeStudentCount) : '—'}
                    icon={Users}
                    accent="emerald"
                  />
                  <SnapshotCard
                    label="Exam types"
                    value={snapshot ? money(snapshot.examTypeCount) : '—'}
                    icon={FileBarChart2}
                    accent="indigo"
                  />
                  <SnapshotCard
                    label="Classes with marks"
                    value={snapshot ? money(snapshot.classesWithMarks) : '—'}
                    icon={GraduationCap}
                    accent="amber"
                  />
                  <SnapshotCard
                    label="Active classes"
                    value={snapshot ? money(snapshot.activeClassCount) : '—'}
                    icon={LayoutList}
                    accent="violet"
                  />
                </div>
              </section>

              <section className="no-print grid gap-4 lg:grid-cols-5 lg:items-start">
                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5 lg:col-span-3">
                  <div className="mb-3 flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5">
                    {CATEGORIES.map((item) => {
                      const Icon = item.icon
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCategory(item.id)}
                          className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-medium ${
                            category === item.id
                              ? 'bg-[var(--campus-primary)] text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <Icon size={12} className="shrink-0" />
                          {item.label}
                        </button>
                      )
                    })}
                  </div>

                  <div className="grid max-h-[min(70vh,640px)] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                    {catalogFiltered.length === 0 ? (
                      <p className="col-span-full py-8 text-center text-sm text-slate-500">
                        No reports in this category.
                      </p>
                    ) : (
                      catalogFiltered.map((item) => {
                        const Icon = getReportIcon(item)
                        const badge = REPORT_NATURE_BADGE[getReportNatureKey(item)]
                        const isSelected = reportId === item.id
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => selectReport(item)}
                            className={`flex items-start gap-3 rounded-xl border bg-white px-3 py-3 text-left transition ${
                              isSelected
                                ? 'border-[var(--campus-primary)] ring-1 ring-[#405189]/30'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span
                              className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white ${badge}`}
                            >
                              <Icon size={16} strokeWidth={2.25} />
                            </span>
                            <span className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                              <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                                {item.directorBlurb || item.description}
                              </p>
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-5 lg:col-span-2">
                  {selectedReport ? (
                    <>
                      <div className="mb-4 border-b border-slate-100 pb-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Selected report
                        </p>
                        <h2 className="mt-1 text-lg font-bold text-slate-800">{selectedReport.title}</h2>
                        <p className="mt-1 text-sm text-slate-500">{selectedReport.description}</p>
                      </div>

                      {(selectedReport.parameters || []).length > 0 ? (
                        <div className="grid gap-3">
                          {(selectedReport.parameters || []).map((def) => (
                            <label key={def.key} className="block text-sm">
                              <span className="mb-1 block font-medium text-slate-600">
                                {def.label}
                                {def.required ? ' *' : ''}
                              </span>
                              {renderParamInput(def)}
                            </label>
                          ))}
                        </div>
                      ) : null}

                      {needsSubjectPicker ? (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-slate-700">Subjects on this sheet</p>
                            {classSubjects.length > 0 ? (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  className="text-xs font-medium text-[var(--campus-primary)] hover:underline"
                                  onClick={() =>
                                    setSelectedSubjectIds(classSubjects.map((item) => item.subjectId).filter(Boolean))
                                  }
                                >
                                  Tick all
                                </button>
                                <button
                                  type="button"
                                  className="text-xs font-medium text-slate-500 hover:underline"
                                  onClick={() => setSelectedSubjectIds([])}
                                >
                                  Clear
                                </button>
                              </div>
                            ) : null}
                          </div>
                          <p className="mb-2 text-xs text-slate-500">Tick the subject columns to print.</p>
                          {!params.classCompositeId ? (
                            <p className="text-sm text-slate-500">Choose a class to see its subjects.</p>
                          ) : subjectsLoading ? (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <Loader2 className="animate-spin" size={14} />
                              Loading subjects…
                            </div>
                          ) : subjectsError ? (
                            <p className="text-sm text-rose-700">{subjectsError}</p>
                          ) : (
                            <div className="grid max-h-56 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                              {classSubjects.map((subject) => {
                                const checked = selectedSubjectIds.includes(subject.subjectId)
                                return (
                                  <label
                                    key={subject.subjectId}
                                    className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-sm text-slate-700 ring-1 ring-slate-200"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleSubject(subject.subjectId)}
                                      className="h-4 w-4 rounded border-slate-300 text-[var(--campus-primary)]"
                                    />
                                    <span className="leading-snug">
                                      {subject.shortName || subject.subjectName}
                                      {subject.shortName && subject.subjectName && subject.shortName !== subject.subjectName ? (
                                        <span className="ml-1 text-xs text-slate-400">{subject.subjectName}</span>
                                      ) : null}
                                    </span>
                                  </label>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={runReport}
                        disabled={
                          isLoading ||
                          !reportId ||
                          (needsSubjectPicker &&
                            (subjectsLoading || selectedSubjectIds.length === 0 || !params.classCompositeId))
                        }
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#364574] disabled:opacity-60"
                      >
                        {isLoading ? <Loader2 className="animate-spin" size={16} /> : null}
                        Generate report
                      </button>
                    </>
                  ) : (
                    <div className="flex min-h-[220px] items-center justify-center text-center text-sm text-slate-500">
                      Select a report on the left to configure filters.
                    </div>
                  )}
                </div>
              </section>

              {isResultOpen ? (
                <div className="exam-result-modal no-print fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-3 sm:p-6">
                  <button
                    type="button"
                    aria-label="Close backdrop"
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    onClick={closeResultModal}
                  />
                  <div className="relative z-10 mt-2 flex max-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:mt-6">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold text-slate-900">
                          {result?.title || selectedReport?.title || 'Exam report'}
                        </h2>
                        <p className="text-xs text-slate-500">
                          {isLoading
                            ? 'Generating…'
                            : result?.generatedAt
                              ? `Generated ${new Date(result.generatedAt).toLocaleString()}`
                              : runError
                                ? 'Failed to generate'
                                : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {!isLoading && result ? (
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Printer size={16} /> Print
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={closeResultModal}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                          aria-label="Close report"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="min-h-[240px] flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                      {isLoading ? (
                        <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-slate-500">
                          <Loader2 className="animate-spin text-[var(--campus-primary)]" size={28} />
                          <p className="text-sm font-medium">Fetching report…</p>
                        </div>
                      ) : runError ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          {runError}
                        </div>
                      ) : result ? (
                        <div className="exam-print-preview overflow-auto rounded-xl border border-slate-200 p-4">
                          <ExamReportPrintView layout={result.layout} payload={result.layoutPayload} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {result?.layoutPayload ? (
                <div className="print-only print-sheet exam-print-preview">
                  <ExamReportPrintView layout={result.layout} payload={result.layoutPayload} />
                </div>
              ) : null}
            </>
          )}
        </div>
      </CampusShell>
    </div>
  )
}
