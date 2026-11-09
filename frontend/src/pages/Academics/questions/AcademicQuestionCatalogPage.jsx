import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Eye, FileQuestion, Loader2, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import 'katex/contrib/mhchem'
import Select from 'react-select'
import AcademicFormulaInsertToolbar from '../../../components/academics/AcademicFormulaInsertToolbar'
import AcademicLayout from '../../../components/academics/AcademicLayout'
import AcademicQuestionMathField from '../../../components/academics/AcademicQuestionMathField'
import QuestionStemImage from '../../../components/academics/QuestionStemImage.jsx'
import { compressStemImageFile } from '../../../components/academics/stemImageUtils.js'
import {
  convertSimpleFractionsToLatex,
  looksLikeChemistryText,
  looksLikeScientificProseText,
  normalizeChemistryNotation,
  normalizePastedChemistryText,
  normalizePastedScientificProseText,
  normalizeLatexEscapes,
  stripLatexDelimitersForKatex,
} from '../../../components/academics/academicQuestionLatexUtils'
import {
  deleteQuestionCatalog,
  getAcademicChapters,
  getAcademicClasses,
  getAcademicSubjects,
  getQuestionCatalog,
  upsertQuestionCatalog,
} from '../../../services/academicCatalogService'
import LanguageQuestionFields from './LanguageQuestionFields'
import LanguageQuestionPreview from './LanguageQuestionPreview'
import {
  applyBodyKey,
  applyTextKey,
  coarseTypeForKind,
  emptyBody,
  headingForKind,
  isLanguageProfile,
  isLineBodyKind,
  kindsForProfile,
  languageKindGroups,
  parseBody,
  structureLabel,
  summarizeBody,
  validateLanguageBody,
} from './languageQuestionStructures'

const emptyForm = {
  id: '',
  type: 'mcq',
  category: 'board',
  chapterId: '',
  descriptionText: '',
  stemImage: '',
  mcqOpt1: '',
  mcqOpt2: '',
  mcqOpt3: '',
  mcqOpt4: '',
}

const questionTypeFilterOptions = [
  { value: '', label: 'All' },
  { value: 'mcq', label: 'MCQ' },
  { value: 'saq', label: 'SAQ' },
  { value: 'laq', label: 'LAQ' },
  { value: 'numerical', label: 'Numerical' },
]

const urduFontFamily =
  '"Jameel Noori Nastaleeq Web", "Jameel Noori Nastaleeq", "Jameel Noori Nastaleeq Regular", "Jameel Noori Nastaleeq Kasheeda", "Jameel Noori", "Noto Nastaliq Urdu", "Noto Naskh Arabic", serif'

const urduKeyboardRows = [
  ['ق', 'و', 'ع', 'ر', 'ت', 'ے', 'ء', 'ی', 'ہ', 'پ'],
  ['ا', 'س', 'د', 'ف', 'گ', 'ھ', 'ج', 'ک', 'ل'],
  ['ز', 'ش', 'چ', 'ط', 'ب', 'ن', 'م', '،', '۔'],
  ['َ', 'ِ', 'ُ', 'ّ', 'ْ', 'ں', 'ئ', 'آ', 'ؤ'],
]

const englishOptionLabels = ['A', 'B', 'C', 'D']
const urduOptionLabels = ['الف', 'ب', 'ج', 'د']

const containsUrduText = (value) => /[\u0600-\u06ff]/.test(value || '')

const getMcqOptionLabel = (index, useUrduLabels = false) =>
  (useUrduLabels ? urduOptionLabels : englishOptionLabels)[index] || englishOptionLabels[index] || ''

const getUrduTextStyle = (value, forceUrdu = false) =>
  forceUrdu || containsUrduText(value)
    ? {
        direction: 'rtl',
        fontFamily: urduFontFamily,
        fontSize: '0.78rem',
        lineHeight: 1.4,
      }
    : undefined

const urduListStyle = (value) => {
  const style = getUrduTextStyle(value)
  return style ? { ...style, fontSize: '1.05rem', lineHeight: 1.9 } : undefined
}

const latexSymbolMap = new Map([
  ['×', '\\times'],
  ['÷', '\\div'],
  ['∅', '\\varnothing'],
  ['∈', '\\in'],
  ['∉', '\\notin'],
  ['⊂', '\\subset'],
  ['⊆', '\\subseteq'],
  ['⊃', '\\supset'],
  ['⊇', '\\supseteq'],
  ['∪', '\\cup'],
  ['∩', '\\cap'],
  ['∧', '\\wedge'],
  ['∨', '\\vee'],
  ['∀', '\\forall'],
  ['∃', '\\exists'],
  ['⇒', '\\Rightarrow'],
  ['⇔', '\\Leftrightarrow'],
  ['→', '\\to'],
  ['π', '\\pi'],
  ['θ', '\\theta'],
  ['α', '\\alpha'],
  ['β', '\\beta'],
  ['γ', '\\gamma'],
  ['λ', '\\lambda'],
  ['μ', '\\mu'],
  ['Δ', '\\Delta'],
  ['ℝ', '\\mathbb{R}'],
  ['ℤ', '\\mathbb{Z}'],
  ['ℚ', '\\mathbb{Q}'],
  ['ℕ', '\\mathbb{N}'],
  ['≤', '\\leq'],
  ['≥', '\\geq'],
  ['≠', '\\neq'],
  ['±', '\\pm'],
  ['∞', '\\infty'],
])

const looksLikeLatex = (value) => /\\[a-zA-Z]+|(\^|_)\{?|\\frac|\\sqrt|\\theta|\\pi|\\ce\{/.test(value)

const fieldNeedsFormulaEditor = (value) => {
  const normalized = stripLatexDelimitersForKatex(normalizeLatexEscapes(value || ''))
  return looksLikeLatex(normalized) || looksLikeChemistryText(normalized) || looksLikeScientificProseText(normalized)
}

const hasBalancedBraces = (value) => {
  let depth = 0
  for (const ch of value) {
    if (ch === '{') depth += 1
    if (ch === '}') depth -= 1
    if (depth < 0) return false
  }
  return depth === 0
}

const convertTextToLatex = (value) => {
  let normalized = `${value || ''}`.normalize('NFKC').trim()
  // Already formula-editor TeX — do not re-wrap (chemistry false positives like HCF).
  if (/\\[a-zA-Z]+/.test(normalized)) {
    return stripLatexDelimitersForKatex(normalizeLatexEscapes(normalized))
  }
  if (looksLikeChemistryText(normalized)) {
    return normalizePastedChemistryText(normalized)
  }
  if (looksLikeScientificProseText(normalized)) {
    return normalizePastedScientificProseText(normalized)
  }
  // Remove combining decorations from copy/paste (e.g. ∅̲)
  normalized = normalized.replace(/[\u0300-\u036f]/g, '')

  for (const [symbol, latex] of latexSymbolMap.entries()) {
    normalized = normalized.replaceAll(symbol, latex)
  }

  // Handle stacked logarithm notation typed across lines:
  // log
  // a
  // x
  // -> \log_{a} x
  normalized = normalized.replace(
    /\blog\s*\n+\s*([a-zA-Z0-9+-]+)\s*\n+\s*([a-zA-Z0-9(\\]+)/gi,
    '\\log_{$1} $2',
  )

  // Logarithm normalization.
  // Examples:
  // - log10 x  -> \log_{10} x
  // - log₂x    -> \log_{2}x
  // - log_2(x) -> \log_{2}(x)
  // - ln x     -> \ln x
  normalized = normalized.replace(/log([₀₁₂₃₄₅₆₇₈₉]+)/gi, (_, subscriptChars) => {
    const digits = subscriptChars
      .split('')
      .map((ch) => ({ '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' }[ch] || ch))
      .join('')
    return `\\log_{${digits}}`
  })
  normalized = normalized.replace(/\blog\s*[_^]\s*\{?\s*([0-9a-zA-Z+-]+)\s*\}?/gi, '\\log_{$1}')
  normalized = normalized.replace(/\blog\s*([0-9]{1,2})(?=\s*[a-zA-Z(\\])/gi, '\\log_{$1}')

  normalized = normalized.replace(
    /(^|[^\\])\b(sin|cos|tan|cot|sec|csc|log|ln|lim|max|min)\b/gi,
    '$1\\$2',
  )

  // Convert basic square-root token: √x -> \sqrt{x}
  normalized = normalized.replace(/√\s*([a-zA-Z0-9]+)/g, '\\sqrt{$1}')
  normalized = normalized.replace(/sqrt\(([^)]+)\)/gi, '\\sqrt{$1}')
  normalized = normalized.replace(/([a-zA-Z0-9)\]}])\s*°/g, '$1^{\\circ}')

  // Normalize single-char powers/subscripts into braced form.
  normalized = normalized.replace(/([a-zA-Z0-9)\]}])\^([a-zA-Z0-9])/g, '$1^{$2}')
  normalized = normalized.replace(/([a-zA-Z0-9)\]}])_([a-zA-Z0-9])/g, '$1_{$2}')

  // Normalize escaped slash sequences from storage.
  normalized = normalizeChemistryNotation(normalized)
  normalized = normalizeLatexEscapes(normalized)
  normalized = convertSimpleFractionsToLatex(normalized)
  return normalized
}

