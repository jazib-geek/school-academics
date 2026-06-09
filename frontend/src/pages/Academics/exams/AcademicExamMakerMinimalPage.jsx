import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ClipboardList,
  Eye,
  FileOutput,
  FilePlus,
  FolderOpen,
  Loader2,
  Plus,
  Printer,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import Select from 'react-select'
import { Link } from 'react-router-dom'
import { useAcademicInstituteSettings } from '../../../contexts/AcademicInstituteSettingsContext'
import {
  getAcademicChapters,
  getAcademicClasses,
  getAcademicSubjects,
} from '../../../services/academicCatalogService'
import { getAcademicExamTitles } from '../../../services/academicExamTitleService'
import {
  createAcademicExamPaperFromSelection,
  deleteAcademicExamPaper,
  getExamQuestionPool,
  getAcademicExamPaperById,
  getAcademicExamPapers,
  getExamQuestionAvailability,
  randomizeAcademicExamPaperFromChapters,
  updateAcademicExamPaperFromSelection,
} from '../../../services/academicExamMakerServiceWithSafety'
import { useExamMakerAutoSave, DRAFT_STORAGE_KEY_EXPORT } from '../../../hooks/useExamMakerAutoSave'
import { useExamMakerUnsavedGuard } from '../../../hooks/useExamMakerUnsavedGuard'
import { buildEditorSnapshot, buildSnapshotFromPaper } from './examMakerWorkspaceSnapshot'
import { normalizePaperName, paperNamesMatch } from './examMakerPaperName'
import {
  buildSectionConfigWithOptional,
  clampOptionalAttemptCount,
  clearSectionOptionalConfig,
  computePreviewTotalMarks,
  defaultSectionHeading,
  defaultSectionInstruction,
  formatExamDurationLabel,
  formatExamTitleForPrint,
  formatIndividualMarks,
  formatLaqQuestionLabel,
  formatPaperNameForDisplay,
  formatSectionRomanLabel,
  formatSubQuestionLabel,
  inferSectionDisplayMode,
  inferSectionMarksDisplay,
  normalizeSubQuestionNumbering,
  parseLaqParts,
  resolveSectionBannerLabel,
  resolveSectionHeadingDisplay,
  resolveSectionMarksPresentation,
  sectionSupportsOptionalQuestions,
} from './examPaperPrintHelpers'
import {
  catalogQuestionTypesForExam,
  defaultCatalogFilterType,
  defaultMarksForQuestionType,
  defaultSectionKeyForQuestionType,
  DEFAULT_OBJECTIVE_HEADER_NOTE,
  EXAM_TYPE,
  formatExamTypeDisplay,
  formatExamTypeShort,
  isDefaultObjectiveHeaderNote,
  isObjectiveExamType,
  isQuestionTypeAllowedForExam,
  isSubjectiveExamType,
  normalizeExamTypeOption,
  QUESTION_TYPE,
} from './examMakerExamTypes'

function instituteLogoToSrc(logo) {
  if (!logo || typeof logo !== 'string') return ''
  const trimmed = logo.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('data:')) return trimmed
  return `data:image/png;base64,${trimmed}`
}

const createSectionConfig = (
  sectionKey,
  sectionName,
  headingText,
  instructionText,
  marksDisplayText,
  optionalQuestionsEnabled = false,
  optionalQuestionsAttemptCount = null,
) => ({
  sectionKey,
  sectionName,
  headingText,
  instructionText,
  marksDisplayText,
  optionalQuestionsEnabled: Boolean(optionalQuestionsEnabled),
  optionalQuestionsAttemptCount:
    optionalQuestionsAttemptCount == null ? null : Number(optionalQuestionsAttemptCount),
})

