export const CATALOG_PROFILE = Object.freeze({
  STANDARD: 'standard',
  ENGLISH: 'english',
  URDU: 'urdu',
})

const choiceItem = () => ({ text: '', options: ['', '', '', ''] })
const spellingRow = () => ({ options: ['', '', '', ''] })
const lineItem = () => ({ text: '', marked: '' })
const pairItem = () => ({ left: '', right: '' })
const passageItem = () => ({ label: '', text: '' })
const questionItem = () => ({ text: '' })

export const LANGUAGE_STRUCTURES = Object.freeze([
  {
    id: 'choice-set',
    label: 'Choices',
    defaultHeading: 'Choose the correct option.',
    profiles: ['english', 'urdu'],
    coarseType: 'mcq',
    empty: () => ({ items: [choiceItem()] }),
  },
  {
    id: 'spelling-table',
    label: 'Spelling table',
    defaultHeading: 'Choose the correct spelling.',
    profiles: ['english'],
    coarseType: 'mcq',
    empty: () => ({ rows: [spellingRow()] }),
  },
  {
    id: 'word-list',
    label: 'Word list',
    defaultHeading: 'Write meanings of these words.',
    profiles: ['english', 'urdu'],
    coarseType: 'laq',
    empty: () => ({ words: [''] }),
  },
  {
    id: 'fill-blanks',
    label: 'Fill in the blanks',
    defaultHeading: 'Fill in the blanks with suitable words.',
    profiles: ['english', 'urdu'],
    coarseType: 'laq',
    empty: () => ({ sentences: [''] }),
  },
  {
    id: 'classify-line',
    label: 'Marked word',
    defaultHeading: 'Tell whether the underlined noun is countable or uncountable.',
    profiles: ['english'],
    coarseType: 'laq',
    empty: () => ({ lines: [lineItem()] }),
  },
  {
    id: 'sentence-pair',
    label: 'Sentence pair',
    defaultHeading: 'Change the voice of the following.',
    profiles: ['english'],
    coarseType: 'laq',
    empty: () => ({ pairs: [pairItem()] }),
  },
  {
    id: 'passage-set',
    label: 'Passage',
    defaultHeading: 'Read the paragraph and answer the questions.',
    profiles: ['english', 'urdu'],
    coarseType: 'laq',
    empty: () => ({ passages: [passageItem()], questions: [] }),
  },
  {
    id: 'prompt',
    label: 'Writing task',
    defaultHeading: 'Write on the following topic.',
    profiles: ['english', 'urdu'],
    coarseType: 'laq',
    empty: () => ({ note: '' }),
  },
  {
    id: 'verse-set',
    label: 'Verse',
    defaultHeading: 'درج ذیل اشعار کی تشریح کیجیے۔',
    profiles: ['urdu'],
    coarseType: 'laq',
    empty: () => ({ heading: '', lines: [''], questions: [questionItem()] }),
  },
])

export function isLanguageProfile(profile) {
  return profile === CATALOG_PROFILE.ENGLISH || profile === CATALOG_PROFILE.URDU
}

export function kindsForProfile(profile) {
  return LANGUAGE_STRUCTURES.filter((item) => item.profiles.includes(profile))
}

export function findStructure(kind) {
  return LANGUAGE_STRUCTURES.find((item) => item.id === kind) || null
}

export function structureLabel(kind) {
  return findStructure(kind)?.label || 'Question'
}

const URDU_HEADING_DEFAULTS = Object.freeze({
  'choice-set': 'درست جواب کا انتخاب کریں۔',
  'passage-set': 'درج ذیل عبارت پڑھ کر سوالات کے جواب دیں۔',
  'word-list': 'درج ذیل الفاظ کے معانی لکھیں۔',
  'fill-blanks': 'خالی جگہ پُر کریں۔',
  prompt: 'درج ذیل عنوان پر تحریر لکھیں۔',
})

export function headingForKind(kind, savedMap, profile) {
  const saved = savedMap?.[kind]
  if (typeof saved === 'string' && saved.trim()) return saved.trim()
  if (profile === CATALOG_PROFILE.URDU && URDU_HEADING_DEFAULTS[kind]) return URDU_HEADING_DEFAULTS[kind]
  return findStructure(kind)?.defaultHeading || ''
}

