import katex from 'katex'
import { stripLatexDelimitersForKatex } from '../../../components/academics/academicQuestionLatexUtils.js'

export const looksLikeLatex = (value) =>
  /\\[a-zA-Z]+|(\^|_)\{?|\\frac|\\sqrt|\\theta|\\pi|\\ce\{/.test(value)

const normalizeLatex = (value) => `${value || ''}`.replaceAll('\\\\', '\\').trim()

const escapeLatexText = (value) =>
  `${value || ''}`
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\$/g, '\\$')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\^/g, '\\textasciicircum{}')

const shouldWrapProseRun = (mid) => {
  const trimmed = `${mid || ''}`.trim()
  if (!trimmed || !/[A-Za-z]/.test(trimmed)) return false
  if (/[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(trimmed)) return true
  if (/[A-Za-z]{3,}[.,:;!?]/.test(trimmed)) return true
  if (/^[A-Za-z][A-Za-z',.-]{3,}$/.test(trimmed)) return true
  return false
}

const consumeBraceGroup = (s, start) => {
  let depth = 0
  for (let i = start; i < s.length; i += 1) {
    if (s[i] === '{') depth += 1
    else if (s[i] === '}') {
      depth -= 1
      if (depth === 0) return i + 1
    }
  }
  return s.length
}

/** Fallback when the whole stem is TeX without $ delimiters. */
export const wrapPlainProseForKatex = (latex) => {
  const s = `${latex || ''}`
  if (!s.trim()) return s
  if (/\\(?:text|textrm|textsf|textit|textbf|textup|textmd)\s*\{/.test(s)) return s

  let out = ''
  let i = 0
  let prose = ''

  const flushProse = () => {
    if (!prose) return
    const englishLeadMatch = prose.match(/^(\s*(?:[A-Za-z][A-Za-z',.-]*[\s:;.!?]*)+)/)
    if (englishLeadMatch) {
      const leadRaw = englishLeadMatch[1]
      const rest = prose.slice(leadRaw.length)
      if (rest && /^\s*[\d(]/.test(rest) && shouldWrapProseRun(leadRaw)) {
        const trimmedLead = leadRaw.replace(/\s+$/, '')
        const gap = leadRaw.slice(trimmedLead.length)
        out += `\\text{${escapeLatexText(trimmedLead)}}${gap}${rest}`
        prose = ''
        return
      }
    }
    const lead = prose.match(/^\s*/)?.[0] || ''
    const trail = prose.match(/\s*$/)?.[0] || ''
    const mid = prose.slice(lead.length, prose.length - trail.length)
    if (shouldWrapProseRun(mid)) {
      out += `${lead}\\text{${escapeLatexText(mid)}}${trail}`
    } else {
      out += prose
    }
    prose = ''
  }

  while (i < s.length) {
    const ch = s[i]
    if (ch === '\\') {
      flushProse()
      if (i + 1 < s.length && /[^a-zA-Z]/.test(s[i + 1])) {
        out += s.slice(i, i + 2)
        i += 2
        continue
      }
      let j = i + 1
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j += 1
      if (s[j] === '*') j += 1
      out += s.slice(i, j)
      i = j
      while (i < s.length && (s[i] === '[' || s[i] === '{')) {
        if (s[i] === '[') {
          const end = s.indexOf(']', i)
          if (end === -1) {
            out += s.slice(i)
            i = s.length
            break
          }
          out += s.slice(i, end + 1)
          i = end + 1
        } else {
          const end = consumeBraceGroup(s, i)
          out += s.slice(i, end)
          i = end
        }
      }
      continue
    }
    if (ch === '{' || ch === '}') {
      flushProse()
      out += ch
      i += 1
      continue
    }
    if (ch === '^' || ch === '_') {
      flushProse()
      out += ch
      i += 1
      if (i < s.length && s[i] === '{') {
        const end = consumeBraceGroup(s, i)
        out += s.slice(i, end)
        i = end
      } else if (i < s.length) {
        out += s[i]
        i += 1
      }
      continue
    }
    prose += ch
    i += 1
  }
  flushProse()
  return out
}

/**
 * @returns {{ type: 'prose' | 'math', text: string }[]}
 */
export function tokenizeExamPaperMath(value) {
  const raw = `${value ?? ''}`
  if (!raw.trim()) return []

  const hasInlineDelimiters = /\$|\\\(|\\\[/.test(raw)
  if (!hasInlineDelimiters) {
    const stripped = stripLatexDelimitersForKatex(raw)
    const normalized = normalizeLatex(stripped)
    if (!looksLikeLatex(normalized)) {
      return [{ type: 'prose', text: stripped || raw }]
    }
    return [{ type: 'math', text: wrapPlainProseForKatex(normalized) }]
  }

  const segments = []
  let i = 0
  let proseStart = 0

  const pushProse = (end) => {
    if (end > proseStart) {
      segments.push({ type: 'prose', text: raw.slice(proseStart, end) })
    }
  }

  while (i < raw.length) {
    if (raw.startsWith('$$', i)) {
      pushProse(i)
      const end = raw.indexOf('$$', i + 2)
      if (end === -1) break
      segments.push({ type: 'math', text: normalizeLatex(raw.slice(i + 2, end)) })
      i = end + 2
      proseStart = i
      continue
    }
    if (raw[i] === '$') {
      pushProse(i)
      const end = raw.indexOf('$', i + 1)
      if (end === -1) {
        i += 1
        continue
      }
      segments.push({ type: 'math', text: normalizeLatex(raw.slice(i + 1, end)) })
      i = end + 1
      proseStart = i
      continue
    }
    if (raw.startsWith('\\(', i)) {
      pushProse(i)
      const end = raw.indexOf('\\)', i + 2)
      if (end === -1) break
      segments.push({ type: 'math', text: normalizeLatex(raw.slice(i + 2, end)) })
      i = end + 2
      proseStart = i
      continue
    }
    if (raw.startsWith('\\[', i)) {
      pushProse(i)
      const end = raw.indexOf('\\]', i + 2)
      if (end === -1) break
      segments.push({ type: 'math', text: normalizeLatex(raw.slice(i + 2, end)) })
      i = end + 2
      proseStart = i
      continue
    }
    i += 1
  }

  pushProse(raw.length)

  if (!segments.length) return [{ type: 'prose', text: raw }]
  return segments.filter((seg) => seg.text.length > 0)
}

function renderKatexFragment(latex) {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      strict: 'ignore',
      displayMode: false,
    })
  } catch {
    return null
  }
}

export default function ExamPaperMathText({ value, className = '' }) {
  if (!value || !`${value}`.trim()) return <span className={className}>-</span>

  const merged = `min-w-0 break-words ${className}`.trim()
  const segments = tokenizeExamPaperMath(value)

  if (segments.length === 1 && segments[0].type === 'prose') {
    return <span className={`exam-paper-math-prose ${merged}`}>{segments[0].text}</span>
  }

  return (
    <span className={merged}>
      {segments.map((seg, index) => {
        if (seg.type === 'prose') {
          return (
            <span key={index} className="exam-paper-math-prose">
              {seg.text}
            </span>
          )
        }
        const html = renderKatexFragment(seg.text)
        if (!html) {
          return (
            <span key={index} className="exam-paper-math-prose">
              {seg.text}
            </span>
          )
        }
        return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />
      })}
    </span>
  )
}