/**
 * Persist field text for the catalog. MathLive already emits KaTeX-ready TeX —
 * re-running plain/chemistry converters mangled valid math (e.g. HCF + algebra).
 */
const prepareFieldLatex = (value) => {
  const stripped = stripLatexDelimitersForKatex(normalizeLatexEscapes(value || ''))
  if (!stripped) return ''
  if (/\\[a-zA-Z]+/.test(stripped)) return stripped
  return convertTextToLatex(stripped)
}

const validateLatexText = (value) => {
  if (!value || !value.trim()) return null
  const normalized = stripLatexDelimitersForKatex(normalizeLatexEscapes(value || ''))
  if (!fieldNeedsFormulaEditor(normalized)) return null
  if (!hasBalancedBraces(normalized)) {
    return 'Check brackets and formula groups, then try again.'
  }
  try {
    katex.renderToString(normalized, {
      throwOnError: true,
      strict: 'ignore',
      displayMode: false,
    })
    return null
  } catch {
    return 'Check powers, fractions, and symbols, then try again.'
  }
}

const superscriptCharMap = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '⁺': '+',
  '⁻': '-',
}

const hasMathLikePasteContent = (value) =>
  looksLikeChemistryText(value) ||
  looksLikeScientificProseText(value) ||
  /[∅∈∉⊂⊆⊃⊇∪∩∧∨∀∃⇒⇔→πθαβγλμΔ≤≥≠±∞√°×÷⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻₀₁₂₃₄₅₆₇₈₉]|\\[a-zA-Z]+|[a-zA-Z]\s*\n\s*\d+|[a-zA-Z]\s+\d+/.test(
    value,
  )

const normalizePastedMathText = (value) => {
  let normalized = `${value || ''}`.normalize('NFKC')
  normalized = normalized.replace(/[\u2212]/g, '-') // unicode minus to hyphen-minus
  normalized = normalized.replace(/\r\n/g, '\n')

  // Convert variable + stacked exponent copied over multiple lines: x\n3 => x^3
  normalized = normalized.replace(/([A-Za-z])\s*\n+\s*(\d+)/g, '$1^$2')

  // Convert stacked logarithm forms from rich text paste:
  // log\n2\n8 -> \log_{2} 8
  normalized = normalized.replace(
    /\blog\s*\n+\s*([a-zA-Z0-9+-]+)\s*\n+\s*([a-zA-Z0-9(\\]+)/gi,
    '\\log_{$1} $2',
  )

  // Convert superscript characters into explicit powers.
  normalized = normalized.replace(
    /([A-Za-z0-9)\]}])([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+)/g,
    (_, base, supChars) =>
      `${base}^${supChars
        .split('')
        .map((ch) => superscriptCharMap[ch] || ch)
        .join('')}`,
  )

  // Handle copied "stacked" exponents from rich text/word processors.
  normalized = normalized.replace(/([A-Za-z0-9)\]}])\s*\n\s*(\d+)\s*\n/g, '$1^$2 ')

  // Convert loose variable-exponent spacing from plain text paste: x 2 -> x^2
  normalized = normalized.replace(/([A-Za-z])\s+(\d+)(?=\s*[+)\]}:,-]|$)/g, '$1^$2')
  normalized = normalized.replace(/([A-Za-z])\s+(\d+)\s+(?=(is|are|equals)\b)/gi, '$1^$2 ')

  normalized = normalized.replace(/\n+/g, ' ')
  normalized = normalized.replace(/\s{2,}/g, ' ')

  return normalized.trim()
}

function UrduKeyboard({ disabled = false, onKeyPress }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
      <div className="grid gap-1.5" dir="rtl" style={{ fontFamily: urduFontFamily }}>
        {urduKeyboardRows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex flex-wrap justify-center gap-1">
            {row.map((keyValue) => (
              <button
                key={keyValue}
                type="button"
                disabled={disabled}
                onClick={() => onKeyPress(keyValue)}
                className="min-h-8 min-w-8 rounded-lg border border-slate-300 bg-white px-1.5 text-base text-slate-800 shadow-sm transition hover:border-[#405189] hover:text-[#405189] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {keyValue}
              </button>
            ))}
          </div>
        ))}
        <div className="flex flex-wrap justify-center gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onKeyPress(' ')}
            className="min-h-8 min-w-24 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm transition hover:border-[#405189] hover:text-[#405189] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Space
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onKeyPress('backspace')}
            className="min-h-8 min-w-24 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm transition hover:border-[#405189] hover:text-[#405189] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Backspace
          </button>
        </div>
      </div>
    </div>
  )
}