export function coarseTypeForKind(kind) {
  return findStructure(kind)?.coarseType || 'laq'
}

export function isObjectiveLanguageKind(kind) {
  const coarse = coarseTypeForKind(kind)
  return coarse === 'mcq'
}

/** @param {unknown} examType @param {unknown} kind */
export function isLanguageKindAllowedForExam(examType, kind) {
  const normalized = `${examType || ''}`.trim().toLowerCase()
  const objective = normalized !== 'subjective'
  if (objective) return isObjectiveLanguageKind(kind)
  return !isObjectiveLanguageKind(kind)
}

export function languageKindsForExam(profile, examType) {
  return kindsForProfile(profile).filter((kind) => isLanguageKindAllowedForExam(examType, kind))
}

export function defaultMarksForLanguageBlock(kind, bodyJson) {
  const count = countExamItems(kind, parseBody(bodyJson))
  return Math.min(Math.max(count, 1), 100)
}

export function resolveLanguageBlockMarks(kind, bodyJson, storedMarks) {
  const fromItems = defaultMarksForLanguageBlock(kind, bodyJson)
  const stored = Number(storedMarks)
  if (kind === 'choice-set' || kind === 'spelling-table') return fromItems
  if (fromItems > 1) return fromItems
  if (Number.isFinite(stored) && stored > 0) return Math.min(stored, 100)
  return fromItems
}

export function countExamItems(kind, body) {
  const value = body || {}
  const list = (name) => (Array.isArray(value[name]) ? value[name] : [])
  const filled = (text) => `${text ?? ''}`.trim().length > 0
  switch (kind) {
    case 'choice-set':
      return list('items').filter((item) => filled(item?.text)).length
    case 'spelling-table':
      return list('rows').filter((row) => (row?.options || []).some((option) => filled(option))).length
    case 'word-list':
      return list('words').filter((word) => filled(word)).length
    case 'fill-blanks':
      return list('sentences').filter((sentence) => filled(sentence)).length
    case 'classify-line':
      return list('lines').filter((line) => filled(line?.text)).length
    case 'sentence-pair':
      return list('pairs').filter((pair) => filled(pair?.left) || filled(pair?.right)).length
    case 'passage-set':
      return Math.max(
        list('passages').filter((passage) => filled(passage?.text)).length,
        list('questions').filter((question) => filled(question?.text)).length,
        1,
      )
    case 'verse-set':
      return Math.max(
        list('lines').filter((line) => filled(line)).length,
        list('questions').filter((question) => filled(question?.text)).length,
        1,
      )
    case 'prompt':
      return 1
    default:
      return 1
  }
}

export function emptyBody(kind) {
  const structure = findStructure(kind)
  return structure ? structure.empty() : {}
}