const looksLikeLatex = (value) => /\\[a-zA-Z]+|(\^|_)\{?|\\frac|\\sqrt|\\theta|\\pi/.test(value)
const normalizeLatex = (value) => `${value || ''}`.replaceAll('\\\\', '\\').trim()
const SECTION_KEY_REGEX = /^Q(\d+)$/i
const CATALOG_TYPE_OPTIONS = [
  { value: QUESTION_TYPE.MCQ, label: 'MCQ' },
  { value: QUESTION_TYPE.SAQ, label: 'SAQ' },
  { value: QUESTION_TYPE.LAQ, label: 'LAQ' },
]
const getSectionNumber = (sectionKey) => {
  const match = `${sectionKey || ''}`.trim().match(SECTION_KEY_REGEX)
  return match ? Number(match[1]) : null
}
const getSectionPreviewRows = (sectionKey, selectedWithDetails) =>
  selectedWithDetails
    .filter((item) => (item.section || 'Q1') === sectionKey)
    .map((item) => ({
      marks: Number(item.marks || 0),
      type: item.question?.type,
    }))

function MathText({ value, className = '' }) {
  if (!value || !`${value}`.trim()) return <span className={className}>-</span>

  const merged = `min-w-0 break-words ${className}`.trim()
  const normalized = normalizeLatex(value)
  if (!looksLikeLatex(normalized)) {
    return <span className={merged}>{value}</span>
  }

  try {
    const html = katex.renderToString(normalized, {
      throwOnError: false,
      strict: 'ignore',
      displayMode: false,
    })
    return <span className={merged} dangerouslySetInnerHTML={{ __html: html }} />
  } catch {
    return <span className={merged}>{value}</span>
  }
}

function PopupLoader({ open, text }) {
  if (!open) return null

  return (
    <div
      role="presentation"
      className="print-hidden fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
    >
      <div
        role="status"
        aria-live="polite"
        className="flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl bg-white px-6 py-7 text-center shadow-2xl ring-1 ring-slate-200"
      >
        <Loader2 size={34} className="animate-spin text-indigo-600" />
        <p className="text-base font-semibold text-slate-900">{text}</p>
      </div>
    </div>
  )
}

function AcademicExamMakerMinimalPage() {
  const { instituteSettings } = useAcademicInstituteSettings()
  const instituteLogoSrc = useMemo(
    () => instituteLogoToSrc(instituteSettings?.instituteLogo),
    [instituteSettings?.instituteLogo],
  )
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [examTitles, setExamTitles] = useState([])
  const [generatedPapers, setGeneratedPapers] = useState([])
  const [selectedPaper, setSelectedPaper] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingFromSelection, setIsGeneratingFromSelection] = useState(false)
  const [isPoolLoading, setIsPoolLoading] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false)
  const [isAutoMakerOpen, setIsAutoMakerOpen] = useState(false)
  const [isAutoWarningOpen, setIsAutoWarningOpen] = useState(false)
  const [isRandomizingPaper, setIsRandomizingPaper] = useState(false)
  const [isAutoAvailabilityLoading, setIsAutoAvailabilityLoading] = useState(false)
  const [isPaperSetupOpen, setIsPaperSetupOpen] = useState(false)
  const [chapters, setChapters] = useState([])
  const [isChaptersLoading, setIsChaptersLoading] = useState(false)
  const [catalogChapterId, setCatalogChapterId] = useState('')
  const [autoChapterPlan, setAutoChapterPlan] = useState({})
  const [autoQuestionAvailability, setAutoQuestionAvailability] = useState({})
  const [autoMakerAlert, setAutoMakerAlert] = useState('')
  /** After "New Exam": no auto-preload on dropdowns until user confirms setup in the modal */
  const [suppressPaperPreload, setSuppressPaperPreload] = useState(false)
  const [isGeneratedPapersOpen, setIsGeneratedPapersOpen] = useState(false)
  const [generatedPapersSearch, setGeneratedPapersSearch] = useState('')
  const [paperPendingDelete, setPaperPendingDelete] = useState(null)
  const [deletingPaperId, setDeletingPaperId] = useState(null)
  const [pendingDestructiveAction, setPendingDestructiveAction] = useState(null)
  const [isSavingBeforeLeave, setIsSavingBeforeLeave] = useState(false)
  const [popupLoaderText, setPopupLoaderText] = useState('')
  const [questionPool, setQuestionPool] = useState([])
  const [selectedQuestions, setSelectedQuestions] = useState([])
  const [sectionConfigs, setSectionConfigs] = useState([])
  const [poolFilters, setPoolFilters] = useState({
    type: defaultCatalogFilterType(EXAM_TYPE.OBJECTIVE),
    category: 'all',
    search: '',
  })
  const [debouncedPoolSearch, setDebouncedPoolSearch] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    classId: '',
    subjectId: '',
    schoolName: 'SCIENCE BASE SCHOOL®',
    schoolLogoUrl: '',
    examTitleId: '',
    paperName: '',
    examType: EXAM_TYPE.OBJECTIVE,
    sessionLabel: '2026-27',
    durationMinutes: 20,
    headerNote: DEFAULT_OBJECTIVE_HEADER_NOTE,
    instructions: 'Attempt according to section instructions.',
    footerNote: '',
    showSectionNames: false,
    subQuestionNumberingStyle: 'roman',
    wrapQuestionMarksInParentheses: false,
  })
  const preloadKeyRef = useRef('')
  const loadInitialRequestIdRef = useRef(0)
  const initialPapersModalShownRef = useRef(false)
  const cleanSnapshotRef = useRef(null)
  const initialBaselineDoneRef = useRef(false)
  const pendingPaperBaselineSyncIdRef = useRef(null)
  const [baselineVersion, setBaselineVersion] = useState(0)

  const { loadDraft, clearDraft } = useExamMakerAutoSave(form, selectedQuestions, sectionConfigs)

  const markWorkspaceSaved = useCallback((snapshot) => {
    cleanSnapshotRef.current = snapshot
    setBaselineVersion((version) => version + 1)
  }, [])

  const isWorkspaceDirty = useMemo(() => {
    if (cleanSnapshotRef.current === null) return false
    return (
      buildEditorSnapshot(form, selectedQuestions, sectionConfigs) !== cleanSnapshotRef.current
    )
  }, [form, selectedQuestions, sectionConfigs, baselineVersion])

  const classOptions = useMemo(() => classes.map((item) => ({ value: item.id, label: item.className })), [classes])
  const subjectOptions = useMemo(() => subjects.map((item) => ({ value: item.id, label: item.subjectName })), [subjects])
  const examTitleOptions = useMemo(
    () => examTitles.map((item) => ({ value: item.id, label: item.title })),
    [examTitles],
  )

  const selectedClass = useMemo(
    () => classOptions.find((option) => option.value === Number(form.classId)) || null,
    [classOptions, form.classId],
  )
  const selectedSubject = useMemo(
    () => subjectOptions.find((option) => option.value === Number(form.subjectId)) || null,
    [subjectOptions, form.subjectId],
  )
  const selectedExamTitle = useMemo(
    () => examTitleOptions.find((option) => option.value === Number(form.examTitleId)) || null,
    [examTitleOptions, form.examTitleId],
  )
  const hasActiveExamWorkspace = useMemo(
    () =>
      Boolean(selectedPaper) ||
      selectedQuestions.length > 0 ||
      Boolean(form.classId && form.subjectId && form.examTitleId && normalizePaperName(form.paperName)),
    [form.classId, form.examTitleId, form.paperName, form.subjectId, selectedPaper, selectedQuestions.length],
  )

  const filteredGeneratedPapers = useMemo(() => {
    const tokens = generatedPapersSearch.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (!tokens.length) return generatedPapers
    return generatedPapers.filter((paper) => {
      const typeShort = formatExamTypeShort(paper.examType).toLowerCase()
      const typeLong = formatExamTypeDisplay(paper.examType).toLowerCase()
      const haystack = [
        paper.paperName,
        paper.className,
        paper.subjectName,
        paper.examTitle,
        paper.sessionLabel,
        typeShort,
        typeLong,
        EXAM_TYPE.OBJECTIVE,
        EXAM_TYPE.SUBJECTIVE,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return tokens.every((t) => haystack.includes(t))
    })
  }, [generatedPapers, generatedPapersSearch])

  const groupedGeneratedPapers = useMemo(() => {
    const sortPapers = (list) =>
      [...list].sort((a, b) => {
        const aTime = a.createdOn ? new Date(a.createdOn).getTime() : 0
        const bTime = b.createdOn ? new Date(b.createdOn).getTime() : 0
        return bTime - aTime
      })

    const buildSubjectGroups = (examType) => {
      const bySubject = new Map()
      filteredGeneratedPapers
        .filter((paper) => normalizeExamTypeOption(paper.examType) === examType)
        .forEach((paper) => {
          const subjectKey = `${paper.subjectName || ''}`.trim() || 'Other'
          if (!bySubject.has(subjectKey)) bySubject.set(subjectKey, [])
          bySubject.get(subjectKey).push(paper)
        })

      return [...bySubject.entries()]
        .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
        .map(([subjectName, papers]) => ({
          subjectName,
          papers: sortPapers(papers),
        }))
    }

    return [
      {
        examType: EXAM_TYPE.OBJECTIVE,
        label: formatExamTypeDisplay(EXAM_TYPE.OBJECTIVE),
        subjects: buildSubjectGroups(EXAM_TYPE.OBJECTIVE),
      },
      {
        examType: EXAM_TYPE.SUBJECTIVE,
        label: formatExamTypeDisplay(EXAM_TYPE.SUBJECTIVE),
        subjects: buildSubjectGroups(EXAM_TYPE.SUBJECTIVE),
      },
    ]
  }, [filteredGeneratedPapers])

  const closeGeneratedPapersModal = () => {
    if (deletingPaperId) return
    setGeneratedPapersSearch('')
    setPaperPendingDelete(null)
    setIsGeneratedPapersOpen(false)
  }
  const draftExamTitleLabel = useMemo(() => {
    if (selectedPaper?.examTitle) return selectedPaper.examTitle
    if (selectedExamTitle?.label) return selectedExamTitle.label
    return ''
  }, [selectedExamTitle?.label, selectedPaper?.examTitle])

  const poolScoped = useMemo(() => questionPool, [questionPool])
  const selectedQuestionIds = useMemo(
    () => new Set(selectedQuestions.map((item) => item.questionId)),
    [selectedQuestions],
  )
  const selectedWithDetails = useMemo(() => {
    return selectedQuestions
      .map((item) => ({
        ...item,
        question: questionPool.find((q) => q.id === item.questionId) || item.question || null,
      }))
      .sort((a, b) => Number(a.questionOrder) - Number(b.questionOrder))
  }, [questionPool, selectedQuestions])

  const previewQuestions = useMemo(
    () =>
      selectedWithDetails.map((item) => ({
        id: item.questionId,
        order: Number(item.questionOrder),
        section: item.section || 'Q1',
        marks: Number(item.marks),
        type: item.question?.type,
        category: item.question?.category,
        chapterId: item.question?.chapterId,
        descriptionText: item.question?.descriptionText,
        mcqOpt1: item.question?.mcqOpt1,
        mcqOpt2: item.question?.mcqOpt2,
        mcqOpt3: item.question?.mcqOpt3,
        mcqOpt4: item.question?.mcqOpt4,
      })),
    [selectedWithDetails],
  )

  const groupedPreviewQuestions = useMemo(() => {
    if (!previewQuestions.length) return []
    const groups = new Map()
    previewQuestions.forEach((q) => {
      const key = q.section || 'Section'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(q)
    })
    return [...groups.entries()].map(([section, questions]) => [
      section,
      [...questions].sort((a, b) => Number(a.order) - Number(b.order)),
    ])
  }, [previewQuestions])

  const previewTotalMarks = useMemo(
    () => computePreviewTotalMarks(selectedWithDetails, sectionConfigs),
    [sectionConfigs, selectedWithDetails],
  )

  const sectionOptions = useMemo(() => {
    const fromConfigs = sectionConfigs.map((item) => `${item.sectionKey || ''}`.trim()).filter(Boolean)
    const fromSelected = selectedQuestions.map((item) => `${item.section || ''}`.trim()).filter(Boolean)
    const existing = [...new Set([...fromConfigs, ...fromSelected])]

    const maxSectionNo = existing
      .map((key) => getSectionNumber(key))
      .filter((value) => Number.isFinite(value))
      .reduce((max, value) => Math.max(max, Number(value)), 0)

    const sequentialLimit = Math.max(2, maxSectionNo + 1)
    const procedural = Array.from({ length: sequentialLimit }, (_, index) => `Q${index + 1}`)
    const all = [...new Set([...procedural, ...existing])]

    return all.map((value) => ({
      value,
      label: formatSectionRomanLabel(value),
    }))
  }, [sectionConfigs, selectedQuestions])

  const catalogTypesForCurrentExam = useMemo(
    () => catalogQuestionTypesForExam(form.examType),
    [form.examType],
  )
  const autoQuestionTypes = useMemo(() => catalogQuestionTypesForExam(form.examType), [form.examType])
  const autoPlanTotal = useMemo(
    () =>
      Object.values(autoChapterPlan).reduce(
        (total, item) =>
          total +
          Number(item?.mcqCount || 0) +
          Number(item?.saqCount || 0) +
          Number(item?.laqCount || 0),
        0,
      ),
    [autoChapterPlan],
  )
  const autoAvailabilityIssues = useMemo(() => {
    const issues = []
    chapters.forEach((chapter) => {
      const plan = autoChapterPlan[chapter.id] || {}
      const available = autoQuestionAvailability[chapter.id] || {}
      const checks = [
        { field: 'mcqCount', label: 'MCQ', enabled: autoQuestionTypes.includes(QUESTION_TYPE.MCQ) },
        { field: 'saqCount', label: 'SAQ', enabled: autoQuestionTypes.includes(QUESTION_TYPE.SAQ) },
        { field: 'laqCount', label: 'LAQ', enabled: autoQuestionTypes.includes(QUESTION_TYPE.LAQ) },
      ]

      checks.forEach((check) => {
        if (!check.enabled) return
        const requested = Number(plan[check.field] || 0)
        const countAvailable = Number(available[check.field] || 0)
        if (requested > countAvailable) {
          issues.push({
            chapterId: chapter.id,
            chapterNo: chapter.chapterNo,
            chapterName: chapter.chapterName,
            label: check.label,
            requested,
            available: countAvailable,
          })
        }
      })
    })
    return issues
  }, [autoChapterPlan, autoQuestionAvailability, autoQuestionTypes, chapters])

  useEffect(() => {
    if (!isAutoMakerOpen || isAutoAvailabilityLoading || autoAvailabilityIssues.length === 0) return
    const firstIssue = autoAvailabilityIssues[0]
    setAutoMakerAlert(
      `Chapter ${firstIssue.chapterNo} has only ${firstIssue.available} ${firstIssue.label} question${firstIssue.available === 1 ? '' : 's'}, but ${firstIssue.requested} were requested.`,
    )
  }, [autoAvailabilityIssues, isAutoAvailabilityLoading, isAutoMakerOpen])

  const sectionConfigMap = useMemo(() => {
    const map = new Map()
    sectionConfigs.forEach((item) => map.set(item.sectionKey, item))
    return map
  }, [sectionConfigs])

  const mapPaperToSectionConfigs = (paper) =>
    (paper.sections || []).map((x) =>
      createSectionConfig(
        x.sectionKey || '',
        x.sectionName || '',
        x.headingText || '',
        x.instructionText || '',
        x.marksDisplayText || '',
        x.optionalQuestionsEnabled,
        x.optionalQuestionsAttemptCount,
      ),
    )

  const mapPaperToSelectedQuestions = (paper) =>
    (paper.questions || []).map((question) => ({
      questionId: question.id,
      questionOrder: Number(question.order || 1),
      section: question.section || 'Q1',
      marks: Number(question.marks || 1),
      question: {
        id: question.id,
        type: question.type,
        category: question.category,
        chapterId: question.chapterId,
        descriptionText: question.descriptionText,
        mcqOpt1: question.mcqOpt1,
        mcqOpt2: question.mcqOpt2,
        mcqOpt3: question.mcqOpt3,
        mcqOpt4: question.mcqOpt4,
      },
    }))

  const getPaperSlotKey = (classId, subjectId, examTitleId, examType) =>
    `${Number(classId) || 0}|${Number(subjectId) || 0}|${Number(examTitleId) || 0}|${normalizeExamTypeOption(examType)}`

  const getPaperKey = (classId, subjectId, examTitleId, examType, paperName) => {
    const normalizedName = normalizePaperName(paperName).toLowerCase()
    if (!normalizedName) return ''
    return `${getPaperSlotKey(classId, subjectId, examTitleId, examType)}|${normalizedName}`
  }

  const getPapersInSlot = (classId, subjectId, examTitleId, examType, papers = generatedPapers) => {
    if (!classId || !subjectId || !examTitleId) return []
    const slotKey = getPaperSlotKey(classId, subjectId, examTitleId, examType)
    return papers.filter(
      (paper) =>
        getPaperSlotKey(paper.classId, paper.subjectId, paper.examTitleId, paper.examType) === slotKey,
    )
  }

  const findMatchingPaper = (
    classId,
    subjectId,
    examTitleId,
    examType,
    paperName,
    papers = generatedPapers,
  ) => {
    const targetKey = getPaperKey(classId, subjectId, examTitleId, examType, paperName)
    if (!targetKey) return null
    return (
      papers.find(
        (paper) =>
          getPaperKey(paper.classId, paper.subjectId, paper.examTitleId, paper.examType, paper.paperName) ===
          targetKey,
      ) || null
    )
  }

  const hydratePaperInEditor = (paper, { syncForm = false } = {}) => {
    setSelectedPaper(paper)
    const selected = mapPaperToSelectedQuestions(paper)
    let configs = mapPaperToSectionConfigs(paper)
    if (isSubjectiveExamType(paper.examType)) {
      configs = configs.map((section) => {
        if (!`${section.headingText || ''}`.toLowerCase().includes('choose correct option')) {
          return section
        }
        const previewRows = selected
          .filter((item) => (item.section || 'Q1') === section.sectionKey)
          .map((item) => ({ type: item.question?.type, marks: item.marks }))
        const mode = inferSectionDisplayMode(previewRows)
        return {
          ...section,
          headingText: defaultSectionHeading(section.sectionKey, paper.examType, mode),
          instructionText: section.instructionText || defaultSectionInstruction(paper.examType, mode),
        }
      })
    }
    setSectionConfigs(configs)
    setSelectedQuestions(selected)

    const formForSnapshot = {
      classId: paper.classId ? String(paper.classId) : '',
      subjectId: paper.subjectId ? String(paper.subjectId) : '',
      schoolName: paper.schoolName || '',
      schoolLogoUrl: paper.schoolLogoUrl || '',
      examTitleId: paper.examTitleId ? String(paper.examTitleId) : '',
      paperName: paper.paperName || '',
      examType: normalizeExamTypeOption(paper.examType),
      sessionLabel: paper.sessionLabel || '',
      durationMinutes: paper.durationMinutes || null,
      headerNote: paper.headerNote || '',
      instructions: paper.instructions || '',
      footerNote: paper.footerNote || '',
      showSectionNames: Boolean(paper.showSectionNames),
      subQuestionNumberingStyle: normalizeSubQuestionNumbering(
        paper.subQuestionNumberingStyle ?? 'roman',
      ),
      wrapQuestionMarksInParentheses: Boolean(paper.wrapQuestionMarksInParentheses),
    }
    markWorkspaceSaved(buildEditorSnapshot(formForSnapshot, selected, configs))
    pendingPaperBaselineSyncIdRef.current = paper.id

    if (!syncForm) return

    setForm((previous) => ({
      ...previous,
      classId: paper.classId ? String(paper.classId) : previous.classId,
      subjectId: paper.subjectId ? String(paper.subjectId) : previous.subjectId,
      schoolName: paper.schoolName || previous.schoolName,
      schoolLogoUrl: paper.schoolLogoUrl || '',
      examTitleId: paper.examTitleId ? String(paper.examTitleId) : previous.examTitleId,
      paperName: paper.paperName || previous.paperName,
      examType: normalizeExamTypeOption(paper.examType ?? previous.examType),
      sessionLabel: paper.sessionLabel || previous.sessionLabel,
      durationMinutes: paper.durationMinutes || previous.durationMinutes,
      headerNote: paper.headerNote || previous.headerNote,
      instructions: paper.instructions || previous.instructions,
      footerNote: paper.footerNote || previous.footerNote,
      showSectionNames: Boolean(paper.showSectionNames),
      subQuestionNumberingStyle: normalizeSubQuestionNumbering(
        paper.subQuestionNumberingStyle ?? previous.subQuestionNumberingStyle,
      ),
      wrapQuestionMarksInParentheses: Boolean(
        paper.wrapQuestionMarksInParentheses ?? previous.wrapQuestionMarksInParentheses,
      ),
    }))
  }

  const loadInitial = async () => {
    const requestId = ++loadInitialRequestIdRef.current
    setIsLoading(true)
    setError('')
    try {
      const [classData, subjectData, paperData, titleData] = await Promise.all([
        getAcademicClasses(),
        getAcademicSubjects(),
        getAcademicExamPapers(),
        getAcademicExamTitles(),
      ])
      if (requestId !== loadInitialRequestIdRef.current) return
      setClasses(classData)
      setSubjects(subjectData)
      setGeneratedPapers(paperData)
      setExamTitles(titleData)
      if (!initialPapersModalShownRef.current) {
        initialPapersModalShownRef.current = true
        setIsGeneratedPapersOpen(true)
      }
    } catch (requestError) {
      if (requestId !== loadInitialRequestIdRef.current) return
      const msg = requestError?.message?.includes('timeout') ? 'Server timeout. Please check your connection.' : 'Unable to load exam maker data.'
      setError(requestError?.response?.data?.message || msg)
    } finally {
      if (requestId === loadInitialRequestIdRef.current) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    void loadInitial()
  }, [])

  useEffect(() => {
    if (isLoading || initialBaselineDoneRef.current) return
    if (examTitles.length > 0 && !form.examTitleId) return
    initialBaselineDoneRef.current = true
    markWorkspaceSaved(buildEditorSnapshot(form, selectedQuestions, sectionConfigs))
  }, [
    isLoading,
    examTitles.length,
    form,
    form.examTitleId,
    selectedQuestions,
    sectionConfigs,
    markWorkspaceSaved,
  ])

  useEffect(() => {
    if (!examTitles.length) return
    setForm((previous) => {
      if (previous.examTitleId) return previous
      return { ...previous, examTitleId: String(examTitles[0].id) }
    })
  }, [examTitles])

  useEffect(() => {
    const paperId = pendingPaperBaselineSyncIdRef.current
    if (!paperId || selectedPaper?.id !== paperId || isLoading) return
    markWorkspaceSaved(buildEditorSnapshot(form, selectedQuestions, sectionConfigs))
    pendingPaperBaselineSyncIdRef.current = null
  }, [
    form,
    selectedQuestions,
    sectionConfigs,
    selectedPaper?.id,
    isLoading,
    markWorkspaceSaved,
  ])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedPoolSearch(poolFilters.search.trim())
    }, 300)
    return () => window.clearTimeout(timer)
  }, [poolFilters.search])

  const paperSetupHasClassAndSubject = Boolean(form.classId && form.subjectId)

  const catalogChapterOptions = useMemo(
    () =>
      chapters.map((item) => ({
        value: String(item.id),
        label: `${item.chapterNo}. ${item.chapterName}`,
      })),
    [chapters],
  )

  const openCatalogModal = () => {
    if (!paperSetupHasClassAndSubject) {
      setError('Select Class and Subject in Paper setup before adding questions.')
      setIsPaperSetupOpen(true)
      return
    }
    setIsCatalogModalOpen(true)
  }

  const openAutoMakerModal = () => {
    if (!paperSetupHasClassAndSubject) {
      setError('Select Class and Subject in Paper setup before making an automatic paper.')
      setIsPaperSetupOpen(true)
      return
    }

    setError('')
    setAutoMakerAlert('')
    if (selectedQuestions.length > 0) {
      setIsAutoWarningOpen(true)
      return
    }

    setIsAutoMakerOpen(true)
  }

  const updateAutoChapterCount = (chapterId, field, rawValue) => {
    const availability = autoQuestionAvailability[chapterId] || {}
    const availableCount = Number(availability[field] || 0)
    const hardMax = Math.min(250, availableCount)
    const requestedValue = rawValue === '' ? '' : Math.max(0, Number(rawValue) || 0)
    const value = requestedValue === '' ? '' : Math.min(hardMax, requestedValue)
    if (requestedValue !== '' && requestedValue > hardMax) {
      const chapter = chapters.find((item) => item.id === Number(chapterId))
      const typeLabel = field.replace('Count', '').toUpperCase()
      setAutoMakerAlert(
        `Only ${hardMax} ${typeLabel} question${hardMax === 1 ? '' : 's'} available in Chapter ${chapter?.chapterNo ?? ''}.`,
      )
    } else {
      setAutoMakerAlert('')
    }
    setAutoChapterPlan((previous) => ({
      ...previous,
      [chapterId]: {
        ...(previous[chapterId] || {}),
        [field]: value,
      },
    }))
  }

  const clearAutoChapterPlan = () => {
    setAutoMakerAlert('')
    setAutoChapterPlan({})
  }

  useEffect(() => {
    const loadAutoAvailability = async () => {
      if (!isAutoMakerOpen || !form.classId || !form.subjectId) return
      setIsAutoAvailabilityLoading(true)
      setAutoMakerAlert('')
      setAutoQuestionAvailability({})
      try {
        const availabilityRows = await getExamQuestionAvailability({
          classId: Number(form.classId),
          subjectId: Number(form.subjectId),
        })
        const availabilityMap = availabilityRows.reduce((map, row) => {
          map[row.chapterId] = {
            mcqCount: Number(row.mcqCount || 0),
            saqCount: Number(row.saqCount || 0),
            laqCount: Number(row.laqCount || 0),
          }
          return map
        }, {})
        setAutoQuestionAvailability(availabilityMap)
      } catch (requestError) {
        setAutoMakerAlert(
          requestError?.response?.data?.message ||
            'Unable to load available question counts. Please try again.',
        )
      } finally {
        setIsAutoAvailabilityLoading(false)
      }
    }

    void loadAutoAvailability()
  }, [form.classId, form.subjectId, isAutoMakerOpen])

  useEffect(() => {
    const loadChaptersForPaper = async () => {
      if (!form.classId || !form.subjectId) {
        setChapters([])
        setCatalogChapterId('')
        return
      }

      setIsChaptersLoading(true)
      try {
        const chapterData = await getAcademicChapters()
        const scopedChapters = chapterData
          .filter(
            (item) =>
              item.classId === Number(form.classId) && item.subjectId === Number(form.subjectId),
          )
          .sort((a, b) => Number(a.chapterNo) - Number(b.chapterNo))
        setChapters(scopedChapters)
        setCatalogChapterId((previous) =>
          scopedChapters.some((item) => item.id === Number(previous)) ? previous : '',
        )
      } catch (requestError) {
        setError(requestError?.response?.data?.message || 'Unable to load chapters.')
      } finally {
        setIsChaptersLoading(false)
      }
    }

    void loadChaptersForPaper()
  }, [form.classId, form.subjectId])

  useEffect(() => {
    setPoolFilters((previous) => ({ ...previous, search: '' }))
    setDebouncedPoolSearch('')
  }, [catalogChapterId])

  useEffect(() => {
    const loadPool = async () => {
      if (!form.classId || !form.subjectId || !catalogChapterId) {
        setQuestionPool([])
        return
      }

      setIsPoolLoading(true)
      setError('')
      try {
        const data = await getExamQuestionPool({
          classId: Number(form.classId),
          subjectId: Number(form.subjectId),
          chapterIds: [Number(catalogChapterId)],
          search: debouncedPoolSearch,
          type: poolFilters.type,
          category: poolFilters.category,
          take: 120,
        })
        setQuestionPool(data)
      } catch (requestError) {
        const msg = requestError?.message?.includes('timeout') ? 'Catalog search timed out. Please try again.' : 'Unable to load catalog question pool.'
        setError(requestError?.response?.data?.message || msg)
      } finally {
        setIsPoolLoading(false)
      }
    }

    void loadPool()
  }, [
    catalogChapterId,
    debouncedPoolSearch,
    form.classId,
    form.subjectId,
    poolFilters.category,
    poolFilters.type,
  ])

  useEffect(() => {
    const examType = form.examType
    const allowed = catalogQuestionTypesForExam(examType)
    setPoolFilters((previous) => {
      const nextType = allowed.includes(previous.type) ? previous.type : defaultCatalogFilterType(examType)
      return previous.type === nextType ? previous : { ...previous, type: nextType }
    })
    setSelectedQuestions((previous) =>
      previous.filter((item) => isQuestionTypeAllowedForExam(examType, item.question?.type)),
    )
  }, [form.examType])

  useEffect(() => {
    if (selectedQuestions.length === 0) return
    const uniqueSections = [...new Set(selectedQuestions.map((x) => x.section || 'Q1'))]
    setSectionConfigs((previous) => {
      const prevMap = new Map(previous.map((x) => [x.sectionKey, x]))
      return uniqueSections.map((sectionKey) => {
        const existing = prevMap.get(sectionKey)
        if (existing) return existing
        const previewRows = getSectionPreviewRows(sectionKey, selectedWithDetails)
        const marksDisplayText = inferSectionMarksDisplay(
          previewRows.length
            ? previewRows
            : selectedQuestions
                .filter((x) => (x.section || 'Q1') === sectionKey)
                .map((item) => ({ marks: Number(item.marks || 0) })),
        )
        const mode = inferSectionDisplayMode(
          previewRows.length
            ? previewRows
            : selectedQuestions
                .filter((x) => (x.section || 'Q1') === sectionKey)
                .map((item) => ({ type: item.question?.type })),
        )
        return createSectionConfig(
          sectionKey,
          '',
          defaultSectionHeading(sectionKey, form.examType, mode),
          defaultSectionInstruction(form.examType, mode),
          marksDisplayText,
        )
      })
    })
  }, [selectedQuestions, selectedWithDetails, form.examType])

  useEffect(() => {
    if (selectedQuestions.length === 0) return
    setSectionConfigs((previous) =>
      previous.map((section) => {
        const previewRows = getSectionPreviewRows(section.sectionKey, selectedWithDetails)
        if (!previewRows.length) return section

        const supportsOptional = sectionSupportsOptionalQuestions(previewRows)
        if (!supportsOptional && section.optionalQuestionsEnabled) {
          return {
            ...section,
            optionalQuestionsEnabled: false,
            optionalQuestionsAttemptCount: null,
            marksDisplayText: inferSectionMarksDisplay(previewRows),
          }
        }

        if (section.optionalQuestionsEnabled && supportsOptional) {
          return buildSectionConfigWithOptional(section, previewRows, form.examType)
        }

        return { ...section, marksDisplayText: inferSectionMarksDisplay(previewRows) }
      }),
    )
  }, [selectedQuestions, selectedWithDetails, form.examType])

  const paperMatchesFormSlot = (paper) =>
    Boolean(paper) &&
    String(paper.classId) === String(form.classId) &&
    String(paper.subjectId) === String(form.subjectId) &&
    String(paper.examTitleId) === String(form.examTitleId) &&
    normalizeExamTypeOption(paper.examType) === normalizeExamTypeOption(form.examType) &&
    paperNamesMatch(paper.paperName, form.paperName)

  const onOpenPaper = async (id, { syncForm = true, showPopupLoader = false } = {}) => {
    setSuppressPaperPreload(false)
    setIsLoading(true)
    setError('')
    if (showPopupLoader) setPopupLoaderText('Loading Exam')
    try {
      const paper = await getAcademicExamPaperById(id)
      hydratePaperInEditor(paper, { syncForm })
    } catch (requestError) {
      const msg = requestError?.message?.includes('timeout') ? 'Paper loading timed out. Please try again.' : 'Unable to load selected paper.'
      setError(requestError?.response?.data?.message || msg)
    } finally {
      setIsLoading(false)
      if (showPopupLoader) setPopupLoaderText('')
    }
  }

  const onNavigationBlocked = useCallback((path) => {
    setPendingDestructiveAction({ kind: 'route', path })
  }, [])

  const { proceedRouteNavigation } = useExamMakerUnsavedGuard({
    enabled: isWorkspaceDirty && !pendingDestructiveAction,
    onNavigationBlocked,
  })

  const runPendingDestructiveAction = useCallback(
    (action) => {
      if (!action) return
      if (action.kind === 'route') {
        proceedRouteNavigation(action.path)
        return
      }
      if (action.kind === 'paper') {
        setIsGeneratedPapersOpen(false)
        void onOpenPaper(action.id, {
          syncForm: action.syncForm ?? true,
          showPopupLoader: action.showPopupLoader ?? true,
        })
        return
      }
      if (action.kind === 'newExam') {
        setGeneratedPapersSearch('')
        setPaperPendingDelete(null)
        setIsGeneratedPapersOpen(false)
        resetExamWorkspace({ openPaperSetupModal: true, enablePreloadSuppression: true })
      }
    },
    [proceedRouteNavigation],
  )

  const requestDestructiveAction = useCallback(
    (action) => {
      const isEmptyWorkspace = !selectedPaper && selectedQuestions.length === 0
      if (isEmptyWorkspace && (action.kind === 'newExam' || action.kind === 'paper')) {
        runPendingDestructiveAction(action)
        return
      }
      if (!isWorkspaceDirty) {
        runPendingDestructiveAction(action)
        return
      }
      setPendingDestructiveAction(action)
    },
    [isWorkspaceDirty, runPendingDestructiveAction, selectedPaper, selectedQuestions.length],
  )

  const requestOpenPaper = useCallback(
    (id, options = { syncForm: true }) => {
      if (selectedPaper?.id === id) return
      requestDestructiveAction({
        kind: 'paper',
        id,
        syncForm: options.syncForm,
        showPopupLoader: options.showPopupLoader ?? true,
      })
    },
    [requestDestructiveAction, selectedPaper?.id],
  )

  const onCreateNewExam = () => {
    requestDestructiveAction({ kind: 'newExam' })
  }

  const onCancelUnsavedLeave = () => {
    if (isSavingBeforeLeave) return
    setPendingDestructiveAction(null)
  }

  const onConfirmLeaveWithoutSaving = () => {
    if (isSavingBeforeLeave) return
    const action = pendingDestructiveAction
    setPendingDestructiveAction(null)
    runPendingDestructiveAction(action)
  }

  const onSaveBeforeLeave = async () => {
    if (isSavingBeforeLeave || isGeneratingFromSelection) return
    setIsSavingBeforeLeave(true)
    const saved = await saveExamPaperFromSelection()
    setIsSavingBeforeLeave(false)
    if (!saved) return
    const action = pendingDestructiveAction
    setPendingDestructiveAction(null)
    runPendingDestructiveAction(action)
  }

  useEffect(() => {
    if (!form.classId || !form.subjectId || !form.examTitleId || !generatedPapers.length) return

    const sameSlot = selectedPaper ? paperMatchesFormSlot(selectedPaper) : false

    if (suppressPaperPreload) {
      if (selectedPaper && !sameSlot) {
        setSelectedPaper(null)
        setSelectedQuestions([])
        setSectionConfigs([])
        preloadKeyRef.current = ''
      }
      return
    }

    const papersInSlot = getPapersInSlot(
      form.classId,
      form.subjectId,
      form.examTitleId,
      form.examType,
    )
    const normalizedPaperName = normalizePaperName(form.paperName)

    if (!normalizedPaperName) {
      if (papersInSlot.length === 1) {
        const onlyPaper = papersInSlot[0]
        const key = getPaperKey(
          form.classId,
          form.subjectId,
          form.examTitleId,
          form.examType,
          onlyPaper.paperName,
        )
        if (preloadKeyRef.current !== key && selectedPaper?.id !== onlyPaper.id) {
          preloadKeyRef.current = key
          void onOpenPaper(onlyPaper.id, { syncForm: true })
        }
        return
      }

      if (selectedPaper && !sameSlot) {
        setSelectedPaper(null)
        setSelectedQuestions([])
        setSectionConfigs([])
        preloadKeyRef.current = ''
      }
      return
    }

    const paper = findMatchingPaper(
      form.classId,
      form.subjectId,
      form.examTitleId,
      form.examType,
      normalizedPaperName,
    )
    if (!paper) {
      if (selectedPaper && !sameSlot) {
        setSelectedPaper(null)
        setSelectedQuestions([])
        setSectionConfigs([])
        preloadKeyRef.current = ''
      }
      return
    }

    const key = getPaperKey(
      form.classId,
      form.subjectId,
      form.examTitleId,
      form.examType,
      normalizedPaperName,
    )
    if (preloadKeyRef.current === key || selectedPaper?.id === paper.id) return
    preloadKeyRef.current = key
    void onOpenPaper(paper.id, { syncForm: true })
  }, [
    form.classId,
    form.subjectId,
    form.examTitleId,
    form.examType,
    form.paperName,
    generatedPapers,
    selectedPaper,
    suppressPaperPreload,
  ])

  const onRequestDeletePaper = (paper, event) => {
    event?.stopPropagation()
    if (deletingPaperId) return
    setPaperPendingDelete(paper)
  }

  const onCancelDeletePaper = () => {
    if (deletingPaperId) return
    setPaperPendingDelete(null)
  }

  const anyExamMakerModalOpen =
    isPreviewOpen ||
    isCatalogModalOpen ||
    isAutoMakerOpen ||
    isAutoWarningOpen ||
    isPaperSetupOpen ||
    isGeneratedPapersOpen ||
    Boolean(paperPendingDelete) ||
    Boolean(pendingDestructiveAction)

  useEffect(() => {
    if (!anyExamMakerModalOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [anyExamMakerModalOpen])

  useEffect(() => {
    if (!anyExamMakerModalOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      if (pendingDestructiveAction) {
        onCancelUnsavedLeave()
        return
      }
      if (paperPendingDelete) {
        onCancelDeletePaper()
        return
      }
      if (isCatalogModalOpen) {
        setIsCatalogModalOpen(false)
        return
      }
      if (isAutoWarningOpen) {
        setIsAutoWarningOpen(false)
        return
      }
      if (isAutoMakerOpen) {
        setIsAutoMakerOpen(false)
        return
      }
      if (isPaperSetupOpen) {
        setIsPaperSetupOpen(false)
        return
      }
      if (isGeneratedPapersOpen) {
        closeGeneratedPapersModal()
        return
      }
      if (isPreviewOpen) {
        setIsPreviewOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    anyExamMakerModalOpen,
    paperPendingDelete,
    pendingDestructiveAction,
    isCatalogModalOpen,
    isAutoMakerOpen,
    isAutoWarningOpen,
    isPaperSetupOpen,
    isGeneratedPapersOpen,
    isPreviewOpen,
    deletingPaperId,
  ])

  const onConfirmDeletePaper = async () => {
    if (!paperPendingDelete || deletingPaperId) return

    const paper = paperPendingDelete
    setDeletingPaperId(paper.id)
    setError('')
    try {
      await deleteAcademicExamPaper(paper.id)
      const paperData = await getAcademicExamPapers()
      setGeneratedPapers(paperData)
      if (selectedPaper?.id === paper.id) {
        preloadKeyRef.current = ''
        setSelectedPaper(null)
        setSelectedQuestions([])
        setSectionConfigs([])
        markWorkspaceSaved(buildEditorSnapshot(form, [], []))
      }
      setPaperPendingDelete(null)
    } catch (requestError) {
      const msg = requestError?.message?.includes('timeout') ? 'Delete request timed out. Please try again.' : 'Unable to delete exam paper.'
      setError(requestError?.response?.data?.message || msg)
    } finally {
      setDeletingPaperId(null)
    }
  }

  const addQuestionFromCatalog = (question) => {
    if (!isQuestionTypeAllowedForExam(form.examType, question.type)) {
      setError(
        isObjectiveExamType(form.examType)
          ? 'Objective papers can include MCQ questions only.'
          : 'Subjective papers can include SAQ and LAQ questions only.',
      )
      return
    }
    if (selectedQuestions.some((item) => item.questionId === question.id)) {
      setError('This question is already added.')
      return
    }
    setSelectedQuestions((previous) => {
      const sectionKey = defaultSectionKeyForQuestionType(question.type, form.examType, previous)
      if (!sectionKey) return previous
      return [
        ...previous,
        {
          questionId: question.id,
          questionOrder: previous.length + 1,
          section: sectionKey,
          marks: Math.min(defaultMarksForQuestionType(question.type), 100),
          question: {
            id: question.id,
            type: question.type,
            category: question.category,
            chapterId: question.chapterId,
            descriptionText: question.descriptionText,
            mcqOpt1: question.mcqOpt1,
            mcqOpt2: question.mcqOpt2,
            mcqOpt3: question.mcqOpt3,
            mcqOpt4: question.mcqOpt4,
          },
        },
      ]
    })
  }

  const removeSelectedQuestion = (questionId) => {
    setSelectedQuestions((previous) => previous.filter((item) => item.questionId !== questionId))
  }

  const updateSelectedQuestion = (questionId, field, value) => {
    setSelectedQuestions((previous) =>
      previous.map((item) => (item.questionId === questionId ? { ...item, [field]: value } : item)),
    )
  }

  const saveExamPaperFromSelection = async () => {
    if (!form.classId || !form.subjectId) {
      setError('Class and Subject are required.')
      return false
    }
    if (!form.examTitleId) {
      setError('Select an exam title from the list (manage titles under Settings → Exam titles).')
      return false
    }
    const normalizedPaperName = normalizePaperName(form.paperName)
    if (!normalizedPaperName) {
      setError('Enter a paper name in Paper setup (e.g. Set A, Version 1).')
      setIsPaperSetupOpen(true)
      return false
    }
    if (normalizedPaperName.length > 200) {
      setError('Paper name must be 200 characters or fewer.')
      setIsPaperSetupOpen(true)
      return false
    }
    if (!selectedQuestions.length) {
      setError('Pick at least one question from the catalog.')
      return false
    }

    const disallowedType = selectedQuestions.find(
      (item) => !isQuestionTypeAllowedForExam(form.examType, item.question?.type),
    )
    if (disallowedType) {
      setError(
        isObjectiveExamType(form.examType)
          ? 'Remove SAQ/LAQ questions — this paper is objective (MCQ only).'
          : 'Remove MCQ questions — this paper is subjective (SAQ/LAQ only).',
      )
      return false
    }

    const marksInvalid = selectedQuestions.some((item) => {
      const m = Number(item.marks)
      return !Number.isFinite(m) || m < 1 || m > 100
    })
    if (marksInvalid) {
      setError('Every selected question needs marks between 1 and 100.')
      return false
    }

    for (const section of sectionConfigs) {
      if (!section.optionalQuestionsEnabled) continue
      const previewRows = getSectionPreviewRows(section.sectionKey, selectedWithDetails)
      if (!sectionSupportsOptionalQuestions(previewRows) || previewRows.length < 2) {
        setError('Optional questions apply only to SAQ/LAQ sections with at least two questions.')
        return false
      }
      const attempt = Number(section.optionalQuestionsAttemptCount)
      if (!Number.isFinite(attempt) || attempt < 1 || attempt >= previewRows.length) {
        setError(
          'Optional attempt count must be at least 1 and less than the number of questions in that section.',
        )
        return false
      }
    }

    setIsGeneratingFromSelection(true)
    setError('')
    try {
      const payload = {
        classId: Number(form.classId),
        subjectId: Number(form.subjectId),
        schoolName: form.schoolName,
        schoolLogoUrl: form.schoolLogoUrl || null,
        examTitleId: Number(form.examTitleId),
        paperName: normalizedPaperName,
        examType: normalizeExamTypeOption(form.examType),
        sessionLabel: form.sessionLabel,
        durationMinutes: Number(form.durationMinutes) || null,
        headerNote: form.headerNote,
        instructions: form.instructions,
        footerNote: form.footerNote,
        showSectionNames: Boolean(form.showSectionNames),
        subQuestionNumberingStyle: form.subQuestionNumberingStyle,
        wrapQuestionMarksInParentheses: Boolean(form.wrapQuestionMarksInParentheses),
        sections: sectionConfigs,
        selectedQuestions: selectedQuestions.map((item) => ({
          questionId: item.questionId,
          questionOrder: Number(item.questionOrder),
          section: item.section,
          marks: Number(item.marks),
        })),
      }

      let savedPaper
      if (selectedPaper?.id) {
        savedPaper = await updateAcademicExamPaperFromSelection(selectedPaper.id, payload)
      } else {
        const existingPaper = findMatchingPaper(
          form.classId,
          form.subjectId,
          form.examTitleId,
          form.examType,
          normalizedPaperName,
        )
        savedPaper = existingPaper
          ? await updateAcademicExamPaperFromSelection(existingPaper.id, payload)
          : await createAcademicExamPaperFromSelection(payload)
      }
      hydratePaperInEditor(savedPaper, { syncForm: true })
      setSuppressPaperPreload(false)
      const paperData = await getAcademicExamPapers()
      setGeneratedPapers(paperData)
      clearDraft()
      return true
    } catch (requestError) {
      const body = requestError?.response?.data
      const apiMessage =
        (typeof body?.message === 'string' && body.message) ||
        (typeof body?.detail === 'string' && body.detail) ||
        (typeof body?.title === 'string' && body.title) ||
        ''
      const timeoutMsg = requestError?.message?.includes('timeout') ? ' The server is taking too long to respond. Please try again.' : ''
      setError(apiMessage || `Paper creation from selected questions failed.${timeoutMsg}`)
      return false
    } finally {
      setIsGeneratingFromSelection(false)
    }
  }

  const randomizePaperFromChapters = async () => {
    if (!form.classId || !form.subjectId) {
      setError('Class and Subject are required.')
      setIsPaperSetupOpen(true)
      return
    }
    if (!form.examTitleId) {
      setError('Select an exam title from the list before making an automatic paper.')
      setIsPaperSetupOpen(true)
      return
    }
    const normalizedPaperName = normalizePaperName(form.paperName)
    if (!normalizedPaperName) {
      setError('Enter a paper name in Paper setup (e.g. Set A, Version 1).')
      setIsPaperSetupOpen(true)
      return
    }
    if (normalizedPaperName.length > 200) {
      setError('Paper name must be 200 characters or fewer.')
      setIsPaperSetupOpen(true)
      return
    }

    const chapterRules = chapters
      .map((chapter) => {
        const plan = autoChapterPlan[chapter.id] || {}
        return {
          chapterId: Number(chapter.id),
          mcqCount: isObjectiveExamType(form.examType) ? Number(plan.mcqCount || 0) : 0,
          saqCount: isSubjectiveExamType(form.examType) ? Number(plan.saqCount || 0) : 0,
          laqCount: isSubjectiveExamType(form.examType) ? Number(plan.laqCount || 0) : 0,
        }
      })
      .filter((rule) => rule.mcqCount > 0 || rule.saqCount > 0 || rule.laqCount > 0)

    if (!chapterRules.length) {
      setAutoMakerAlert('Choose at least one chapter and enter how many questions to take.')
      return
    }

    if (isAutoAvailabilityLoading) {
      setAutoMakerAlert('Available question counts are still loading. Please wait a moment.')
      return
    }

    if (autoAvailabilityIssues.length > 0) {
      const firstIssue = autoAvailabilityIssues[0]
      setAutoMakerAlert(
        `Chapter ${firstIssue.chapterNo} has only ${firstIssue.available} ${firstIssue.label} question${firstIssue.available === 1 ? '' : 's'}, but ${firstIssue.requested} were requested.`,
      )
      return
    }

    setIsRandomizingPaper(true)
    setError('')
    setAutoMakerAlert('')
    setPopupLoaderText('Creating Exam')
    try {
      const existingPaper = selectedPaper?.id
        ? selectedPaper
        : findMatchingPaper(form.classId, form.subjectId, form.examTitleId, form.examType, normalizedPaperName)
      const payload = {
        paperId: existingPaper?.id || null,
        classId: Number(form.classId),
        subjectId: Number(form.subjectId),
        schoolName: form.schoolName,
        schoolLogoUrl: form.schoolLogoUrl || null,
        examTitleId: Number(form.examTitleId),
        paperName: normalizedPaperName,
        examType: normalizeExamTypeOption(form.examType),
        sessionLabel: form.sessionLabel,
        durationMinutes: Number(form.durationMinutes) || null,
        headerNote: form.headerNote,
        instructions: form.instructions,
        footerNote: form.footerNote,
        showSectionNames: Boolean(form.showSectionNames),
        subQuestionNumberingStyle: form.subQuestionNumberingStyle,
        wrapQuestionMarksInParentheses: Boolean(form.wrapQuestionMarksInParentheses),
        sections: [],
        chapterRules,
      }

      const savedPaper = await randomizeAcademicExamPaperFromChapters(payload)
      const confirmSavePayload = {
        classId: Number(savedPaper.classId || form.classId),
        subjectId: Number(savedPaper.subjectId || form.subjectId),
        schoolName: savedPaper.schoolName || form.schoolName,
        schoolLogoUrl: savedPaper.schoolLogoUrl || form.schoolLogoUrl || null,
        examTitleId: Number(savedPaper.examTitleId || form.examTitleId),
        paperName: normalizePaperName(savedPaper.paperName || normalizedPaperName),
        examType: normalizeExamTypeOption(savedPaper.examType || form.examType),
        sessionLabel: savedPaper.sessionLabel || form.sessionLabel,
        durationMinutes: Number(savedPaper.durationMinutes || form.durationMinutes) || null,
        headerNote: savedPaper.headerNote || form.headerNote,
        instructions: savedPaper.instructions || form.instructions,
        footerNote: savedPaper.footerNote || form.footerNote,
        showSectionNames: Boolean(savedPaper.showSectionNames ?? form.showSectionNames),
        subQuestionNumberingStyle: savedPaper.subQuestionNumberingStyle || form.subQuestionNumberingStyle,
        wrapQuestionMarksInParentheses: Boolean(
          savedPaper.wrapQuestionMarksInParentheses ?? form.wrapQuestionMarksInParentheses,
        ),
        sections: savedPaper.sections || [],
        selectedQuestions: (savedPaper.questions || []).map((question) => ({
          questionId: question.id,
          questionOrder: Number(question.order || 1),
          section: question.section || 'Q1',
          marks: Number(question.marks || 1),
        })),
      }
      const confirmedPaper = savedPaper?.id
        ? await updateAcademicExamPaperFromSelection(savedPaper.id, confirmSavePayload)
        : savedPaper
      hydratePaperInEditor(confirmedPaper, { syncForm: true })
      setSuppressPaperPreload(false)
      setIsAutoMakerOpen(false)
      const paperData = await getAcademicExamPapers()
      setGeneratedPapers(paperData)
      clearDraft()
    } catch (requestError) {
      const body = requestError?.response?.data
      const apiMessage =
        (typeof body?.message === 'string' && body.message) ||
        (typeof body?.detail === 'string' && body.detail) ||
        (typeof body?.title === 'string' && body.title) ||
        ''
      const timeoutMsg = requestError?.message?.includes('timeout') ? ' The server is taking too long to respond. Please try again.' : ''
      setAutoMakerAlert(apiMessage || `Automatic question paper creation failed.${timeoutMsg}`)
    } finally {
      setIsRandomizingPaper(false)
      setPopupLoaderText('')
    }
  }

  const onGenerateFromSelection = () => {
    void saveExamPaperFromSelection()
  }

  const onPrint = () => {
    document.body.classList.add('printing-exam-paper')
    window.print()
    setTimeout(() => {
      document.body.classList.remove('printing-exam-paper')
    }, 200)
  }

  const defaultExamForm = () => ({
    classId: '',
    subjectId: '',
    schoolName: 'SCIENCE BASE SCHOOL®',
    schoolLogoUrl: '',
    examTitleId: examTitles.length ? String(examTitles[0].id) : '',
    paperName: '',
    examType: EXAM_TYPE.OBJECTIVE,
    sessionLabel: '2026-27',
    durationMinutes: 20,
    headerNote: DEFAULT_OBJECTIVE_HEADER_NOTE,
    instructions: 'Attempt according to section instructions.',
    footerNote: '',
    showSectionNames: false,
    subQuestionNumberingStyle: 'roman',
    wrapQuestionMarksInParentheses: false,
  })

  const resetExamWorkspace = ({ openPaperSetupModal = false, enablePreloadSuppression = false } = {}) => {
    preloadKeyRef.current = ''
    initialBaselineDoneRef.current = false
    setSuppressPaperPreload(enablePreloadSuppression)
    setSelectedPaper(null)
    setQuestionPool([])
    setSelectedQuestions([])
    setSectionConfigs([])
    setPoolFilters({ type: defaultCatalogFilterType(EXAM_TYPE.OBJECTIVE), category: 'all', search: '' })
    setDebouncedPoolSearch('')
    setChapters([])
    setCatalogChapterId('')
    setError('')
    setIsPreviewOpen(false)
    setIsCatalogModalOpen(false)
    setIsAutoMakerOpen(false)
    setIsAutoWarningOpen(false)
    setAutoMakerAlert('')
    setIsPaperSetupOpen(openPaperSetupModal)
    const emptyForm = defaultExamForm()
    setForm(emptyForm)
    setAutoChapterPlan({})
    setAutoQuestionAvailability({})
    initialBaselineDoneRef.current = true
    markWorkspaceSaved(buildEditorSnapshot(emptyForm, [], []))
  }

  const updateSectionConfig = (sectionKey, field, value) => {
    setSectionConfigs((previous) =>
      previous.map((item) => (item.sectionKey === sectionKey ? { ...item, [field]: value } : item)),
    )
  }

  const setSectionOptionalQuestions = (sectionKey, enabled) => {
    setSectionConfigs((previous) =>
      previous.map((section) => {
        if (section.sectionKey !== sectionKey) return section
        const previewRows = getSectionPreviewRows(sectionKey, selectedWithDetails)
        if (!enabled || !sectionSupportsOptionalQuestions(previewRows) || previewRows.length < 2) {
          return clearSectionOptionalConfig(section, previewRows, form.examType)
        }

        return buildSectionConfigWithOptional(section, previewRows, form.examType)
      }),
    )
  }

  const setSectionOptionalAttemptCount = (sectionKey, rawValue) => {
    setSectionConfigs((previous) =>
      previous.map((section) => {
        if (section.sectionKey !== sectionKey) return section
        const previewRows = getSectionPreviewRows(sectionKey, selectedWithDetails)
        return buildSectionConfigWithOptional(
          { ...section, optionalQuestionsAttemptCount: rawValue },
          previewRows,
          form.examType,
        )
      }),
    )
  }

  const previewExamType = form.examType || selectedPaper?.examType
  const previewHeaderNote = form.headerNote || selectedPaper?.headerNote || ''
  const showHeaderNote =
    Boolean(previewHeaderNote?.trim()) &&
    (!isSubjectiveExamType(previewExamType) || !isDefaultObjectiveHeaderNote(previewHeaderNote))
  const previewDurationMinutes = Number(form.durationMinutes) || selectedPaper?.durationMinutes || 0

  const previewClassName = selectedClass?.label || selectedPaper?.className || '—'
  const previewSubjectName = selectedSubject?.label || selectedPaper?.subjectName || '—'
  const previewLogoSrc = form.schoolLogoUrl || selectedPaper?.schoolLogoUrl || instituteLogoSrc
  const previewFooterNote = form.footerNote || selectedPaper?.footerNote || ''
  const previewShowSectionNames = Boolean(form.showSectionNames ?? selectedPaper?.showSectionNames)
  const showStudentNameRollSectionRow = isObjectiveExamType(previewExamType)

  const renderPaperDocument = ({ includeSectionEditors = false } = {}) => (
    <section className="exam-paper min-w-0 rounded-xl border border-slate-300 bg-white p-6 shadow-sm md:p-8">
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
          <Loader2 size={16} className="animate-spin" /> Loading paper...
        </div>
      ) : previewQuestions.length === 0 ? (
        <p className="py-10 text-center text-slate-500">
          Add questions from the catalog to build your paper. Adjust marks before saving.
        </p>
      ) : (
        <div className="exam-paper-content mx-auto min-w-0 w-full text-black">
          <header className="exam-paper-header">
            <div className="exam-paper-header-row">
              <div className="exam-paper-header-brand">
                {previewLogoSrc ? (
                  <img src={previewLogoSrc} alt="School logo" className="exam-paper-logo" />
                ) : null}
                <div className="exam-paper-header-titles">
                  <div className="exam-paper-header-titles-block">
                  <h1 className="exam-paper-school-name">{form.schoolName || selectedPaper?.schoolName}</h1>
                  <div className="exam-paper-school-rule" aria-hidden="true" />
                  <h2
                    className="exam-paper-exam-title"
                    dangerouslySetInnerHTML={{
                      __html: formatExamTitleForPrint(draftExamTitleLabel),
                    }}
                  />
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="exam-paper-meta grid min-w-0 grid-cols-2 gap-x-4 gap-y-0.5">
            <div className="min-w-0">
              <p>
                <strong>Subject:</strong> {previewSubjectName} (
                {formatExamTypeDisplay(form.examType || selectedPaper?.examType)})
              </p>
              <p>
                <strong>Class:</strong> {previewClassName}
              </p>
            </div>
            <div className="min-w-0 text-right">
              <p>
                <strong>Marks:</strong> {previewTotalMarks}
              </p>
              <p>
                <strong>Time:</strong> {formatExamDurationLabel(previewDurationMinutes)}
              </p>
            </div>
            {showStudentNameRollSectionRow ? (
              <div className="col-span-2 min-w-0 pt-1">
                <table className="exam-paper-student-table w-full">
                  <tbody>
                    <tr>
                      <td className="exam-paper-student-name-col w-[58%] min-w-0 py-0 pr-3 align-bottom">
                        <div className="flex w-full min-w-0 items-end gap-2">
                          <strong className="shrink-0 whitespace-nowrap">Name:</strong>
                          <span className="block min-h-[1.1em] min-w-0 flex-1 border-b border-black pb-[2px]" />
                        </div>
                      </td>
                      <td className="w-[21%] min-w-0 py-0 px-2 align-bottom">
                        <div className="flex w-full min-w-0 items-end gap-2">
                          <strong className="shrink-0 whitespace-nowrap">Roll No.:</strong>
                          <span className="block min-h-[1.1em] min-w-[3.25rem] flex-1 border-b border-black pb-[2px]" />
                        </div>
                      </td>
                      <td className="w-[21%] min-w-0 py-0 pl-2 align-bottom">
                        <div className="flex w-full min-w-0 items-end gap-2">
                          <strong className="shrink-0 whitespace-nowrap">Section:</strong>
                          <span className="block min-h-[1.1em] min-w-[3rem] flex-1 border-b border-black pb-[2px]" />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          {showHeaderNote ? (
            <p className="exam-paper-meta mb-2">
              <strong>Note:</strong> {previewHeaderNote}
            </p>
          ) : null}

          {groupedPreviewQuestions.map(([section, questions]) => {
            const config = sectionConfigMap.get(section)
            const sectionMode = inferSectionDisplayMode(questions)
            const optionalActive =
              Boolean(config?.optionalQuestionsEnabled) && sectionSupportsOptionalQuestions(questions)
            const optionalAttempt = optionalActive
              ? clampOptionalAttemptCount(questions.length, config?.optionalQuestionsAttemptCount)
              : null
            const sectionMarks = questions.reduce((sum, item) => sum + (Number(item.marks) || 0), 0)
            const marksPresentation = resolveSectionMarksPresentation(questions, {
              attemptCount: optionalActive ? optionalAttempt : null,
            })
            const marksText = marksPresentation.showSectionMarksOnHeading
              ? marksPresentation.marksText || config?.marksDisplayText || `${sectionMarks}`
              : ''
            let headingText =
              config?.headingText || defaultSectionHeading(section, previewExamType, sectionMode)
            if (sectionMode === 'laq' && /^Q\d+:\s*$/i.test(`${headingText}`.trim())) {
              headingText = defaultSectionHeading(section, previewExamType, sectionMode)
            }
            const showSectionHeadingRow =
              sectionMode === 'saq' || sectionMode === 'mcq' || sectionMode === 'laq'
            const sectionHeadingParts = resolveSectionHeadingDisplay({
              sectionKey: section,
              headingText,
              examType: previewExamType,
              mode: sectionMode,
              optionalActive,
              optionalAttempt,
            })
            const instructionText =
              sectionMode !== 'saq' && sectionMode !== 'laq' ? config?.instructionText : ''

            const sectionReferenceLabel = previewShowSectionNames
              ? resolveSectionBannerLabel(section, config?.sectionName)
              : ''
            const showSectionMarksOnHeading =
              sectionMode === 'laq'
                ? marksPresentation.showSectionMarksOnHeading
                : sectionMode !== 'saq'
            const showPerQuestionMarks =
              sectionMode === 'laq' ? marksPresentation.showPerQuestionMarks : sectionMode !== 'saq'

            return (
              <section key={section} className="exam-paper-section">
                {showSectionHeadingRow ? (
                  <>
                    {previewShowSectionNames && sectionReferenceLabel ? (
                      <p className="exam-paper-section-ref-label">{sectionReferenceLabel}</p>
                    ) : null}
                    <div className="exam-paper-section-heading-row min-w-0">
                      <h3 className="exam-paper-section-heading min-w-0">
                        <span className="exam-paper-section-heading-key">{sectionHeadingParts.prefix}</span>
                        {sectionHeadingParts.body ? (
                          <>
                            {' '}
                            <span className="exam-paper-section-heading-body">{sectionHeadingParts.body}</span>
                          </>
                        ) : null}
                      </h3>
                      <div className="exam-paper-section-heading-aside">
                        {showSectionMarksOnHeading ? (
                          <p className="exam-paper-section-marks tabular-nums">{marksText}</p>
                        ) : null}
                      </div>
                    </div>
                  </>
                ) : null}

                {instructionText ? (
                  <p className="exam-paper-instruction">{instructionText}</p>
                ) : null}

                {includeSectionEditors && configBlock(section)}

                {sectionMode === 'laq' ? (
                  <div className="exam-paper-saq-list exam-paper-saq-list-laq">
                    {questions.map((question, index) => {
                      const qLabel = `${formatLaqQuestionLabel(section, index)}:`
                      const parts = parseLaqParts(question.descriptionText, question.marks)
                      const hasParts = parts.length > 1 && parts[0].label

                      if (hasParts) {
                        return (
                          <div key={`${section}-${question.id}-${question.order}`} className="exam-paper-saq-item">
                            {parts.map((part, partIndex) => (
                              <div
                                key={`${question.id}-${part.label}`}
                                className={`exam-paper-saq-row exam-paper-saq-row-laq${showPerQuestionMarks ? '' : ' exam-paper-saq-row-stem-only'}`}
                              >
                                <span
                                  className={`exam-paper-saq-label select-none${partIndex === 0 ? ' exam-paper-saq-label-laq' : ''}`}
                                >
                                  {partIndex === 0 ? qLabel : `(${part.label})`}
                                </span>
                                <div className="exam-paper-question-stem min-w-0">
                                  <MathText value={part.text} />
                                </div>
                                {showPerQuestionMarks ? (
                                  <span className="exam-paper-saq-marks shrink-0 whitespace-nowrap text-right tabular-nums">
                                    {formatIndividualMarks(part.marks, form.wrapQuestionMarksInParentheses)}
                                  </span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )
                      }

                      return (
                        <div key={`${section}-${question.id}-${question.order}`} className="exam-paper-saq-item">
                          <div
                            className={`exam-paper-saq-row exam-paper-saq-row-laq${showPerQuestionMarks ? '' : ' exam-paper-saq-row-stem-only'}`}
                          >
                            <span className="exam-paper-saq-label exam-paper-saq-label-laq select-none">{qLabel}</span>
                            <div className="exam-paper-question-stem min-w-0">
                              <MathText value={question.descriptionText} />
                            </div>
                            {showPerQuestionMarks ? (
                              <span className="exam-paper-saq-marks shrink-0 whitespace-nowrap text-right tabular-nums">
                                {formatIndividualMarks(question.marks, form.wrapQuestionMarksInParentheses)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="exam-paper-saq-list">
                    {questions.map((question, index) => (
                      <div key={`${section}-${question.id}-${question.order}`} className="exam-paper-saq-item">
                        <div
                          className={
                            question.type !== 'mcq'
                              ? `exam-paper-saq-row${showPerQuestionMarks ? '' : ' exam-paper-saq-row-stem-only'}`
                              : 'exam-paper-saq-row exam-paper-saq-row-mcq'
                          }
                        >
                          <span className="exam-paper-saq-label select-none">
                            {formatSubQuestionLabel(form.subQuestionNumberingStyle, index + 1)}
                          </span>
                          <div className="exam-paper-question-stem min-w-0">
                            <MathText
                              value={question.descriptionText}
                              className="block min-w-0 break-words"
                            />
                          </div>
                          {question.type !== 'mcq' && showPerQuestionMarks ? (
                            <span className="exam-paper-saq-marks shrink-0 whitespace-nowrap text-right tabular-nums">
                              {formatIndividualMarks(question.marks, form.wrapQuestionMarksInParentheses)}
                            </span>
                          ) : null}
                        </div>
                        {question.type === 'mcq' ? (
                          <div className="exam-paper-mcq-options grid grid-cols-2 gap-x-8">
                            <p>
                              a) <MathText value={question.mcqOpt1} />
                            </p>
                            <p>
                              b) <MathText value={question.mcqOpt2} />
                            </p>
                            {question.mcqOpt3 ? (
                              <p>
                                c) <MathText value={question.mcqOpt3} />
                              </p>
                            ) : null}
                            {question.mcqOpt4 ? (
                              <p>
                                d) <MathText value={question.mcqOpt4} />
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )
          })}

          {previewFooterNote ? (
            <footer className="exam-paper-meta mt-4 border-t border-black pt-2">
              <strong>Note:</strong> {previewFooterNote}
            </footer>
          ) : null}
        </div>
      )}
    </section>
  )

  function configBlock(sectionKey) {
    const section = sectionConfigs.find((s) => s.sectionKey === sectionKey)
    if (!section) return null
    const sectionPreviewRows = previewQuestions
      .filter((item) => (item.section || 'Q1') === sectionKey)
      .map((item) => ({ marks: item.marks, type: item.type }))
    const canUseOptional = sectionSupportsOptionalQuestions(sectionPreviewRows)
    return (
      <div className="print-hidden mb-3 rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
        <p className="mb-2 font-semibold text-slate-600">
          Section «{formatSectionRomanLabel(section.sectionKey)}» ({section.sectionKey})
        </p>
        {canUseOptional ? (
          <div className="mb-3 rounded border border-amber-200 bg-amber-50/80 p-2">
            <label className="flex cursor-pointer items-center gap-2 font-medium text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(section.optionalQuestionsEnabled)}
                onChange={(e) => setSectionOptionalQuestions(section.sectionKey, e.target.checked)}
              />
              Optional questions (SAQ/LAQ — attempt any N)
            </label>
            {section.optionalQuestionsEnabled ? (
              <label className="mt-2 block">
                <span className="mb-0.5 block text-[10px] uppercase text-slate-500">Questions to attempt</span>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, sectionPreviewRows.length - 1)}
                  value={section.optionalQuestionsAttemptCount ?? ''}
                  onChange={(e) => setSectionOptionalAttemptCount(section.sectionKey, e.target.value)}
                  className="w-full max-w-[8rem] rounded border border-slate-200 bg-white px-2 py-1"
                />
                <span className="mt-1 block text-[10px] text-slate-500">
                  {sectionPreviewRows.length} in section — student attempts {section.optionalQuestionsAttemptCount ?? '…'}{' '}
                  (marks summary updates automatically)
                </span>
              </label>
            ) : null}
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block min-w-0">
            <span className="mb-0.5 block text-[10px] uppercase text-slate-500">Title (optional banner)</span>
            <input
              value={section.sectionName || ''}
              onChange={(e) => updateSectionConfig(section.sectionKey, 'sectionName', e.target.value)}
              placeholder="e.g. MCQs"
              className="w-full rounded border border-slate-200 bg-white px-2 py-1"
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-0.5 block text-[10px] uppercase text-slate-500">Marks summary (printed right)</span>
            <input
              value={section.marksDisplayText}
              onChange={(e) => updateSectionConfig(section.sectionKey, 'marksDisplayText', e.target.value)}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1"
            />
          </label>
          <label className="block min-w-0 sm:col-span-2">
            <span className="mb-0.5 block text-[10px] uppercase text-slate-500">Main heading (printed left)</span>
            <input
              value={section.headingText}
              onChange={(e) => updateSectionConfig(section.sectionKey, 'headingText', e.target.value)}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1"
            />
          </label>
          <label className="block min-w-0 sm:col-span-2">
            <span className="mb-0.5 block text-[10px] uppercase text-slate-500">Extra instruction (optional)</span>
            <input
              value={section.instructionText}
              onChange={(e) => updateSectionConfig(section.sectionKey, 'instructionText', e.target.value)}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1"
            />
          </label>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="print-hidden border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1900px] flex-wrap items-center justify-between gap-2 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <FileOutput size={18} className="text-slate-500" />
            <div>
              <h1 className="text-lg font-semibold leading-tight">Exam Maker</h1>
              <p className="text-xs text-slate-500">Live preview + selected questions</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              to="/academics/dashboard"
              className="rounded border border-indigo-500 bg-white px-2 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
            >
              <ArrowLeft size={14} className="mr-1 inline" />
              Back
            </Link>
            <button
              type="button"
              onClick={onCreateNewExam}
              className="rounded border border-sky-500 bg-white px-2 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50"
            >
              <FilePlus size={14} className="mr-1 inline" />
              New Exam
            </button>
            <button
              type="button"
              onClick={onGenerateFromSelection}
              disabled={!hasActiveExamWorkspace || isGeneratingFromSelection}
              className="rounded border border-emerald-600 bg-emerald-600 px-2 py-1.5 text-xs text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGeneratingFromSelection ? <Loader2 size={14} className="mr-1 inline animate-spin" /> : <Sparkles size={14} className="mr-1 inline" />}
              Save Exam
            </button>
            <button
              type="button"
              onClick={() => setIsGeneratedPapersOpen(true)}
              className="rounded border border-amber-500 bg-white px-2 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-50"
            >
              <FolderOpen size={14} className="mr-1 inline" />
              Papers
              {generatedPapers.length > 0 ? (
                <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-700">
                  {generatedPapers.length}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={openCatalogModal}
              disabled={!hasActiveExamWorkspace}
              className="rounded border border-indigo-500 bg-white px-2 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={14} className="mr-1 inline" />
              Add questions
            </button>
            <button
              type="button"
              onClick={openAutoMakerModal}
              disabled={!hasActiveExamWorkspace}
              className="rounded border border-orange-500 bg-white px-2 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size={14} className="mr-1 inline" />
              Auto QuestionPaper maker
            </button>
            <button
              type="button"
              onClick={() => setIsPaperSetupOpen(true)}
              disabled={!hasActiveExamWorkspace}
              className="rounded border border-violet-500 bg-white px-2 py-1.5 text-xs font-semibold text-violet-600 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ClipboardList size={14} className="mr-1 inline" />
              Paper setup
            </button>
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              disabled={!hasActiveExamWorkspace}
              className="rounded border border-teal-500 bg-white px-2 py-1.5 text-xs font-semibold text-teal-600 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Eye size={14} className="mr-1 inline" />
              Preview
            </button>
            <button
              type="button"
              onClick={onPrint}
              disabled={!hasActiveExamWorkspace}
              className="rounded border border-fuchsia-500 bg-white px-2 py-1.5 text-xs font-semibold text-fuchsia-600 hover:bg-fuchsia-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer size={14} className="mr-1 inline" />
              Print
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="print-hidden mx-auto mb-2 max-w-[1900px] px-3">
          <div className="flex items-center justify-between rounded border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs text-rose-800">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="ml-2 text-rose-600 hover:text-rose-800"
              aria-label="Dismiss error"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : null}

      <main className="print-hidden mx-auto grid max-h-[calc(100vh-5.25rem)] max-w-[1900px] min-h-0 grid-cols-1 gap-3 px-3 pb-3 lg:grid-cols-2">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="shrink-0 border-b border-slate-100 px-3 py-2 text-xs font-medium text-slate-600">Live paper</div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 p-2">
            {renderPaperDocument({ includeSectionEditors: true })}
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
            <p className="text-xs font-medium text-slate-600">
              Selected ({selectedWithDetails.length}) — marks required (≥1)
            </p>
            <button
              type="button"
              onClick={openCatalogModal}
              disabled={!hasActiveExamWorkspace}
              className="inline-flex items-center gap-1 rounded border border-indigo-500 bg-white px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={12} />
              Add questions
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {selectedWithDetails.length === 0 ? (
              <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 px-4 text-center">
                <p className="text-xs text-slate-500">No questions on this paper yet.</p>
                <button
                  type="button"
                  onClick={openCatalogModal}
                  disabled={!hasActiveExamWorkspace}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus size={14} />
                  Browse catalog
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedWithDetails.map((item) => (
                  <div
                    key={item.questionId}
                    className="flex flex-wrap items-end gap-2 rounded border border-slate-200 bg-slate-50/80 p-2"
                  >
                    <label className="text-[11px]">
                      <span className="block text-slate-500">Order</span>
                      <input
                        type="number"
                        min={1}
                        value={item.questionOrder}
                        onChange={(e) =>
                          updateSelectedQuestion(item.questionId, 'questionOrder', e.target.value)
                        }
                        className="w-14 rounded border border-slate-200 px-1 py-0.5 text-xs"
                      />
                    </label>
                    <label className="text-[11px]">
                      <span className="block text-slate-500">Section</span>
                      <select
                        value={item.section}
                        onChange={(e) => updateSelectedQuestion(item.questionId, 'section', e.target.value)}
                        className="rounded border border-slate-200 px-1 py-0.5 text-xs"
                      >
                        {sectionOptions.map((section) => (
                          <option key={section.value} value={section.value}>
                            {section.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[11px]">
                      <span className="block text-slate-500">Marks *</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        required
                        value={item.marks}
                        onChange={(e) =>
                          updateSelectedQuestion(
                            item.questionId,
                            'marks',
                            Math.max(1, Math.min(100, Number(e.target.value) || 1)),
                          )
                        }
                        className="w-16 rounded border border-slate-200 px-1 py-0.5 text-xs"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeSelectedQuestion(item.questionId)}
                      className="ml-auto rounded border border-rose-200 p-1 text-rose-600 hover:bg-rose-50"
                      aria-label="Remove question"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="w-full truncate text-[11px] text-slate-600">
                      <MathText value={item.question?.descriptionText || ''} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Paper setup modal */}
      <div
        role="presentation"
        className={`print-hidden fixed inset-0 z-[92] flex items-center justify-center p-4 transition-all duration-300 ${
          isPaperSetupOpen
            ? 'pointer-events-auto bg-slate-900/40 opacity-100 backdrop-blur-sm'
            : 'pointer-events-none bg-slate-900/0 opacity-0 backdrop-blur-0'
        }`}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="minimal-paper-setup-title"
          className={`max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-xl transition ${
            isPaperSetupOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 id="minimal-paper-setup-title" className="text-sm font-semibold">
              Paper setup
            </h2>
            <button
              type="button"
              onClick={() => setIsPaperSetupOpen(false)}
              className="rounded p-1 text-slate-500 hover:bg-slate-100"
              aria-label="Close paper setup"
            >
              <X size={18} />
            </button>
          </div>
          <div className="max-h-[calc(90vh-3.5rem)] overflow-y-auto p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block text-xs">
                <span className="mb-1 block text-slate-600">Class</span>
                <Select
                  options={classOptions}
                  value={selectedClass}
                  onChange={(option) => setForm((p) => ({ ...p, classId: option?.value ? String(option.value) : '' }))}
                  placeholder="Choose class"
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block text-slate-600">Subject</span>
                <Select
                  options={subjectOptions}
                  value={selectedSubject}
                  onChange={(option) => setForm((p) => ({ ...p, subjectId: option?.value ? String(option.value) : '' }))}
                  placeholder="Choose subject"
                />
              </label>
              <label className="block text-xs" htmlFor="minimal-paper-setup-exam-type">
                <span className="mb-1 block text-slate-600">Exam type</span>
                <select
                  id="minimal-paper-setup-exam-type"
                  value={form.examType}
                  onChange={(e) => {
                    const examType = e.target.value
                    setForm((previous) => ({
                      ...previous,
                      examType,
                      headerNote:
                        isSubjectiveExamType(examType) && isDefaultObjectiveHeaderNote(previous.headerNote)
                          ? ''
                          : previous.headerNote,
                    }))
                  }}
                  className="w-full rounded border border-slate-200 bg-white px-2 py-2 text-sm"
                >
                  <option value={EXAM_TYPE.OBJECTIVE}>{formatExamTypeDisplay(EXAM_TYPE.OBJECTIVE)}</option>
                  <option value={EXAM_TYPE.SUBJECTIVE}>{formatExamTypeDisplay(EXAM_TYPE.SUBJECTIVE)}</option>
                </select>
              </label>
              <label className="block text-xs">
                <span className="mb-1 block text-slate-600">Exam title</span>
                <Select
                  options={examTitleOptions}
                  value={selectedExamTitle}
                  onChange={(option) => setForm((p) => ({ ...p, examTitleId: option?.value ? String(option.value) : '' }))}
                  placeholder={examTitles.length ? 'Choose exam title' : 'No titles'}
                  isDisabled={!examTitles.length}
                />
              </label>
              <label className="block text-xs sm:col-span-2 lg:col-span-2">
                <span className="mb-1 block text-slate-600">Paper name</span>
                <input
                  value={form.paperName}
                  onChange={(e) => setForm((p) => ({ ...p, paperName: e.target.value }))}
                  placeholder="e.g. Set A, Version 1"
                  maxLength={200}
                  className="w-full rounded border border-slate-200 px-2 py-2 text-sm"
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block text-slate-600">Duration (minutes)</span>
                <input
                  type="number"
                  min={1}
                  value={form.durationMinutes}
                  onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value }))}
                  className="w-full rounded border border-slate-200 px-2 py-2 text-sm"
                />
              </label>
            </div>
            <label className="mt-4 block text-xs">
              <span className="mb-1 block text-slate-600">Header note</span>
              <textarea
                value={form.headerNote}
                onChange={(e) => setForm((p) => ({ ...p, headerNote: e.target.value }))}
                rows={4}
                className="w-full rounded border border-slate-200 px-2 py-2 text-sm"
              />
            </label>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(form.showSectionNames)}
                onChange={(e) => setForm((p) => ({ ...p, showSectionNames: e.target.checked }))}
              />
              Show section names in paper
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="mb-1 block text-slate-600">Sub-question numbering</span>
                <select
                  value={form.subQuestionNumberingStyle}
                  onChange={(e) => setForm((p) => ({ ...p, subQuestionNumberingStyle: e.target.value }))}
                  className="w-full rounded border border-slate-200 px-2 py-2 text-sm"
                >
                  <option value="roman">Roman (i, ii…)</option>
                  <option value="numeric">Numbers (1, 2…)</option>
                  <option value="alpha">Letters (a, b…)</option>
                </select>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm sm:mt-5">
                <input
                  type="checkbox"
                  checked={Boolean(form.wrapQuestionMarksInParentheses)}
                  onChange={(e) => setForm((p) => ({ ...p, wrapQuestionMarksInParentheses: e.target.checked }))}
                />
                Wrap marks in ( )
              </label>
            </div>
            {suppressPaperPreload ? (
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => resetExamWorkspace({ openPaperSetupModal: false, enablePreloadSuppression: false })}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!normalizePaperName(form.paperName)) {
                      setError('Enter a paper name before continuing (e.g. Set A).')
                      return
                    }
                    setError('')
                    setSuppressPaperPreload(false)
                    setIsPaperSetupOpen(false)
                  }}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Apply setup &amp; continue
                </button>
                <p className="w-full text-right text-[11px] text-slate-500">
                  Choose class, subject, exam title, paper name, and objective vs subjective, then continue. Saved
                  papers are not loaded until you apply (avoids loading the wrong version or exam type).
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Question catalog modal */}
      <div
        role="presentation"
        className={`print-hidden fixed inset-0 z-[93] flex items-center justify-center p-4 transition-all duration-300 ${
          isCatalogModalOpen
            ? 'pointer-events-auto bg-slate-900/40 opacity-100 backdrop-blur-sm'
            : 'pointer-events-none bg-slate-900/0 opacity-0 backdrop-blur-0'
        }`}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="minimal-catalog-title"
          className={`flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl transition ${
            isCatalogModalOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="min-w-0">
              <h2 id="minimal-catalog-title" className="text-sm font-semibold">
                Question catalog
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Choose a chapter, then click a row to add. Search filters within that chapter.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCatalogModalOpen(false)}
              className="rounded p-1 text-slate-500 hover:bg-slate-100"
              aria-label="Close catalog"
            >
              <X size={18} />
            </button>
          </div>

          <div className="shrink-0 border-b border-slate-100 px-4 py-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-[12rem] flex-1 text-xs">
                <span className="mb-1 block text-slate-600">Chapter</span>
                <select
                  value={catalogChapterId}
                  onChange={(e) => setCatalogChapterId(e.target.value)}
                  disabled={isChaptersLoading || !catalogChapterOptions.length}
                  className="w-full rounded border border-slate-200 bg-white px-2 py-2 text-sm disabled:bg-slate-50"
                >
                  <option value="">
                    {isChaptersLoading
                      ? 'Loading chapters…'
                      : catalogChapterOptions.length
                        ? 'Select chapter'
                        : 'No chapters for this class & subject'}
                  </option>
                  {catalogChapterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <select
                value={poolFilters.category}
                onChange={(e) => setPoolFilters((p) => ({ ...p, category: e.target.value }))}
                className="rounded border border-slate-200 px-2 py-2 text-xs"
                aria-label="Category filter"
              >
                <option value="all">All categories</option>
                <option value="exercise">Exercise</option>
                <option value="text">Text</option>
                <option value="board">Board</option>
              </select>
              {catalogTypesForCurrentExam.length > 1 ? (
                <div className="flex items-center gap-2 py-2 text-xs">
                  {CATALOG_TYPE_OPTIONS.filter((type) => catalogTypesForCurrentExam.includes(type.value)).map(
                    (type) => (
                      <label key={type.value} className="inline-flex cursor-pointer items-center gap-1">
                        <input
                          type="radio"
                          name="minimal-catalog-type-modal"
                          value={type.value}
                          checked={poolFilters.type === type.value}
                          onChange={(e) => setPoolFilters((p) => ({ ...p, type: e.target.value }))}
                        />
                        {type.label}
                      </label>
                    ),
                  )}
                </div>
              ) : (
                <span className="py-2 text-xs font-medium uppercase text-slate-600">
                  {CATALOG_TYPE_OPTIONS.find((type) => type.value === catalogTypesForCurrentExam[0])?.label ||
                    'MCQ'}
                </span>
              )}
              <div className="relative min-w-[10rem] flex-1">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={poolFilters.search}
                  onChange={(e) => setPoolFilters((p) => ({ ...p, search: e.target.value }))}
                  placeholder="Search in chapter…"
                  disabled={!catalogChapterId}
                  className="w-full rounded border border-slate-200 py-2 pl-8 pr-8 text-sm disabled:bg-slate-50"
                />
                {isPoolLoading ? (
                  <Loader2
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                  />
                ) : null}
              </div>
            </div>
            {selectedClass && selectedSubject ? (
              <p className="mt-2 text-[11px] text-slate-500">
                {selectedClass.label} · {selectedSubject.label}
                {catalogChapterId && poolScoped.length > 0 ? (
                  <span className="text-slate-400">
                    {' '}
                    · showing {poolScoped.length}
                    {poolScoped.length >= 120 ? '+' : ''} question{poolScoped.length === 1 ? '' : 's'}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-2">
            <div className="overflow-hidden rounded border border-slate-200">
              <table className="exam-maker-catalog-table w-full text-xs">
                <thead className="sticky top-0 z-[1] bg-slate-100">
                  <tr>
                    <th className="border px-2 py-1 text-left">Type</th>
                    <th className="border px-2 py-1 text-left">Cat</th>
                    <th className="border px-2 py-1 text-left">Question</th>
                  </tr>
                </thead>
                <tbody>
                  {poolScoped.map((q) => (
                    <tr
                      key={q.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => addQuestionFromCatalog(q)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          addQuestionFromCatalog(q)
                        }
                      }}
                      className={`cursor-pointer align-top hover:bg-indigo-50/60 ${selectedQuestionIds.has(q.id) ? 'bg-emerald-50/80' : ''}`}
                    >
                      <td className="border border-slate-200 px-2 py-1 uppercase">{q.type}</td>
                      <td className="border border-slate-200 px-2 py-1 uppercase">{q.category}</td>
                      <td className="border border-slate-200 px-2 py-1 leading-snug">
                        <MathText value={q.descriptionText} />
                        {selectedQuestionIds.has(q.id) ? (
                          <span className="mt-1 block text-[10px] font-medium text-emerald-700">
                            Already on paper
                          </span>
                        ) : (
                          <span className="mt-1 block text-[10px] text-slate-400">Click to add</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!catalogChapterId ? (
                <p className="px-2 py-8 text-center text-sm text-slate-500">Select a chapter to browse questions.</p>
              ) : isPoolLoading ? (
                <p className="flex items-center justify-center gap-2 px-2 py-8 text-sm text-slate-500">
                  <Loader2 size={16} className="animate-spin" />
                  Loading questions…
                </p>
              ) : poolScoped.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-slate-500">
                  {debouncedPoolSearch ? 'No matches in this chapter.' : 'No questions in this chapter.'}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 justify-end border-t border-slate-200 px-4 py-3">
            <button
              type="button"
              onClick={() => setIsCatalogModalOpen(false)}
              className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Auto question paper maker */}
      <div
        role="presentation"
        className={`print-hidden fixed inset-0 z-[94] flex items-center justify-center p-4 transition-all duration-300 ${
          isAutoMakerOpen
            ? 'pointer-events-auto bg-slate-900/40 opacity-100 backdrop-blur-sm'
            : 'pointer-events-none bg-slate-900/0 opacity-0 backdrop-blur-0'
        }`}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="minimal-auto-maker-title"
          className={`flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl transition ${
            isAutoMakerOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div className="min-w-0">
              <h2 id="minimal-auto-maker-title" className="text-sm font-semibold">
                Auto QuestionPaper maker
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Enter how many questions to take from each chapter. The paper saves and reloads automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!isRandomizingPaper) setIsAutoMakerOpen(false)
              }}
              className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              disabled={isRandomizingPaper}
              aria-label="Close auto question paper maker"
            >
              <X size={18} />
            </button>
          </div>

          <div className="shrink-0 border-b border-slate-100 px-4 py-3 text-xs text-slate-600">
            {selectedClass && selectedSubject ? (
              <p>
                {selectedClass.label} · {selectedSubject.label} · {formatExamTypeDisplay(form.examType)}
                {autoPlanTotal > 0 ? (
                  <span className="ml-2 rounded bg-orange-100 px-2 py-0.5 font-semibold text-orange-700">
                    {autoPlanTotal} question{autoPlanTotal === 1 ? '' : 's'}
                  </span>
                ) : null}
              </p>
            ) : (
              <p>Select class and subject in Paper setup first.</p>
            )}
          </div>

          {(autoMakerAlert || isAutoAvailabilityLoading) ? (
            <div className="shrink-0 px-4 pt-3">
              {isAutoAvailabilityLoading ? (
                <div className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <Loader2 size={16} className="animate-spin" />
                  Checking available questions by chapter...
                </div>
              ) : autoMakerAlert ? (
                <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {autoMakerAlert}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {isChaptersLoading ? (
              <p className="flex items-center justify-center gap-2 rounded border border-slate-200 px-3 py-8 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                Loading chapters...
              </p>
            ) : chapters.length === 0 ? (
              <p className="rounded border border-amber-200 bg-amber-50 px-3 py-8 text-center text-sm text-amber-800">
                No chapters found for this class and subject.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {chapters.map((chapter) => {
                  const plan = autoChapterPlan[chapter.id] || {}
                  const available = autoQuestionAvailability[chapter.id] || {}
                  const hasIssue = autoAvailabilityIssues.some((issue) => issue.chapterId === chapter.id)
                  const visibleAvailableTotal = autoQuestionTypes.reduce(
                    (sum, type) => sum + Number(available[`${type}Count`] || 0),
                    0,
                  )
                  const hasNoAvailableQuestions = !isAutoAvailabilityLoading && visibleAvailableTotal === 0
                  return (
                    <div
                      key={chapter.id}
                      className={`rounded-lg border p-3 ${
                        hasNoAvailableQuestions
                          ? 'border-rose-200 bg-rose-50/70'
                          : hasIssue
                            ? 'border-amber-300 bg-slate-50 ring-1 ring-amber-200'
                            : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="mb-3 min-w-0">
                        <p className={`truncate text-sm font-semibold ${hasNoAvailableQuestions ? 'text-rose-900' : 'text-slate-800'}`}>
                          Chapter {chapter.chapterNo}
                        </p>
                        <p className={`line-clamp-2 text-xs ${hasNoAvailableQuestions ? 'text-rose-700' : 'text-slate-500'}`}>
                          {chapter.chapterName}
                        </p>
                        {hasNoAvailableQuestions ? (
                          <p className="mt-1 text-[11px] font-medium text-rose-700">
                            No available questions for this paper type.
                          </p>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {autoQuestionTypes.includes(QUESTION_TYPE.MCQ) ? (
                          <label className="block text-xs">
                            <span className="mb-1 flex items-center justify-between gap-2 font-medium text-slate-600">
                              <span>MCQ count</span>
                              <span className="font-normal text-slate-400">
                                Available: {Number(available.mcqCount || 0)}
                              </span>
                            </span>
                            <input
                              type="number"
                              min={0}
                              max={Number(available.mcqCount || 0)}
                              value={plan.mcqCount ?? ''}
                              onChange={(e) => updateAutoChapterCount(chapter.id, 'mcqCount', e.target.value)}
                              placeholder="0"
                              disabled={isAutoAvailabilityLoading || isRandomizingPaper || hasNoAvailableQuestions}
                              className="w-full rounded border border-slate-200 bg-white px-2 py-2 text-sm disabled:bg-slate-100"
                            />
                          </label>
                        ) : null}
                        {autoQuestionTypes.includes(QUESTION_TYPE.SAQ) ? (
                          <label className="block text-xs">
                            <span className="mb-1 flex items-center justify-between gap-2 font-medium text-slate-600">
                              <span>SAQ count</span>
                              <span className="font-normal text-slate-400">
                                Available: {Number(available.saqCount || 0)}
                              </span>
                            </span>
                            <input
                              type="number"
                              min={0}
                              max={Number(available.saqCount || 0)}
                              value={plan.saqCount ?? ''}
                              onChange={(e) => updateAutoChapterCount(chapter.id, 'saqCount', e.target.value)}
                              placeholder="0"
                              disabled={isAutoAvailabilityLoading || isRandomizingPaper || hasNoAvailableQuestions}
                              className="w-full rounded border border-slate-200 bg-white px-2 py-2 text-sm disabled:bg-slate-100"
                            />
                          </label>
                        ) : null}
                        {autoQuestionTypes.includes(QUESTION_TYPE.LAQ) ? (
                          <label className="block text-xs">
                            <span className="mb-1 flex items-center justify-between gap-2 font-medium text-slate-600">
                              <span>LAQ count</span>
                              <span className="font-normal text-slate-400">
                                Available: {Number(available.laqCount || 0)}
                              </span>
                            </span>
                            <input
                              type="number"
                              min={0}
                              max={Number(available.laqCount || 0)}
                              value={plan.laqCount ?? ''}
                              onChange={(e) => updateAutoChapterCount(chapter.id, 'laqCount', e.target.value)}
                              placeholder="0"
                              disabled={isAutoAvailabilityLoading || isRandomizingPaper || hasNoAvailableQuestions}
                              className="w-full rounded border border-slate-200 bg-white px-2 py-2 text-sm disabled:bg-slate-100"
                            />
                          </label>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3">
            <button
              type="button"
              onClick={clearAutoChapterPlan}
              disabled={isRandomizingPaper || autoPlanTotal === 0}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Clear counts
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAutoMakerOpen(false)}
                disabled={isRandomizingPaper}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={randomizePaperFromChapters}
                disabled={
                  isRandomizingPaper ||
                  autoPlanTotal === 0 ||
                  isChaptersLoading ||
                  isAutoAvailabilityLoading ||
                  autoAvailabilityIssues.length > 0
                }
                className="inline-flex items-center rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {isRandomizingPaper ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <Sparkles size={16} className="mr-2" />
                )}
                Make randomized paper
              </button>
            </div>
          </div>
        </div>
      </div>

      {isAutoWarningOpen ? (
        <div
          role="presentation"
          className="print-hidden fixed inset-0 z-[98] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
        >
          <div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-xl border border-amber-200 bg-white shadow-xl">
            <div className="border-b border-amber-100 bg-amber-50 px-4 py-3">
              <h3 className="text-sm font-semibold text-amber-900">Randomizing will erase current questions</h3>
              <p className="mt-1 text-xs text-amber-800">
                This paper already has {selectedQuestions.length} question{selectedQuestions.length === 1 ? '' : 's'}.
                Continuing will replace them with a new randomized selection.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3">
              <button
                type="button"
                onClick={() => setIsAutoWarningOpen(false)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Keep current paper
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAutoWarningOpen(false)
                  setAutoMakerAlert('')
                  setIsAutoMakerOpen(true)
                }}
                className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                Continue to randomize
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Generated papers */}
      <div
        role="presentation"
        className={`print-hidden fixed inset-0 z-[91] flex items-center justify-center p-4 transition-all duration-300 ${
          isGeneratedPapersOpen
            ? 'pointer-events-auto bg-slate-900/40 opacity-100 backdrop-blur-sm'
            : 'pointer-events-none bg-slate-900/0 opacity-0 backdrop-blur-0'
        }`}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="minimal-generated-papers-title"
          className={`flex max-h-[92vh] w-full max-w-6xl flex-col rounded-xl bg-white shadow-xl transition ${
            isGeneratedPapersOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="min-w-0">
              <h3 id="minimal-generated-papers-title" className="text-sm font-semibold">
                Generated papers
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">Pick a saved paper to edit, or create a new exam.</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onCreateNewExam}
                className="inline-flex items-center rounded border border-sky-500 bg-white px-2.5 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50"
              >
                <FilePlus size={14} className="mr-1" />
                New Exam
              </button>
              <button type="button" onClick={closeGeneratedPapersModal} className="rounded p-1 text-slate-500 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="border-b border-slate-200 px-4 pb-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" strokeWidth={2} />
              <input
                type="search"
                value={generatedPapersSearch}
                onChange={(e) => setGeneratedPapersSearch(e.target.value)}
                placeholder="Search name, class, subject, Obj, Subj…"
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden p-4">
            {generatedPapers.length === 0 ? (
              <p className="text-sm text-slate-500">
                No papers yet. Use <span className="font-medium text-sky-600">New Exam</span> above to create one.
              </p>
            ) : filteredGeneratedPapers.length === 0 ? (
              <p className="text-sm text-slate-500">No papers match your search.</p>
            ) : (
              <div className="grid h-full min-h-[min(60vh,520px)] grid-cols-1 gap-4 md:grid-cols-2">
                {groupedGeneratedPapers.map((examSection) => {
                  const paperCount = examSection.subjects.reduce((sum, g) => sum + g.papers.length, 0)
                  const isObjectiveColumn = examSection.examType === EXAM_TYPE.OBJECTIVE
                  return (
                    <section
                      key={examSection.examType}
                      className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white"
                    >
                      <h4
                        className={`shrink-0 rounded-t-lg border-b px-3 py-2.5 text-xs font-bold uppercase tracking-wide ${
                          isObjectiveColumn
                            ? 'border-sky-200/80 bg-sky-50 text-sky-900'
                            : 'border-violet-200/80 bg-violet-50 text-violet-900'
                        }`}
                      >
                        {examSection.label}
                        <span
                          className={`ml-2 font-normal normal-case ${
                            isObjectiveColumn ? 'text-sky-700/80' : 'text-violet-700/80'
                          }`}
                        >
                          ({paperCount})
                        </span>
                      </h4>
                      <div className="min-h-0 flex-1 overflow-y-auto p-3">
                        {examSection.subjects.length === 0 ? (
                          <p className="py-6 text-center text-xs text-slate-500">
                            No {examSection.label.toLowerCase()} papers
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {examSection.subjects.map((subjectGroup) => (
                              <div key={`${examSection.examType}-${subjectGroup.subjectName}`}>
                                <p className="mb-2 text-sm font-semibold text-slate-800">{subjectGroup.subjectName}</p>
                                <div className="space-y-2">
                                  {subjectGroup.papers.map((paper) => (
                                    <div
                                      key={paper.id}
                                      className={`flex items-stretch gap-1 rounded border bg-white ${
                                        selectedPaper?.id === paper.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          requestOpenPaper(paper.id)
                                          if (!isWorkspaceDirty) closeGeneratedPapersModal()
                                        }}
                                        className="min-w-0 flex-1 rounded-l px-3 py-2 text-left text-sm hover:bg-slate-50/80"
                                      >
                                        <p className="font-medium leading-snug">
                                          {formatPaperNameForDisplay(paper.paperName)}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                          {paper.className} · {paper.examTitle || '—'} · {paper.totalMarks ?? 0} marks
                                        </p>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => onRequestDeletePaper(paper, e)}
                                        disabled={Boolean(deletingPaperId) || Boolean(paperPendingDelete)}
                                        className="shrink-0 rounded-r border-l border-slate-200 px-2.5 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        aria-label={`Delete ${formatPaperNameForDisplay(paper.paperName)}`}
                                        title="Delete permanently"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </section>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unsaved changes */}
      {pendingDestructiveAction ? (
        <div
          role="presentation"
          className="print-hidden fixed inset-0 z-[97] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="unsaved-exam-changes-title"
            aria-describedby="unsaved-exam-changes-desc"
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl ring-1 ring-slate-200"
          >
            <h3 id="unsaved-exam-changes-title" className="text-base font-semibold text-slate-900">
              Unsaved exam changes
            </h3>
            <p id="unsaved-exam-changes-desc" className="mt-2 text-sm text-slate-600">
              You have changes that are not saved. Save your exam before leaving, or your edits will be lost.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancelUnsavedLeave}
                disabled={isSavingBeforeLeave}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Stay on page
              </button>
              <button
                type="button"
                onClick={onConfirmLeaveWithoutSaving}
                disabled={isSavingBeforeLeave}
                className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Leave without saving
              </button>
              <button
                type="button"
                onClick={() => void onSaveBeforeLeave()}
                disabled={isSavingBeforeLeave || isGeneratingFromSelection}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingBeforeLeave || isGeneratingFromSelection ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save exam'
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete paper confirmation */}
      {paperPendingDelete ? (
        <div
          role="presentation"
          className="print-hidden fixed inset-0 z-[96] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-paper-confirm-title"
            aria-describedby="delete-paper-confirm-desc"
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl ring-1 ring-slate-200"
          >
            <h3 id="delete-paper-confirm-title" className="text-base font-semibold text-slate-900">
              Delete exam paper?
            </h3>
            <p id="delete-paper-confirm-desc" className="mt-2 text-sm text-slate-600">
              <span className="font-medium text-slate-800">
                {formatPaperNameForDisplay(paperPendingDelete.paperName)}
              </span>{' '}
              will be removed permanently, including all linked questions. This cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancelDeletePaper}
                disabled={Boolean(deletingPaperId)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onConfirmDeletePaper()}
                disabled={Boolean(deletingPaperId)}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-600 bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingPaperId ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting…
                  </>
                ) : (
                  'Delete permanently'
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Preview modal */}
      <div
        role="presentation"
        className={`print-hidden fixed inset-0 z-[90] flex items-center justify-center p-4 transition-all duration-300 ${
          isPreviewOpen
            ? 'pointer-events-auto bg-slate-900/40 opacity-100 backdrop-blur-sm'
            : 'pointer-events-none bg-slate-900/0 opacity-0 backdrop-blur-0'
        }`}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="minimal-preview-title"
          className={`flex max-h-[90vh] w-full min-w-0 max-w-[1100px] flex-col rounded-xl bg-white shadow-xl transition ${
            isPreviewOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
            <h3 id="minimal-preview-title" className="flex items-center gap-2 text-sm font-semibold">
              <Eye size={16} /> Live preview
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPrint}
                className="rounded border border-fuchsia-500 bg-white px-2 py-1.5 text-xs font-semibold text-fuchsia-600 hover:bg-fuchsia-50"
              >
                <Printer size={14} className="mr-1 inline" />
                Print
              </button>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Close preview"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-slate-50 p-3">
            {renderPaperDocument({ includeSectionEditors: false })}
          </div>
        </div>
      </div>

      <div id="exam-paper-print" className="print-paper-host">
        {renderPaperDocument({ includeSectionEditors: false })}
      </div>
      <PopupLoader open={Boolean(popupLoaderText)} text={popupLoaderText} />
    </div>
  )
}

export default AcademicExamMakerMinimalPage
