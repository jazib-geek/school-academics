const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'SPAN', 'BR', 'P', 'DIV'])

const ALLOWED_STYLE_PROPS = new Set(['font-size', 'font-family', 'font-weight', 'font-style', 'text-decoration'])

function sanitizeStyle(styleText) {
  if (!styleText) return ''
  const parts = `${styleText}`
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
  const kept = []
  parts.forEach((part) => {
    const [key, ...rest] = part.split(':')
    if (!key || !rest.length) return
    const prop = key.trim().toLowerCase()
    if (!ALLOWED_STYLE_PROPS.has(prop)) return
    const value = rest.join(':').trim()
    if (/javascript:/i.test(value)) return
    kept.push(`${prop}:${value}`)
  })
  return kept.join(';')
}

/**
 * Minimal allowlist sanitizer for print-only rich notes/headings (session state).
 */
export function sanitizeExamPaperRichHtml(html) {
  const input = `${html ?? ''}`.trim()
  if (!input) return ''
  if (!input.includes('<')) return input

  const template = document.createElement('template')
  template.innerHTML = input

  const walk = (node) => {
    ;[...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove()
        return
      }
      const tag = child.tagName
      if (!ALLOWED_TAGS.has(tag)) {
        const text = document.createTextNode(child.textContent || '')
        child.replaceWith(text)
        return
      }
      ;[...child.attributes].forEach((attr) => {
        if (attr.name === 'style') {
          const clean = sanitizeStyle(attr.value)
          if (clean) child.setAttribute('style', clean)
          else child.removeAttribute('style')
          return
        }
        child.removeAttribute(attr.name)
      })
      walk(child)
    })
  }

  walk(template.content)
  return template.innerHTML.trim()
}

export function isRichHtmlContent(value) {
  return Boolean(value && /<[a-z][\s\S]*>/i.test(value))
}

export function renderExamPaperRichContent(value) {
  const raw = `${value ?? ''}`
  if (!isRichHtmlContent(raw)) return raw
  return sanitizeExamPaperRichHtml(raw)
}

const SPACING_STEP_REM = 0.12
const BASE_QUESTION_GAP_REM = 0.32
const BASE_SECTION_GAP_REM = 0.3
const BASE_LAQ_PART_GAP_REM = 0.82

export function buildPrintSpacingStyle(spacing = {}) {
  const questionStep = Number(spacing.questionStep) || 0
  const sectionStep = Number(spacing.sectionStep) || 0
  const laqPartStep = Number(spacing.laqPartStep) || 0
  if (questionStep === 0 && sectionStep === 0 && laqPartStep === 0) return undefined

  return {
    '--exam-print-question-gap': `${Math.max(0.08, BASE_QUESTION_GAP_REM + questionStep * SPACING_STEP_REM)}rem`,
    '--exam-print-section-gap': `${Math.max(0.08, BASE_SECTION_GAP_REM + sectionStep * SPACING_STEP_REM)}rem`,
    '--exam-print-laq-part-gap': `${Math.max(0.08, BASE_LAQ_PART_GAP_REM + laqPartStep * SPACING_STEP_REM)}rem`,
  }
}

export function hasPrintSpacingTweaks(spacing) {
  if (!spacing) return false
  return (
    (Number(spacing.questionStep) || 0) !== 0 ||
    (Number(spacing.sectionStep) || 0) !== 0 ||
    (Number(spacing.laqPartStep) || 0) !== 0
  )
}

export const DEFAULT_EXAM_SECTION_FONT_PX = 13

export const EXAM_SECTION_FONT_SIZE_OPTIONS = [
  { label: 'Small', px: 11 },
  { label: 'Normal', px: 13 },
  { label: 'Large', px: 15 },
  { label: 'X-Large', px: 17 },
]

export function resolveSectionFontSizePx(sectionTweak) {
  const px = Number(sectionTweak?.fontSizePx)
  if (!Number.isFinite(px) || px <= 0) return DEFAULT_EXAM_SECTION_FONT_PX
  return px
}

export function sectionHasCustomFontSize(sectionTweak) {
  return sectionTweak?.fontSizePx != null && Number.isFinite(Number(sectionTweak.fontSizePx))
}

export function hasAnySectionFontTweak(sections) {
  if (!sections) return false
  return Object.values(sections).some((row) => sectionHasCustomFontSize(row))
}