export function parseBody(bodyJson) {
  if (!bodyJson) return null
  if (typeof bodyJson === 'object') return bodyJson
  try {
    const parsed = JSON.parse(bodyJson)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function filled(value) {
  return `${value || ''}`.trim().length > 0
}

export function summarizeBody(kind, body) {
  const value = body || {}
  const count = (list) => (Array.isArray(list) ? list.length : 0)
  switch (kind) {
    case 'choice-set':
      return `${count(value.items)} choices`
    case 'spelling-table':
      return `${count(value.rows)} rows`
    case 'word-list':
      return `${count(value.words)} words`
    case 'fill-blanks':
      return `${count(value.sentences)} sentences`
    case 'classify-line':
      return `${count(value.lines)} lines`
    case 'sentence-pair':
      return `${count(value.pairs)} pairs`
    case 'passage-set':
      return `${count(value.passages)} passages · ${count(value.questions)} questions`
    case 'verse-set':
      return `${count(value.lines)} lines · ${count(value.questions)} questions`
    case 'prompt':
      return 'Writing task'
    default:
      return ''
  }
}

export function validateLanguageBody(kind, body) {
  const value = body || {}
  const list = (name) => (Array.isArray(value[name]) ? value[name] : [])
  switch (kind) {
    case 'choice-set':
      return list('items').some(
        (item) => filled(item?.text) && (item?.options || []).filter((option) => filled(option)).length >= 2,
      )
        ? ''
        : 'Add at least one choice with two options.'
    case 'spelling-table':
      return list('rows').some((row) => (row?.options || []).filter((option) => filled(option)).length === 4)
        ? ''
        : 'Each spelling row needs four spellings.'
    case 'word-list':
      return list('words').some((word) => filled(word)) ? '' : 'Add at least one word.'
    case 'fill-blanks':
      return list('sentences').some((sentence) => filled(sentence)) ? '' : 'Add at least one sentence.'
    case 'classify-line':
      return list('lines').some((line) => filled(line?.text)) ? '' : 'Add at least one line.'
    case 'sentence-pair':
      return list('pairs').some((pair) => filled(pair?.left) && filled(pair?.right))
        ? ''
        : 'Add at least one pair of sentences.'
    case 'passage-set':
      return list('passages').some((passage) => filled(passage?.text)) ||
        list('questions').some((question) => filled(question?.text))
        ? ''
        : 'Add a passage or a question.'
    case 'verse-set':
      return list('lines').some((line) => filled(line)) || list('questions').some((question) => filled(question?.text))
        ? ''
        : 'Add a verse line or a question.'
    case 'prompt':
      return ''
    default:
      return 'Choose a question shape.'
  }
}

export function applyTextKey(value, keyValue) {
  const current = `${value || ''}`
  return keyValue === 'backspace' ? current.slice(0, -1) : `${current}${keyValue}`
}

export function applyBodyKey(body, path, keyValue) {
  const next = structuredClone(body || {})
  const parts = `${path || ''}`.split('.').filter(Boolean)
  if (!parts.length) return next
  let cursor = next
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index]
    const asIndex = Number(part)
    if (Array.isArray(cursor) && Number.isInteger(asIndex)) cursor = cursor[asIndex]
    else cursor = cursor?.[part]
    if (cursor == null) return next
  }
  const last = parts[parts.length - 1]
  const lastIndex = Number(last)
  if (Array.isArray(cursor) && Number.isInteger(lastIndex)) {
    cursor[lastIndex] = applyTextKey(cursor[lastIndex], keyValue)
  } else if (cursor && typeof cursor === 'object') {
    cursor[last] = applyTextKey(cursor[last], keyValue)
  }
  return next
}

export function setBodyValue(body, path, value) {
  const next = structuredClone(body || {})
  const parts = `${path || ''}`.split('.').filter(Boolean)
  if (!parts.length) return next
  let cursor = next
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index]
    const asIndex = Number(part)
    if (Array.isArray(cursor) && Number.isInteger(asIndex)) cursor = cursor[asIndex]
    else cursor = cursor?.[part]
    if (cursor == null) return next
  }
  const last = parts[parts.length - 1]
  const lastIndex = Number(last)
  if (Array.isArray(cursor) && Number.isInteger(lastIndex)) cursor[lastIndex] = value
  else if (cursor && typeof cursor === 'object') cursor[last] = value
  return next
}

function templateFor(arrayName, kind) {
  if (arrayName === 'items') return choiceItem()
  if (arrayName === 'rows') return spellingRow()
  if (arrayName === 'lines' && kind === 'classify-line') return lineItem()
  if (arrayName === 'lines') return ''
  if (arrayName === 'pairs') return pairItem()
  if (arrayName === 'passages') return passageItem()
  if (arrayName === 'questions') return questionItem()
  return ''
}

export function pushBodyItem(body, arrayName, kind) {
  const next = structuredClone(body || {})
  const list = Array.isArray(next[arrayName]) ? next[arrayName] : []
  next[arrayName] = [...list, templateFor(arrayName, kind)]
  return next
}

export function removeBodyItem(body, arrayName, index) {
  const next = structuredClone(body || {})
  const list = Array.isArray(next[arrayName]) ? next[arrayName] : []
  next[arrayName] = list.filter((_, itemIndex) => itemIndex !== index)
  return next
}
