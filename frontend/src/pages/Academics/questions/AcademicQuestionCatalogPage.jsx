import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileQuestion, Loader2, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import 'katex/contrib/mhchem'
import Select from 'react-select'
import AcademicLayout from '../../../components/academics/AcademicLayout'
import AcademicQuestionMathField from '../../../components/academics/AcademicQuestionMathField'
import {
  looksLikeChemistryText,
  looksLikeScientificProseText,
  normalizeChemistryNotation,
  normalizePastedChemistryText,
  normalizePastedScientificProseText,
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

const emptyForm = {
  id: '',
  type: 'mcq',
  category: 'board',
  chapterId: '',
  descriptionText: '',
  mcqOpt1: '',
  mcqOpt2: '',
  mcqOpt3: '',
  mcqOpt4: '',
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

const normalizeLatex = (value) => value.replaceAll('\\\\', '\\').trim()

const fieldNeedsFormulaEditor = (value) => {
  const normalized = stripLatexDelimitersForKatex(normalizeLatex(value || ''))
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
  normalized = normalizeLatex(normalized)
  return normalized
}

const validateLatexText = (value) => {
  if (!value || !value.trim()) return null
  if (!hasBalancedBraces(value)) return 'Unbalanced braces in expression.'
  try {
    katex.renderToString(value, {
      throwOnError: true,
      strict: 'ignore',
      displayMode: false,
    })
    return null
  } catch (error) {
    return error?.message || 'Invalid LaTeX expression.'
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
  /[∅∈∉⊂⊆⊃⊇∪∩∀∃⇒⇔→πθαβγλμΔ≤≥≠±∞√°×÷⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]|\\[a-zA-Z]+|[a-zA-Z]\s*\n\s*\d+|[a-zA-Z]\s+\d+/.test(
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

function MathText({ value, className = '' }) {
  if (!value || !value.trim()) return <span className={className}>-</span>

  const stripped = stripLatexDelimitersForKatex(value)
  const normalized = normalizeLatex(stripped)
  const latexCandidate = looksLikeLatex(normalized) ? normalized : convertTextToLatex(normalized)

  if (!looksLikeLatex(latexCandidate)) {
    return <span className={className}>{stripped}</span>
  }

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
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

function AcademicQuestionCatalogPage() {
  const [rows, setRows] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [chapters, setChapters] = useState([])
  const [filters, setFilters] = useState({ classId: '', subjectId: '', chapterId: '' })
  const [isFilterLoading, setIsFilterLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [mathFieldSession, setMathFieldSession] = useState(0)
  /** New questions only: plain text by default; MathLive when on or after formula paste. */
  const [scientificEditor, setScientificEditor] = useState(false)

  const isMcq = useMemo(() => form.type === 'mcq', [form.type])
  const useFormulaEditor = scientificEditor
  /** MathLive: text mode for new prose-first; math mode when editing stored LaTeX so it renders (not literal `\text{}`). */
  const mathFieldDefaultMode = form.id ? 'math' : 'text'

  const classOptions = useMemo(
    () => classes.map((item) => ({ value: item.id, label: item.className })),
    [classes],
  )
  const subjectOptions = useMemo(
    () => subjects.map((item) => ({ value: item.id, label: item.subjectName })),
    [subjects],
  )
  const chapterOptions = useMemo(
    () =>
      chapters.map((item) => ({
        value: item.id,
        label: `${item.chapterNo}. ${item.chapterName}`,
      })),
    [chapters],
  )

  const selectedClassOption = useMemo(
    () => classOptions.find((option) => option.value === Number(filters.classId)) || null,
    [classOptions, filters.classId],
  )
  const selectedSubjectOption = useMemo(
    () => subjectOptions.find((option) => option.value === Number(filters.subjectId)) || null,
    [filters.subjectId, subjectOptions],
  )
  const selectedChapterOption = useMemo(
    () => chapterOptions.find((option) => option.value === Number(filters.chapterId)) || null,
    [chapterOptions, filters.chapterId],
  )
  const selectedFormChapterOption = useMemo(
    () => chapterOptions.find((option) => option.value === Number(form.chapterId)) || null,
    [chapterOptions, form.chapterId],
  )

  const loadFilters = useCallback(async () => {
    setIsFilterLoading(true)
    setError('')
    try {
      const [classData, subjectData] = await Promise.all([getAcademicClasses(), getAcademicSubjects()])
      setClasses(classData)
      setSubjects(subjectData)
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

  useEffect(() => {
    const loadChaptersForFilter = async () => {
      if (!filters.classId || !filters.subjectId) {
        setChapters([])
        setFilters((previous) => ({ ...previous, chapterId: '' }))
        setRows([])
        return
      }

      setIsFilterLoading(true)
      setError('')
      try {
        const chapterData = await getAcademicChapters()
        const scopedChapters = chapterData.filter(
          (item) => item.classId === Number(filters.classId) && item.subjectId === Number(filters.subjectId),
        )
        setChapters(scopedChapters)
        setFilters((previous) => ({
          ...previous,
          chapterId: scopedChapters.some((item) => item.id === Number(previous.chapterId))
            ? previous.chapterId
            : '',
        }))
        setRows([])
      } catch (requestError) {
        setError(requestError?.response?.data?.message || 'Unable to load chapters.')
      } finally {
        setIsFilterLoading(false)
      }
    }

    void loadChaptersForFilter()
  }, [filters.classId, filters.subjectId])

  useEffect(() => {
    const timerId = setTimeout(() => {
      void loadQuestionsByChapter(filters.chapterId)
    }, 0)
    return () => clearTimeout(timerId)
  }, [filters.chapterId, loadQuestionsByChapter])

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!String(form.descriptionText ?? '').trim()) {
      setError('Question text is required.')
      return
    }
    setIsSaving(true)
    setError('')
    const normalizedPayload = {
      id: form.id ? Number(form.id) : undefined,
      type: form.type,
      category: form.category,
      chapterId: Number(form.chapterId),
      descriptionText: convertTextToLatex(stripLatexDelimitersForKatex(form.descriptionText)),
      mcqOpt1: convertTextToLatex(stripLatexDelimitersForKatex(form.mcqOpt1)),
      mcqOpt2: convertTextToLatex(stripLatexDelimitersForKatex(form.mcqOpt2)),
      mcqOpt3: convertTextToLatex(stripLatexDelimitersForKatex(form.mcqOpt3)),
      mcqOpt4: convertTextToLatex(stripLatexDelimitersForKatex(form.mcqOpt4)),
    }

    const fieldsToValidate = [
      ['Description', normalizedPayload.descriptionText],
      ['Option A', normalizedPayload.mcqOpt1],
      ['Option B', normalizedPayload.mcqOpt2],
      ['Option C', normalizedPayload.mcqOpt3],
      ['Option D', normalizedPayload.mcqOpt4],
    ]

    for (const [label, value] of fieldsToValidate) {
      if (!value) continue
      const validationError = validateLatexText(value)
      if (validationError) {
        setError(`${label} has invalid LaTeX. ${validationError}`)
        setIsSaving(false)
        return
      }
    }

    setForm((previous) => ({
      ...previous,
      descriptionText: normalizedPayload.descriptionText,
      mcqOpt1: normalizedPayload.mcqOpt1,
      mcqOpt2: normalizedPayload.mcqOpt2,
      mcqOpt3: normalizedPayload.mcqOpt3,
      mcqOpt4: normalizedPayload.mcqOpt4,
    }))

    try {
      await upsertQuestionCatalog(normalizedPayload)
      await loadQuestionsByChapter(filters.chapterId || normalizedPayload.chapterId)
      setScientificEditor(false)
      setIsModalOpen(false)
      setForm(emptyForm)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Question save failed.')
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
    setScientificEditor(false)
    setForm({ ...emptyForm, chapterId: filters.chapterId })
    setMathFieldSession((session) => session + 1)
    setIsModalOpen(true)
  }

  const openEditModal = (item) => {
    setError('')
    const descriptionText = stripLatexDelimitersForKatex(normalizeLatex(item.descriptionText || ''))
    const mcqOpt1 = stripLatexDelimitersForKatex(normalizeLatex(item.mcqOpt1 || ''))
    const mcqOpt2 = stripLatexDelimitersForKatex(normalizeLatex(item.mcqOpt2 || ''))
    const mcqOpt3 = stripLatexDelimitersForKatex(normalizeLatex(item.mcqOpt3 || ''))
    const mcqOpt4 = stripLatexDelimitersForKatex(normalizeLatex(item.mcqOpt4 || ''))
    setForm({
      id: String(item.id),
      type: item.type,
      category: item.category,
      chapterId: String(item.chapterId),
      descriptionText,
      mcqOpt1,
      mcqOpt2,
      mcqOpt3,
      mcqOpt4,
    })
    setScientificEditor(
      [descriptionText, mcqOpt1, mcqOpt2, mcqOpt3, mcqOpt4].some((value) => fieldNeedsFormulaEditor(value)),
    )
    setMathFieldSession((session) => session + 1)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (isSaving) return
    setScientificEditor(false)
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

      <section className="mb-4 grid gap-3 md:grid-cols-3">
        <Select
          options={classOptions}
          value={selectedClassOption}
          onChange={(option) =>
            setFilters({ classId: option?.value ? String(option.value) : '', subjectId: '', chapterId: '' })
          }
          isClearable
          placeholder="Select class"
        />
        <Select
          options={subjectOptions}
          value={selectedSubjectOption}
          onChange={(option) => setFilters((p) => ({ ...p, subjectId: option?.value ? String(option.value) : '', chapterId: '' }))}
          isClearable
          isDisabled={!filters.classId}
          placeholder="Select subject"
        />
        <Select
          options={chapterOptions}
          value={selectedChapterOption}
          onChange={(option) => setFilters((p) => ({ ...p, chapterId: option?.value ? String(option.value) : '' }))}
          isClearable
          isDisabled={!filters.classId || !filters.subjectId || isFilterLoading}
          placeholder="Select chapter"
        />
      </section>

      <section className="max-h-[65vh] overflow-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[760px] border-collapse text-sm">
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
                    <span>Select class, subject, and chapter to load questions.</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="border border-slate-200 px-4 py-10 text-center text-slate-500">
                  No questions found.
                </td>
              </tr>
            ) : (
              rows.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="border border-slate-200 px-3 py-2.5">{index + 1}</td>
                  <td className="border border-slate-200 px-3 py-2.5 uppercase">{item.type}</td>
                  <td className="border border-slate-200 px-3 py-2.5 uppercase">{item.category}</td>
                  <td className="border border-slate-200 px-3 py-2.5">{item.chapterId}</td>
                  <td className="border border-slate-200 px-3 py-2.5 text-slate-700">
                    <div className="space-y-1.5">
                      <MathText value={item.descriptionText} className="block text-slate-800" />
                      {item.type === 'mcq' ? (
                        <div className="grid gap-1 text-xs text-slate-600">
                          <p>
                            <span className="mr-1 font-semibold">A)</span>
                            <MathText value={item.mcqOpt1} />
                          </p>
                          <p>
                            <span className="mr-1 font-semibold">B)</span>
                            <MathText value={item.mcqOpt2} />
                          </p>
                          {item.mcqOpt3 ? (
                            <p>
                              <span className="mr-1 font-semibold">C)</span>
                              <MathText value={item.mcqOpt3} />
                            </p>
                          ) : null}
                          {item.mcqOpt4 ? (
                            <p>
                              <span className="mr-1 font-semibold">D)</span>
                              <MathText value={item.mcqOpt4} />
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="border border-slate-200 px-3 py-2.5">
                    <div className="flex justify-end">
                      <div className="action-group">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="action-link action-link-success"
                        >
                          <Pencil size={14} />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="action-link action-link-danger"
                        >
                          {deletingId === item.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <div
        className={`fixed inset-0 z-[80] flex items-center justify-center p-4 transition-all duration-300 ${
          isModalOpen
            ? 'pointer-events-auto bg-slate-900/40 opacity-100 backdrop-blur-sm'
            : 'pointer-events-none bg-slate-900/0 opacity-0 backdrop-blur-0'
        }`}
      >
        <div
          className={`w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl transition-all duration-300 ${
            isModalOpen ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-95 opacity-0'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                {form.id ? 'Edit Question' : 'Add New Question'}
              </h3>
              <p className="mt-1 text-sm text-slate-500">Manage question metadata and content.</p>
            </div>
            <button
              type="button"
              onClick={closeModal}
              disabled={isSaving}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={onSubmit} className="mt-4 grid gap-3">
            <div className="grid gap-3 md:grid-cols-3">
              <select
                value={form.type}
                onChange={(event) => setForm((previous) => ({ ...previous, type: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="mcq">mcq</option>
                <option value="saq">saq</option>
                <option value="laq">laq</option>
              </select>
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

            {!form.id ? (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#405189] focus:ring-[#405189]"
                  checked={scientificEditor}
                  disabled={isSaving}
                  onChange={(event) => {
                    setScientificEditor(event.target.checked)
                    bumpMathFieldSession()
                  }}
                />
                <span>
                  <span className="font-medium text-slate-800">Scientific keyboard (formula editor)</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Turn on for visual math entry, MCQ formula fields, and the on-screen math keyboard (toolbar icon).
                    Paste LaTeX or math from another app to auto-enable this mode.
                  </span>
                </span>
              </label>
            ) : null}

            <div className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-700">Question text</span>
              {useFormulaEditor ? (
                <p className="text-xs text-slate-500">
                  Visual math entry; catalog still stores LaTeX. Use the keyboard icon to open the scientific keyboard.
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Plain text for non-math questions. Paste from a math source to switch to the formula editor
                  automatically.
                </p>
              )}
              {useFormulaEditor ? (
                <AcademicQuestionMathField
                  sessionKey={`${mathFieldSession}-desc`}
                  latexValue={form.descriptionText}
                  onLatexChange={(text) => setForm((previous) => ({ ...previous, descriptionText: text }))}
                  disabled={isSaving}
                  placeholder="Type your question; switch to math with toolbar or paste"
                  variant="question"
                  defaultMode={mathFieldDefaultMode}
                />
              ) : (
                <textarea
                  value={form.descriptionText}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, descriptionText: event.target.value }))
                  }
                  onPaste={handleQuestionPastePlain}
                  placeholder="Question text"
                  className="min-h-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              )}
            </div>

            {isMcq ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  {useFormulaEditor ? (
                    <>
                      <div className="grid gap-1">
                        <span className="text-xs font-medium text-slate-600">Option A</span>
                        <AcademicQuestionMathField
                          sessionKey={`${mathFieldSession}-o1`}
                          latexValue={form.mcqOpt1}
                          onLatexChange={(text) => setForm((previous) => ({ ...previous, mcqOpt1: text }))}
                          disabled={isSaving}
                          placeholder="Option A"
                          variant="option"
                          defaultMode={mathFieldDefaultMode}
                        />
                      </div>
                      <div className="grid gap-1">
                        <span className="text-xs font-medium text-slate-600">Option B</span>
                        <AcademicQuestionMathField
                          sessionKey={`${mathFieldSession}-o2`}
                          latexValue={form.mcqOpt2}
                          onLatexChange={(text) => setForm((previous) => ({ ...previous, mcqOpt2: text }))}
                          disabled={isSaving}
                          placeholder="Option B"
                          variant="option"
                          defaultMode={mathFieldDefaultMode}
                        />
                      </div>
                      <div className="grid gap-1">
                        <span className="text-xs font-medium text-slate-600">Option C</span>
                        <AcademicQuestionMathField
                          sessionKey={`${mathFieldSession}-o3`}
                          latexValue={form.mcqOpt3}
                          onLatexChange={(text) => setForm((previous) => ({ ...previous, mcqOpt3: text }))}
                          disabled={isSaving}
                          placeholder="Option C (optional)"
                          variant="option"
                          defaultMode={mathFieldDefaultMode}
                        />
                      </div>
                      <div className="grid gap-1">
                        <span className="text-xs font-medium text-slate-600">Option D</span>
                        <AcademicQuestionMathField
                          sessionKey={`${mathFieldSession}-o4`}
                          latexValue={form.mcqOpt4}
                          onLatexChange={(text) => setForm((previous) => ({ ...previous, mcqOpt4: text }))}
                          disabled={isSaving}
                          placeholder="Option D (optional)"
                          variant="option"
                          defaultMode={mathFieldDefaultMode}
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
                      />
                      <input
                        value={form.mcqOpt3}
                        onChange={(event) =>
                          setForm((previous) => ({ ...previous, mcqOpt3: event.target.value }))
                        }
                        onPaste={handleMcqPastePlain('mcqOpt3')}
                        placeholder="MCQ option 3"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        value={form.mcqOpt4}
                        onChange={(event) =>
                          setForm((previous) => ({ ...previous, mcqOpt4: event.target.value }))
                        }
                        onPaste={handleMcqPastePlain('mcqOpt4')}
                        placeholder="MCQ option 4"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </>
                  )}
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Options Preview
                  </p>
                  <div className="grid gap-1">
                    <p>
                      <span className="mr-1 font-semibold">A)</span>
                      <MathText value={form.mcqOpt1} />
                    </p>
                    <p>
                      <span className="mr-1 font-semibold">B)</span>
                      <MathText value={form.mcqOpt2} />
                    </p>
                    <p>
                      <span className="mr-1 font-semibold">C)</span>
                      <MathText value={form.mcqOpt3} />
                    </p>
                    <p>
                      <span className="mr-1 font-semibold">D)</span>
                      <MathText value={form.mcqOpt4} />
                    </p>
                  </div>
                </div>
              </>
            ) : null}

            <div className="mt-1 flex items-center justify-end gap-2">
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