function MathText({ value, className = '' }) {
  if (!value || !value.trim()) return <span className={className}>-</span>

  const stripped = stripLatexDelimitersForKatex(value)
  const normalized = normalizeLatexEscapes(stripped)
  let latexCandidate = looksLikeLatex(normalized) ? normalized : convertTextToLatex(normalized)

  if (!looksLikeLatex(latexCandidate)) {
    return (
      <span className={className} style={getUrduTextStyle(stripped)}>
        {stripped}
      </span>
    )
  }

  // Inline \frac uses script size; use display-style fractions so 4/x matches + 2π.
  latexCandidate = latexCandidate
    .replace(/\\dfrac\b/g, '\\frac')
    .replace(/\\frac\b/g, '\\dfrac')

  let html
  try {
    html = katex.renderToString(latexCandidate, {
      throwOnError: false,
      strict: 'ignore',
      displayMode: false,
    })
  } catch {
    return <span className={className}>{stripped}</span>
  }
  return (
    <span
      className={`academic-math-preview ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function AcademicQuestionCatalogPage() {
  const [rows, setRows] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [allChapters, setAllChapters] = useState([])
  const [filters, setFilters] = useState({ classId: '', subjectId: '', chapterId: '' })
  const [questionTypeFilter, setQuestionTypeFilter] = useState('')
  const [, setIsFilterLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [previewItem, setPreviewItem] = useState(null)
  const [browserOpen, setBrowserOpen] = useState(true)
  const [error, setError] = useState('')
  /** Validation / save errors while the add-edit modal is open (shown inside the modal). */
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [mathFieldSession, setMathFieldSession] = useState(0)
  /** Plain text by default on create; MathLive when on, after formula paste, or when editing formula content. */
  const [scientificEditor, setScientificEditor] = useState(false)
  const [urduKeyboard, setUrduKeyboard] = useState(false)
  const [activeUrduField, setActiveUrduField] = useState('descriptionText')
  const [activeFormulaField, setActiveFormulaField] = useState('descriptionText')
  const mathFieldRefs = useRef({})
  const languageFieldPathRef = useRef('descriptionText')

  const isMcq = useMemo(() => form.type === 'mcq', [form.type])
  const showUrduSidePanel = urduKeyboard && !scientificEditor
  const useFormulaEditor = scientificEditor
  const useUrduFormOptionLabels =
    urduKeyboard ||
    [
      form.descriptionText,
      form.mcqOpt1,
      form.mcqOpt2,
      form.mcqOpt3,
      form.mcqOpt4,
    ].some((value) => containsUrduText(value))
  /** MathLive: text mode for new prose-first; math mode when editing stored LaTeX so it renders (not literal `\text{}`). */
  const mathFieldDefaultMode = form.id ? 'math' : 'text'

  const normalizeMathPasteForField = useCallback((pasted) => {
    if (!pasted || !hasMathLikePasteContent(pasted)) return ''
    if (looksLikeChemistryText(pasted)) return normalizePastedChemistryText(pasted)
    if (looksLikeScientificProseText(pasted)) return normalizePastedScientificProseText(pasted)
    return convertTextToLatex(normalizePastedMathText(pasted))
  }, [])

  const insertFormulaLatex = useCallback((latex, options) => {
    const fieldName = activeFormulaField || 'descriptionText'
    const fieldRef = mathFieldRefs.current[fieldName]
    if (fieldRef?.insertLatex) {
      fieldRef.insertLatex(latex, options)
      return
    }
    // Fallback if field not mounted yet: append into form state.
    setForm((previous) => ({
      ...previous,
      [fieldName]: `${previous[fieldName] || ''}${latex.replace(/#\?|#\d|#@/g, '')}`,
    }))
  }, [activeFormulaField])

  const exitFormulaScript = useCallback(() => {
    const fieldName = activeFormulaField || 'descriptionText'
    mathFieldRefs.current[fieldName]?.exitScript?.()
  }, [activeFormulaField])

  const insertFormulaLineBreak = useCallback(() => {
    const fieldName = activeFormulaField || 'descriptionText'
    const fieldRef = mathFieldRefs.current[fieldName]
    if (fieldRef?.insertLineBreak) {
      fieldRef.insertLineBreak()
      return
    }
    setForm((previous) => ({
      ...previous,
      [fieldName]: `${previous[fieldName] || ''}\\newline `,
    }))
  }, [activeFormulaField])

  const setMathFieldRef = useCallback(
    (fieldName) => (instance) => {
      if (instance) mathFieldRefs.current[fieldName] = instance
      else delete mathFieldRefs.current[fieldName]
    },
    [],
  )

  const subjectsForClass = useMemo(() => {
    if (!filters.classId) return []
    const classId = Number(filters.classId)
    const subjectIds = new Set(
      allChapters.filter((chapter) => chapter.classId === classId).map((chapter) => chapter.subjectId),
    )
    return subjects.filter((subject) => subjectIds.has(subject.id))
  }, [allChapters, filters.classId, subjects])
  const chaptersForSelection = useMemo(() => {
    if (!filters.classId || !filters.subjectId) return []
    const classId = Number(filters.classId)
    const subjectId = Number(filters.subjectId)
    return allChapters
      .filter((chapter) => chapter.classId === classId && chapter.subjectId === subjectId)
      .sort((a, b) => a.chapterNo - b.chapterNo || a.id - b.id)
  }, [allChapters, filters.classId, filters.subjectId])
  const chapterOptions = useMemo(
    () =>
      chaptersForSelection.map((item) => ({
        value: item.id,
        label: `${item.chapterNo}. ${item.chapterName}`,
      })),
    [chaptersForSelection],
  )

  const selectedSubjectRecord = useMemo(
    () => subjects.find((item) => item.id === Number(filters.subjectId)) || null,
    [filters.subjectId, subjects],
  )
  const catalogProfile = selectedSubjectRecord?.catalogProfile || 'standard'
  const isLanguageCatalog = isLanguageProfile(catalogProfile)
  const languageKindOptions = useMemo(() => kindsForProfile(catalogProfile), [catalogProfile])
  const languageKindOptionGroups = useMemo(() => languageKindGroups(catalogProfile), [catalogProfile])
  const questionModalWide = isMcq && !isLanguageCatalog
  const questionModalMaxWidthClass = questionModalWide
    ? 'max-w-[min(1400px,calc(100vw-1.5rem))]'
    : showUrduSidePanel
      ? 'max-w-[min(1100px,calc(100vw-1.5rem))]'
      : 'max-w-[min(960px,calc(100vw-1.5rem))]'
  const questionBodyGridClass = questionModalWide
    ? 'grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(400px,520px)]'
    : showUrduSidePanel
      ? 'grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]'
      : 'grid gap-3'
  const selectedFormChapterOption = useMemo(
    () => chapterOptions.find((option) => option.value === Number(form.chapterId)) || null,
    [chapterOptions, form.chapterId],
  )
  const filteredRows = useMemo(() => {
    if (!questionTypeFilter) return rows
    if (isLanguageCatalog) {
      return rows.filter((item) => (item.structureKind || 'standard') === questionTypeFilter)
    }
    return rows.filter((item) => item.type === questionTypeFilter && (item.structureKind || 'standard') === 'standard')
  }, [isLanguageCatalog, questionTypeFilter, rows])
  const typeFilterOptions = isLanguageCatalog
    ? [{ value: '', label: 'All' }, ...languageKindOptions.map((item) => ({ value: item.id, label: item.label }))]
    : questionTypeFilterOptions

  const loadFilters = useCallback(async () => {
    setIsFilterLoading(true)
    setError('')
    try {
      const [classData, subjectData, chapterData] = await Promise.all([
        getAcademicClasses(),
        getAcademicSubjects(),
        getAcademicChapters(),
      ])
      setClasses(classData)
      setSubjects(subjectData)
      setAllChapters(chapterData)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to load filter options.')
    } finally {
      setIsFilterLoading(false)
    }
  }, [])

  useEffect(() => {
    const timerId = setTimeout(() => loadFilters(), 0)
    return () => clearTimeout(timerId)
  }, [loadFilters])

  const loadQuestionsByChapter = useCallback(async (chapterId) => {
    if (!chapterId) {
      setRows([])
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const data = await getQuestionCatalog(Number(chapterId))
      setRows(data)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to load question catalog.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const pickClass = (classId) => {
    setQuestionTypeFilter('')
    setBrowserOpen(true)
    setFilters({ classId: String(classId), subjectId: '', chapterId: '' })
  }

  const pickSubject = (subjectId) => {
    setQuestionTypeFilter('')
    setBrowserOpen(true)
    setFilters((previous) => ({
      ...previous,
      subjectId: String(subjectId),
      chapterId: '',
    }))
  }

  const pickChapter = (chapterId) => {
    setFilters((previous) => ({ ...previous, chapterId: String(chapterId) }))
    setBrowserOpen(false)
  }

  useEffect(() => {
    const timerId = setTimeout(() => {
      void loadQuestionsByChapter(filters.chapterId)
    }, 0)
    return () => clearTimeout(timerId)
  }, [filters.chapterId, loadQuestionsByChapter])

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!String(form.descriptionText ?? '').trim()) {
      setFormError(isLanguageCatalog ? 'Heading is required.' : 'Question text is required.')
      return
    }
    if (isLanguageCatalog) {
      const bodyError = validateLanguageBody(form.structureKind, form.body)
      if (bodyError) {
        setFormError(bodyError)
        return
      }
      setIsSaving(true)
      setFormError('')
      try {
        await upsertQuestionCatalog({
          id: form.id ? Number(form.id) : undefined,
          type: coarseTypeForKind(form.structureKind),
          category: form.category,
          chapterId: Number(form.chapterId),
          descriptionText: form.descriptionText.trim(),
          structureKind: form.structureKind,
          bodyJson: JSON.stringify(form.body || emptyBody(form.structureKind)),
          stemImage: null,
          mcqOpt1: null,
          mcqOpt2: null,
          mcqOpt3: null,
          mcqOpt4: null,
        })
        await loadQuestionsByChapter(filters.chapterId || form.chapterId)
        setScientificEditor(false)
        setUrduKeyboard(false)
        setFormError('')
        setIsModalOpen(false)
        setForm(emptyForm)
      } catch (requestError) {
        setFormError(requestError?.response?.data?.message || 'Could not save this question.')
      } finally {
        setIsSaving(false)
      }
      return
    }
    setIsSaving(true)
    setFormError('')
    const normalizedPayload = {
      id: form.id ? Number(form.id) : undefined,
      type: form.type,
      category: form.category,
      chapterId: Number(form.chapterId),
      descriptionText: prepareFieldLatex(form.descriptionText),
      stemImage: form.stemImage?.trim() || null,
      mcqOpt1: prepareFieldLatex(form.mcqOpt1),
      mcqOpt2: prepareFieldLatex(form.mcqOpt2),
      mcqOpt3: prepareFieldLatex(form.mcqOpt3),
      mcqOpt4: prepareFieldLatex(form.mcqOpt4),
    }

    const fieldsToValidate = [
      ['Question text', normalizedPayload.descriptionText],
      ['Option A', normalizedPayload.mcqOpt1],
      ['Option B', normalizedPayload.mcqOpt2],
      ['Option C', normalizedPayload.mcqOpt3],
      ['Option D', normalizedPayload.mcqOpt4],
    ]

    for (const [label, value] of fieldsToValidate) {
      if (!value) continue
      const validationError = validateLatexText(value)
      if (validationError) {
        setFormError(`${label}: ${validationError}`)
        setIsSaving(false)
        return
      }
    }

    setForm((previous) => ({
      ...previous,
      descriptionText: normalizedPayload.descriptionText,
      stemImage: normalizedPayload.stemImage || '',
      mcqOpt1: normalizedPayload.mcqOpt1,
      mcqOpt2: normalizedPayload.mcqOpt2,
      mcqOpt3: normalizedPayload.mcqOpt3,
      mcqOpt4: normalizedPayload.mcqOpt4,
    }))

    try {
      await upsertQuestionCatalog(normalizedPayload)
      await loadQuestionsByChapter(filters.chapterId || normalizedPayload.chapterId)
      setScientificEditor(false)
      setUrduKeyboard(false)
      setFormError('')
      setIsModalOpen(false)
      setForm(emptyForm)
    } catch (requestError) {
      const apiMessage = requestError?.response?.data?.message
      setFormError(
        apiMessage && !/latex|katex|tex/i.test(apiMessage)
          ? apiMessage
          : 'Could not save this question. Check the question text and try again.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const openCreateModal = () => {
    if (!filters.chapterId) {
      setError('Please select Class, Subject, and Chapter first.')
      return
    }
    setError('')
    setFormError('')
    setScientificEditor(false)
    setUrduKeyboard(false)
    setActiveUrduField('descriptionText')
    setActiveFormulaField('descriptionText')
    const languageKind = languageKindOptions.some((item) => item.id === questionTypeFilter)
      ? questionTypeFilter
      : languageKindOptions[0]?.id
    setForm({
      ...emptyForm,
      chapterId: filters.chapterId,
      descriptionText: isLanguageCatalog
        ? headingForKind(languageKind, selectedSubjectRecord?.catalogHeadingDefaults, catalogProfile)
        : '',
      type: isLanguageCatalog ? coarseTypeForKind(languageKind) : questionTypeFilter || emptyForm.type,
      structureKind: isLanguageCatalog ? languageKind : 'standard',
      body: isLanguageCatalog ? emptyBody(languageKind) : null,
    })
    languageFieldPathRef.current = 'descriptionText'
    if (isLanguageCatalog && catalogProfile === 'urdu') setUrduKeyboard(true)
    setMathFieldSession((session) => session + 1)
    setIsModalOpen(true)
  }

  const openEditModal = (item) => {
    setError('')
    setFormError('')
    if (isLanguageProfile(catalogProfile) && item.structureKind && item.structureKind !== 'standard') {
      const parsed = parseBody(item.bodyJson)
      const body = isLineBodyKind(item.structureKind) && !Array.isArray(parsed?.lines)
        ? emptyBody(item.structureKind)
        : parsed || emptyBody(item.structureKind)
      setForm({
        id: String(item.id),
        type: item.type,
        category: item.category,
        chapterId: String(item.chapterId),
        descriptionText: item.descriptionText || '',
        stemImage: '',
        mcqOpt1: '',
        mcqOpt2: '',
        mcqOpt3: '',
        mcqOpt4: '',
        structureKind: item.structureKind,
        body,
      })
      setScientificEditor(false)
      setUrduKeyboard(catalogProfile === 'urdu' || containsUrduText(item.descriptionText) || containsUrduText(item.bodyJson))
      languageFieldPathRef.current = 'descriptionText'
      setIsModalOpen(true)
      return
    }
    const descriptionText = stripLatexDelimitersForKatex(normalizeLatexEscapes(item.descriptionText || ''))
    const mcqOpt1 = stripLatexDelimitersForKatex(normalizeLatexEscapes(item.mcqOpt1 || ''))
    const mcqOpt2 = stripLatexDelimitersForKatex(normalizeLatexEscapes(item.mcqOpt2 || ''))
    const mcqOpt3 = stripLatexDelimitersForKatex(normalizeLatexEscapes(item.mcqOpt3 || ''))
    const mcqOpt4 = stripLatexDelimitersForKatex(normalizeLatexEscapes(item.mcqOpt4 || ''))
    setForm({
      id: String(item.id),
      type: item.type,
      category: item.category,
      chapterId: String(item.chapterId),
      descriptionText,
      stemImage: item.stemImage || '',
      mcqOpt1,
      mcqOpt2,
      mcqOpt3,
      mcqOpt4,
    })
    setScientificEditor(
      [descriptionText, mcqOpt1, mcqOpt2, mcqOpt3, mcqOpt4].some((value) => fieldNeedsFormulaEditor(value)),
    )
    setUrduKeyboard([descriptionText, mcqOpt1, mcqOpt2, mcqOpt3, mcqOpt4].some((value) => containsUrduText(value)))
    setActiveUrduField('descriptionText')
    setActiveFormulaField('descriptionText')
    setMathFieldSession((session) => session + 1)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (isSaving) return
    setScientificEditor(false)
    setUrduKeyboard(false)
    setFormError('')
    setIsModalOpen(false)
  }

  const onDelete = async (id) => {
    setDeletingId(id)
    setError('')
    try {
      await deleteQuestionCatalog(id)
      await loadQuestionsByChapter(filters.chapterId)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Question delete failed.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleQuestionPastePlain = (event) => {
    if (isLanguageCatalog) return
    const pasted = event.clipboardData.getData('text')
    if (!pasted || !hasMathLikePasteContent(pasted)) return
    event.preventDefault()
    const target = event.target
    const start = target.selectionStart ?? 0
    const end = target.selectionEnd ?? start
    const normalizedMathText = looksLikeChemistryText(pasted)
      ? normalizePastedChemistryText(pasted)
      : looksLikeScientificProseText(pasted)
        ? normalizePastedScientificProseText(pasted)
        : convertTextToLatex(normalizePastedMathText(pasted))
    setForm((previous) => {
      const current = previous.descriptionText || ''
      return {
        ...previous,
        descriptionText: `${current.slice(0, start)}${normalizedMathText}${current.slice(end)}`,
      }
    })
    setScientificEditor(true)
    setMathFieldSession((session) => session + 1)
  }

  const handleMcqPastePlain = (fieldName) => (event) => {
    const pasted = event.clipboardData.getData('text')
    if (!pasted || !hasMathLikePasteContent(pasted)) return
    event.preventDefault()
    const target = event.target
    const start = target.selectionStart ?? 0
    const end = target.selectionEnd ?? start
    const normalizedMathText = looksLikeChemistryText(pasted)
      ? normalizePastedChemistryText(pasted)
      : looksLikeScientificProseText(pasted)
        ? normalizePastedScientificProseText(pasted)
        : convertTextToLatex(normalizePastedMathText(pasted))
    setForm((previous) => {
      const current = previous[fieldName] || ''
      return {
        ...previous,
        [fieldName]: `${current.slice(0, start)}${normalizedMathText}${current.slice(end)}`,
      }
    })
    setScientificEditor(true)
    setMathFieldSession((session) => session + 1)
  }

  const bumpMathFieldSession = () => {
    setMathFieldSession((session) => session + 1)
  }

  const onStemImageFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    try {
      const dataUrl = await compressStemImageFile(file)
      setForm((previous) => ({ ...previous, stemImage: dataUrl }))
    } catch (imageError) {
      setError(imageError?.message || 'Unable to use that image.')
    }
  }

  const clearStemImage = () => {
    setForm((previous) => ({ ...previous, stemImage: '' }))
  }

  const handleUrduKeyPress = (keyValue) => {
    if (isLanguageCatalog) {
      const path = languageFieldPathRef.current || 'descriptionText'
      if (path === 'descriptionText') {
        setForm((previous) => ({
          ...previous,
          descriptionText: applyTextKey(previous.descriptionText, keyValue),
        }))
      } else {
        setForm((previous) => ({
          ...previous,
          body: applyBodyKey(previous.body, path, keyValue),
        }))
      }
      return
    }
    const fieldName = activeUrduField || 'descriptionText'
    setForm((previous) => {
      const current = previous[fieldName] || ''
      return {
        ...previous,
        [fieldName]: keyValue === 'backspace' ? current.slice(0, -1) : `${current}${keyValue}`,
      }
    })
  }

  const plainFieldProps = (fieldName, value) => ({
    dir: urduKeyboard || containsUrduText(value) ? 'rtl' : 'auto',
    style: getUrduTextStyle(value, urduKeyboard),
    onFocus: () => {
      languageFieldPathRef.current = fieldName
      setActiveUrduField(fieldName)
    },
  })

  return (
    <AcademicLayout
      pageTitle="Question Catalog"
      pageSubtitle="Manage shared question catalog items."
      pageIcon={<FileQuestion size={18} />}
      isSingleCardLayout
      pageActions={
        <button type="button" onClick={openCreateModal} className="btn-soft btn-soft-primary">
          <Plus size={16} />
          Add Question
        </button>
      }
    >
      {error ? (
        <section className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </section>
      ) : null}

      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          browserOpen ? 'mb-4 max-h-[31rem] opacity-100' : 'mb-0 max-h-0 opacity-0'
        }`}
      >
        <div className="grid gap-3 md:grid-cols-3 md:items-stretch">
          <div className="flex h-[30rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            <p className="shrink-0 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Class</p>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-1.5">
              {classes.map((item) => {
                const active = String(item.id) === String(filters.classId)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => pickClass(item.id)}
                    className={`w-full rounded-md border px-2.5 py-1.5 text-left text-sm ${
                      active
                        ? 'border-[#405189] bg-[#405189] font-medium text-white'
                        : 'border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {item.className}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex h-[30rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            <p className="shrink-0 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</p>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-1.5">
              {!filters.classId ? (
                <p className="px-2 py-6 text-center text-sm text-slate-400">Choose a class</p>
              ) : subjectsForClass.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-slate-400">No chapters for this class yet</p>
              ) : (
                subjectsForClass.map((item) => {
                  const active = String(item.id) === String(filters.subjectId)
                  const urdu = containsUrduText(item.subjectName)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => pickSubject(item.id)}
                      style={urduListStyle(item.subjectName)}
                      className={`w-full rounded-md border px-2.5 py-1.5 text-sm ${urdu ? 'text-right' : 'text-left'} ${
                        active
                          ? 'border-[#405189] bg-[#405189] font-medium text-white'
                          : 'border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {item.subjectName}
                    </button>
                  )
                })
              )}
            </div>
          </div>
          <div className="flex h-[30rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            <p className="shrink-0 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Chapter</p>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-1.5">
              {!filters.subjectId ? (
                <p className="px-2 py-6 text-center text-sm text-slate-400">Choose a subject</p>
              ) : (
                chaptersForSelection.map((item) => {
                  const active = String(item.id) === String(filters.chapterId)
                  const label = `${item.chapterNo}. ${item.chapterName}`
                  const urdu = containsUrduText(item.chapterName)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => pickChapter(item.id)}
                      style={urduListStyle(item.chapterName)}
                      className={`w-full rounded-md border px-2.5 py-1.5 text-sm ${urdu ? 'text-right' : 'text-left'} ${
                        active
                          ? 'border-[#405189] bg-[#405189] font-medium text-white'
                          : 'border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {filters.chapterId ? (
        <button
          type="button"
          onClick={() => setBrowserOpen((open) => !open)}
          className="mb-4 flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:border-slate-300"
        >
          <span className="min-w-0 truncate">
            <span>{classes.find((item) => String(item.id) === String(filters.classId))?.className}</span>
            <span className="px-1.5 text-slate-300">/</span>
            <span style={urduListStyle(selectedSubjectRecord?.subjectName)}>
              {selectedSubjectRecord?.subjectName}
            </span>
            <span className="px-1.5 text-slate-300">/</span>
            <span style={urduListStyle(chaptersForSelection.find((item) => String(item.id) === String(filters.chapterId))?.chapterName)}>
              {chaptersForSelection.find((item) => String(item.id) === String(filters.chapterId))
                ? `${chaptersForSelection.find((item) => String(item.id) === String(filters.chapterId)).chapterNo}. ${chaptersForSelection.find((item) => String(item.id) === String(filters.chapterId)).chapterName}`
                : ''}
            </span>
          </span>
          <span className="shrink-0 text-xs font-medium text-[#405189]">{browserOpen ? 'Hide' : 'Change'}</span>
        </button>
      ) : null}

      {filters.chapterId ? (
      <>
      <section className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition-opacity duration-300">
        {isLanguageCatalog ? null : (
          <span className="text-sm font-medium text-slate-700">Question type</span>
        )}
        {isLanguageCatalog ? (
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {languageKindOptionGroups.map((group, groupIndex) => (
              <div key={group.id} className="flex flex-wrap items-center gap-1.5">
                {groupIndex === 0 ? (
                  <label
                    className={`cursor-pointer rounded-full px-3 py-1 text-[13px] font-medium transition ${
                      questionTypeFilter === ''
                        ? 'bg-[#405189] text-white'
                        : 'border border-slate-200 bg-white text-slate-600 hover:border-[#405189]/40 hover:text-[#405189]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="questionTypeFilter"
                      value=""
                      checked={questionTypeFilter === ''}
                      onChange={() => setQuestionTypeFilter('')}
                      className="sr-only"
                    />
                    All
                  </label>
                ) : null}
                <span className="mr-1 rounded-full bg-slate-200/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {group.label}
                </span>
                {group.kinds.map((kind) => (
                  <label
                    key={kind.id}
                    className={`cursor-pointer rounded-full px-3 py-1 text-[13px] font-medium transition ${
                      questionTypeFilter === kind.id
                        ? 'bg-[#405189] text-white'
                        : 'border border-slate-200 bg-white text-slate-600 hover:border-[#405189]/40 hover:text-[#405189]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="questionTypeFilter"
                      value={kind.id}
                      checked={questionTypeFilter === kind.id}
                      onChange={() => setQuestionTypeFilter(kind.id)}
                      className="sr-only"
                    />
                    {kind.label}
                  </label>
                ))}
              </div>
            ))}
          </div>
        ) : (
        <div className="flex flex-wrap gap-2">
          {typeFilterOptions.map((option) => (
            <label
              key={option.value || 'all'}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${
                questionTypeFilter === option.value
                  ? 'border-[#405189] bg-white text-[#405189] shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="questionTypeFilter"
                value={option.value}
                checked={questionTypeFilter === option.value}
                onChange={(event) => setQuestionTypeFilter(event.target.value)}
                className="h-4 w-4 accent-[#405189]"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        )}
      </section>

      <section className="max-h-[65vh] overflow-x-hidden overflow-y-auto rounded-xl border border-slate-200 [scrollbar-gutter:stable]">
        <table className="w-full table-fixed border-collapse text-[13px] leading-snug">
          <colgroup>
            <col className="w-14" />
            <col className="w-[7.25rem]" />
            <col className="w-[5.5rem]" />
            <col className="w-20" />
            <col />
            <col className="w-[7.25rem]" />
          </colgroup>
          <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="border border-slate-200 px-3 py-2 font-semibold">Sr #</th>
              <th className="border border-slate-200 px-3 py-2 font-semibold">Type</th>
              <th className="border border-slate-200 px-3 py-2 font-semibold">Category</th>
              <th className="border border-slate-200 px-3 py-2 font-semibold">Chapter</th>
              <th className="border border-slate-200 px-3 py-2 font-semibold">Question / Options</th>
              <th className="border border-slate-200 px-3 py-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="border border-slate-200 px-4 py-12">
                  <div className="flex items-center justify-center gap-2 text-slate-500">
                    <Loader2 size={18} className="animate-spin text-[#405189]" />
                    <span>Loading questions...</span>
                  </div>
                </td>
              </tr>
            ) : !filters.chapterId ? (
              <tr>
                <td colSpan={6} className="border border-slate-200 px-4 py-10 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <Search size={16} />
                    <span>Choose a class, then a subject.</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="border border-slate-200 px-4 py-10 text-center text-slate-500">
                  No questions found.
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="border border-slate-200 px-4 py-10 text-center text-slate-500">
                  No {isLanguageCatalog ? structureLabel(questionTypeFilter).toLowerCase() : questionTypeFilter === 'numerical' ? 'Numerical' : questionTypeFilter.toUpperCase()} questions found.
                </td>
              </tr>
            ) : (
              filteredRows.map((item, index) => {
                const itemIsLanguage = isLanguageCatalog && item.structureKind && item.structureKind !== 'standard'
                const useUrduOptionLabels = [
                  item.descriptionText,
                  item.mcqOpt1,
                  item.mcqOpt2,
                  item.mcqOpt3,
                  item.mcqOpt4,
                ].some((value) => containsUrduText(value))

                return (
                <tr key={item.id} className="group hover:bg-slate-50/70">
                  <td className="border border-slate-200 px-3 py-1.5">{index + 1}</td>
                  <td className="border border-slate-200 px-3 py-1.5 whitespace-nowrap">
                    {itemIsLanguage ? structureLabel(item.structureKind) : item.type.toUpperCase()}
                  </td>
                  <td className="border border-slate-200 px-3 py-1.5 whitespace-nowrap uppercase">{item.category}</td>
                  <td className="border border-slate-200 px-3 py-1.5">{item.chapterId}</td>
                  <td className="w-0 min-w-0 overflow-hidden border border-slate-200 px-3 py-1.5 align-top text-slate-700">
                    <div className="min-w-0 space-y-1.5 break-words [overflow-wrap:anywhere]">
                      {itemIsLanguage ? (
                        <>
                          <p className="text-slate-800" style={urduListStyle(item.descriptionText)}>
                            {item.descriptionText}
                          </p>
                          <button
                            type="button"
                            onClick={() => setPreviewItem(item)}
                            className="text-left text-xs text-[#405189] hover:underline"
                          >
                            {summarizeBody(item.structureKind, parseBody(item.bodyJson))}
                          </button>
                        </>
                      ) : (
                      <div className="min-w-0 max-w-full overflow-x-auto" style={urduListStyle(item.descriptionText)}>
                        <MathText value={item.descriptionText} className="block max-w-full text-slate-800" />
                      </div>
                      )}
                      <QuestionStemImage src={item.stemImage} className="mt-1 rounded border border-slate-200 bg-white p-1" />
                      {!itemIsLanguage && item.type === 'mcq' ? (
                        <div className="grid gap-1 text-xs text-slate-600">
                          <p className={useUrduOptionLabels ? 'text-right' : ''} style={getUrduTextStyle('', useUrduOptionLabels)}>
                            <span
                              className={`${useUrduOptionLabels ? 'ml-1' : 'mr-1'} font-semibold`}
                              style={getUrduTextStyle('', useUrduOptionLabels)}
                            >
                              {getMcqOptionLabel(0, useUrduOptionLabels)})
                            </span>
                            <MathText value={item.mcqOpt1} />
                          </p>
                          <p className={useUrduOptionLabels ? 'text-right' : ''} style={getUrduTextStyle('', useUrduOptionLabels)}>
                            <span
                              className={`${useUrduOptionLabels ? 'ml-1' : 'mr-1'} font-semibold`}
                              style={getUrduTextStyle('', useUrduOptionLabels)}
                            >
                              {getMcqOptionLabel(1, useUrduOptionLabels)})
                            </span>
                            <MathText value={item.mcqOpt2} />
                          </p>
                          {item.mcqOpt3 ? (
                            <p className={useUrduOptionLabels ? 'text-right' : ''} style={getUrduTextStyle('', useUrduOptionLabels)}>
                              <span
                                className={`${useUrduOptionLabels ? 'ml-1' : 'mr-1'} font-semibold`}
                                style={getUrduTextStyle('', useUrduOptionLabels)}
                              >
                                {getMcqOptionLabel(2, useUrduOptionLabels)})
                              </span>
                              <MathText value={item.mcqOpt3} />
                            </p>
                          ) : null}
                          {item.mcqOpt4 ? (
                            <p className={useUrduOptionLabels ? 'text-right' : ''} style={getUrduTextStyle('', useUrduOptionLabels)}>
                              <span
                                className={`${useUrduOptionLabels ? 'ml-1' : 'mr-1'} font-semibold`}
                                style={getUrduTextStyle('', useUrduOptionLabels)}
                              >
                                {getMcqOptionLabel(3, useUrduOptionLabels)})
                              </span>
                              <MathText value={item.mcqOpt4} />
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="whitespace-nowrap border border-slate-200 px-3 py-1.5 align-top">
                    <div className="flex justify-end">
                      <div className="action-group">
                        {itemIsLanguage ? (
                          <button
                            type="button"
                            onClick={() => setPreviewItem(item)}
                            className="action-link"
                            aria-label="View question parts"
                            title="View parts"
                          >
                            <Eye size={14} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="action-link action-link-success"
                          aria-label="Edit question"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="action-link action-link-danger"
                          aria-label="Delete question"
                          title="Delete"
                        >
                          {deletingId === item.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </section>
      </>
      ) : null}

      {previewItem ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {structureLabel(previewItem.structureKind)}
                </p>
                <h3
                  className="mt-1 text-base font-semibold text-slate-900"
                  style={getUrduTextStyle(previewItem.descriptionText, catalogProfile === 'urdu' || containsUrduText(previewItem.descriptionText))}
                >
                  {previewItem.descriptionText}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <LanguageQuestionPreview
                kind={previewItem.structureKind}
                body={parseBody(previewItem.bodyJson)}
                rtl={catalogProfile === 'urdu' || containsUrduText(previewItem.descriptionText) || containsUrduText(previewItem.bodyJson)}
                textStyle={getUrduTextStyle(
                  previewItem.descriptionText || previewItem.bodyJson,
                  catalogProfile === 'urdu' || containsUrduText(previewItem.descriptionText) || containsUrduText(previewItem.bodyJson),
                )}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={`fixed inset-0 z-[80] flex items-center justify-center p-4 transition-all duration-300 ${
          isModalOpen
            ? 'pointer-events-auto bg-slate-900/40 opacity-100 backdrop-blur-sm'
            : 'pointer-events-none bg-slate-900/0 opacity-0 backdrop-blur-0'
        }`}
      >
        <div
          className={`flex max-h-[calc(100vh-1.5rem)] w-full ${questionModalMaxWidthClass} flex-col rounded-2xl bg-white shadow-2xl transition-all duration-300 ${
            isModalOpen ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-95 opacity-0'
          }`}
        >
          <div className="flex shrink-0 flex-wrap items-start gap-3 border-b border-slate-100 px-4 py-3">
            <div className="min-w-[12rem] shrink-0">
              <h3 className="text-lg font-semibold text-slate-800">
                {form.id ? 'Edit Question' : 'Add New Question'}
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">Manage question metadata and content.</p>
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-stretch justify-end gap-2">
              {isLanguageCatalog ? null : (
              <label
                className="flex max-w-[17rem] cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-2 text-xs text-slate-700"
                title="Visual math and chemistry entry, with Chem and Math keys on the on-screen keyboard."
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 rounded border-slate-300 text-[#405189] focus:ring-[#405189]"
                  checked={scientificEditor}
                  disabled={isSaving}
                  onChange={(event) => {
                    const enabled = event.target.checked
                    if (enabled) {
                      setUrduKeyboard(false)
                      setScientificEditor(true)
                      setActiveFormulaField('descriptionText')
                    } else {
                      setScientificEditor(false)
                    }
                    bumpMathFieldSession()
                  }}
                />
                <span className="font-medium leading-snug text-slate-800">Scientific keyboard (formula editor)</span>
              </label>
              )}
              <label
                className="flex max-w-[15rem] cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-2 text-xs text-slate-700"
                title="Native Urdu typing, pasted Urdu text, and on-screen Urdu keyboard."
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 rounded border-slate-300 text-[#405189] focus:ring-[#405189]"
                  checked={urduKeyboard}
                  disabled={isSaving}
                  onChange={(event) => {
                    const enabled = event.target.checked
                    if (enabled) {
                      setScientificEditor(false)
                      setUrduKeyboard(true)
                      setActiveUrduField('descriptionText')
                      bumpMathFieldSession()
                    } else {
                      setUrduKeyboard(false)
                    }
                  }}
                />
                <span className="font-medium leading-snug text-slate-800">Urdu keyboard (Jameel Noori)</span>
              </label>
            </div>
            <button
              type="button"
              onClick={closeModal}
              disabled={isSaving}
              className="ml-auto shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-0"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto px-4 py-3">
            <div className="grid gap-3 md:grid-cols-3">
              {isLanguageCatalog ? (
                <select
                  value={form.structureKind || languageKindOptions[0]?.id || ''}
                  onChange={(event) => {
                    const structureKind = event.target.value
                    setForm((previous) => ({
                      ...previous,
                      structureKind,
                      type: coarseTypeForKind(structureKind),
                      descriptionText: headingForKind(
                        structureKind,
                        selectedSubjectRecord?.catalogHeadingDefaults,
                        catalogProfile,
                      ),
                      body: emptyBody(structureKind),
                    }))
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {languageKindOptionGroups.map((group) => (
                    <optgroup key={group.id} label={group.label}>
                      {group.kinds.map((item) => (
                        <option key={item.id} value={item.id}>{item.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              ) : (
              <select
                value={form.type}
                onChange={(event) => setForm((previous) => ({ ...previous, type: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="mcq">mcq</option>
                <option value="saq">saq</option>
                <option value="laq">laq</option>
                <option value="numerical">numerical</option>
              </select>
              )}
              <select
                value={form.category}
                onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="board">board</option>
                <option value="text">text</option>
                <option value="exercise">exercise</option>
              </select>
              <Select
                options={chapterOptions}
                value={selectedFormChapterOption}
                onChange={(option) =>
                  setForm((previous) => ({ ...previous, chapterId: option?.value ? String(option.value) : '' }))
                }
                placeholder="Select chapter"
                isDisabled={chapterOptions.length === 0}
              />
            </div>

            <div className={questionBodyGridClass}>
              <div className="grid min-w-0 content-start gap-3">
                <div className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-700">{isLanguageCatalog ? 'Heading' : 'Question text'}</span>
                  {formError ? (
                    <div
                      role="alert"
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                    >
                      {formError}
                    </div>
                  ) : null}
                  {useFormulaEditor ? (
                    <p className="text-xs text-slate-500">
                      Use the Chem/Math buttons below, or the keyboard icon for more symbols.
                    </p>
                  ) : isLanguageCatalog ? (
                    <p className="text-xs text-slate-500">
                      This is the instruction printed above the parts, such as “Choose the correct form of verb.”
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Plain text for non-math questions. Paste a formula to switch to the formula editor automatically.
                    </p>
                  )}
                  {useFormulaEditor ? (
                    <>
                      <AcademicFormulaInsertToolbar
                        disabled={isSaving}
                        onInsertLatex={insertFormulaLatex}
                        onExitScript={exitFormulaScript}
                        onInsertLineBreak={insertFormulaLineBreak}
                      />
                      <AcademicQuestionMathField
                        ref={setMathFieldRef('descriptionText')}
                        sessionKey={`${mathFieldSession}-desc`}
                        latexValue={form.descriptionText}
                        onLatexChange={(text) => {
                          setFormError('')
                          setForm((previous) => ({ ...previous, descriptionText: text }))
                        }}
                        disabled={isSaving}
                        placeholder="Type your question; use Chem/Math keys or paste a formula"
                        variant="question"
                        defaultMode={mathFieldDefaultMode}
                        normalizeMathPaste={normalizeMathPasteForField}
                        onFocusField={() => setActiveFormulaField('descriptionText')}
                      />
                    </>
                  ) : (
                    <textarea
                      value={form.descriptionText}
                      onChange={(event) => {
                        setFormError('')
                        setForm((previous) => ({ ...previous, descriptionText: event.target.value }))
                      }}
                      onPaste={handleQuestionPastePlain}
                      placeholder="Question text"
                      className="min-h-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      required
                      {...plainFieldProps('descriptionText', form.descriptionText)}
                    />
                  )}
                  {isLanguageCatalog ? (
                    <LanguageQuestionFields
                      key={form.structureKind || 'language'}
                      kind={form.structureKind}
                      body={form.body}
                      disabled={isSaving}
                      rtl={urduKeyboard || catalogProfile === 'urdu'}
                      onChange={(body) => setForm((previous) => ({ ...previous, body }))}
                      fieldProps={(path) => {
                        const useUrduFields = urduKeyboard || catalogProfile === 'urdu'
                        return {
                          dir: useUrduFields ? 'rtl' : 'ltr',
                          style: useUrduFields ? getUrduTextStyle('', true) : undefined,
                          onFocus: () => {
                            languageFieldPathRef.current = path
                          },
                        }
                      }}
                    />
                  ) : null}
                  {isLanguageCatalog ? null : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-[#405189] hover:text-[#405189]">
                        {form.stemImage ? 'Replace structure image' : 'Add structure image'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/*"
                          className="hidden"
                          disabled={isSaving}
                          onChange={onStemImageFile}
                        />
                      </label>
                      {form.stemImage ? (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={clearStemImage}
                          className="text-xs font-medium text-rose-600 hover:underline disabled:opacity-50"
                        >
                          Remove image
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          For diagrams that are hard to type (organic structures, etc.)
                        </span>
                      )}
                    </div>
                    {form.stemImage ? (
                      <QuestionStemImage
                        src={form.stemImage}
                        className="mt-2 rounded border border-slate-200 bg-slate-50 p-2"
                      />
                    ) : null}
                  </div>
                  )}
                </div>
              </div>

              {(isMcq && !isLanguageCatalog) || showUrduSidePanel ? (
              <div className="grid min-w-0 content-start gap-3">
                {showUrduSidePanel ? (
                  <UrduKeyboard disabled={isSaving} onKeyPress={handleUrduKeyPress} />
                ) : null}

                {isMcq && !isLanguageCatalog ? (
                  <>
                    <div className="grid gap-2">
                      <span className="text-sm font-medium text-slate-700">MCQ options</span>
                      {useFormulaEditor ? (
                        <>
                          <div className="grid gap-1">
                            <span className="text-xs font-medium text-slate-600">Option A</span>
                            <AcademicQuestionMathField
                              ref={setMathFieldRef('mcqOpt1')}
                              sessionKey={`${mathFieldSession}-o1`}
                              latexValue={form.mcqOpt1}
                              onLatexChange={(text) => setForm((previous) => ({ ...previous, mcqOpt1: text }))}
                              disabled={isSaving}
                              placeholder="Option A"
                              variant="option"
                              defaultMode={mathFieldDefaultMode}
                              normalizeMathPaste={normalizeMathPasteForField}
                              onFocusField={() => setActiveFormulaField('mcqOpt1')}
                            />
                          </div>
                          <div className="grid gap-1">
                            <span className="text-xs font-medium text-slate-600">Option B</span>
                            <AcademicQuestionMathField
                              ref={setMathFieldRef('mcqOpt2')}
                              sessionKey={`${mathFieldSession}-o2`}
                              latexValue={form.mcqOpt2}
                              onLatexChange={(text) => setForm((previous) => ({ ...previous, mcqOpt2: text }))}
                              disabled={isSaving}
                              placeholder="Option B"
                              variant="option"
                              defaultMode={mathFieldDefaultMode}
                              normalizeMathPaste={normalizeMathPasteForField}
                              onFocusField={() => setActiveFormulaField('mcqOpt2')}
                            />
                          </div>
                          <div className="grid gap-1">
                            <span className="text-xs font-medium text-slate-600">Option C</span>
                            <AcademicQuestionMathField
                              ref={setMathFieldRef('mcqOpt3')}
                              sessionKey={`${mathFieldSession}-o3`}
                              latexValue={form.mcqOpt3}
                              onLatexChange={(text) => setForm((previous) => ({ ...previous, mcqOpt3: text }))}
                              disabled={isSaving}
                              placeholder="Option C (optional)"
                              variant="option"
                              defaultMode={mathFieldDefaultMode}
                              normalizeMathPaste={normalizeMathPasteForField}
                              onFocusField={() => setActiveFormulaField('mcqOpt3')}
                            />
                          </div>
                          <div className="grid gap-1">
                            <span className="text-xs font-medium text-slate-600">Option D</span>
                            <AcademicQuestionMathField
                              ref={setMathFieldRef('mcqOpt4')}
                              sessionKey={`${mathFieldSession}-o4`}
                              latexValue={form.mcqOpt4}
                              onLatexChange={(text) => setForm((previous) => ({ ...previous, mcqOpt4: text }))}
                              disabled={isSaving}
                              placeholder="Option D (optional)"
                              variant="option"
                              defaultMode={mathFieldDefaultMode}
                              normalizeMathPaste={normalizeMathPasteForField}
                              onFocusField={() => setActiveFormulaField('mcqOpt4')}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <input
                            value={form.mcqOpt1}
                            onChange={(event) =>
                              setForm((previous) => ({ ...previous, mcqOpt1: event.target.value }))
                            }
                            onPaste={handleMcqPastePlain('mcqOpt1')}
                            placeholder="MCQ option 1"
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            required
                            {...plainFieldProps('mcqOpt1', form.mcqOpt1)}
                          />
                          <input
                            value={form.mcqOpt2}
                            onChange={(event) =>
                              setForm((previous) => ({ ...previous, mcqOpt2: event.target.value }))
                            }
                            onPaste={handleMcqPastePlain('mcqOpt2')}
                            placeholder="MCQ option 2"
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            required
                            {...plainFieldProps('mcqOpt2', form.mcqOpt2)}
                          />
                          <input
                            value={form.mcqOpt3}
                            onChange={(event) =>
                              setForm((previous) => ({ ...previous, mcqOpt3: event.target.value }))
                            }
                            onPaste={handleMcqPastePlain('mcqOpt3')}
                            placeholder="MCQ option 3"
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            {...plainFieldProps('mcqOpt3', form.mcqOpt3)}
                          />
                          <input
                            value={form.mcqOpt4}
                            onChange={(event) =>
                              setForm((previous) => ({ ...previous, mcqOpt4: event.target.value }))
                            }
                            onPaste={handleMcqPastePlain('mcqOpt4')}
                            placeholder="MCQ option 4"
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            {...plainFieldProps('mcqOpt4', form.mcqOpt4)}
                          />
                        </>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Options Preview
                      </p>
                      <div className="grid gap-1">
                        <p className={useUrduFormOptionLabels ? 'text-right' : ''} style={getUrduTextStyle('', useUrduFormOptionLabels)}>
                          <span
                            className={`${useUrduFormOptionLabels ? 'ml-1' : 'mr-1'} font-semibold`}
                            style={getUrduTextStyle('', useUrduFormOptionLabels)}
                          >
                            {getMcqOptionLabel(0, useUrduFormOptionLabels)})
                          </span>
                          <MathText value={form.mcqOpt1} />
                        </p>
                        <p className={useUrduFormOptionLabels ? 'text-right' : ''} style={getUrduTextStyle('', useUrduFormOptionLabels)}>
                          <span
                            className={`${useUrduFormOptionLabels ? 'ml-1' : 'mr-1'} font-semibold`}
                            style={getUrduTextStyle('', useUrduFormOptionLabels)}
                          >
                            {getMcqOptionLabel(1, useUrduFormOptionLabels)})
                          </span>
                          <MathText value={form.mcqOpt2} />
                        </p>
                        <p className={useUrduFormOptionLabels ? 'text-right' : ''} style={getUrduTextStyle('', useUrduFormOptionLabels)}>
                          <span
                            className={`${useUrduFormOptionLabels ? 'ml-1' : 'mr-1'} font-semibold`}
                            style={getUrduTextStyle('', useUrduFormOptionLabels)}
                          >
                            {getMcqOptionLabel(2, useUrduFormOptionLabels)})
                          </span>
                          <MathText value={form.mcqOpt3} />
                        </p>
                        <p className={useUrduFormOptionLabels ? 'text-right' : ''} style={getUrduTextStyle('', useUrduFormOptionLabels)}>
                          <span
                            className={`${useUrduFormOptionLabels ? 'ml-1' : 'mr-1'} font-semibold`}
                            style={getUrduTextStyle('', useUrduFormOptionLabels)}
                          >
                            {getMcqOptionLabel(3, useUrduFormOptionLabels)})
                          </span>
                          <MathText value={form.mcqOpt4} />
                        </p>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
              ) : null}
            </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-white px-4 py-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="btn-soft btn-soft-primary"
              >
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className="btn-soft btn-soft-success">
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : form.id ? (
                  <Pencil size={16} />
                ) : (
                  <Save size={16} />
                )}
                {isSaving ? 'Saving...' : form.id ? 'Update Question' : 'Save Question'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AcademicLayout>
  )
}

export default AcademicQuestionCatalogPage
