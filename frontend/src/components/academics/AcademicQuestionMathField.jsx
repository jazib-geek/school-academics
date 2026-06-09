import { useEffect, useRef } from 'react'
import 'mathlive'
import 'mathlive/static.css'
import {
  looksLikeChemistryText,
  looksLikeScientificProseText,
  normalizePastedChemistryText,
  normalizePastedScientificProseText,
  stripLatexDelimitersForKatex,
} from './academicQuestionLatexUtils'

function toPlaceholderLatex(placeholder) {
  if (!placeholder?.trim()) return ''
  const t = placeholder.trim()
  if (t.startsWith('\\')) return t
  const safe = t.replace(/\\/g, '\\textbackslash{}').replace(/{/g, '\\{').replace(/}/g, '\\}')
  return `\\text{${safe}}`
}

/** Softer than MathLive default (light blue “contains caret” wash). */
const MATHFIELD_SURFACE_VARS = {
  '--hue': '215',
  '--contains-highlight-background-color': 'hsl(210 16% 97%)',
  '--text-highlight-background-color': 'hsla(215, 14%, 46%, 0.12)',
}

/**
 * WYSIWYG math: value in React is LaTeX; MathLive renders visually.
 * Use defaultMode "text" for prose-heavy questions; smart-mode still upgrades pasted/typed math.
 */
export default function AcademicQuestionMathField({
  sessionKey,
  latexValue,
  onLatexChange,
  disabled = false,
  placeholder = '',
  variant = 'question',
  defaultMode = 'text',
  smartMode = true,
}) {
  const mfRef = useRef(null)

  useEffect(() => {
    const mf = mfRef.current
    if (!mf) return undefined

    const clean = stripLatexDelimitersForKatex(latexValue ?? '')
    mf.readOnly = disabled
    mf.placeholder = toPlaceholderLatex(placeholder) || '\\text{…}'
    mf.defaultMode = defaultMode
    mf.smartMode = smartMode
    mf.smartFence = true
    mf.smartSuperscript = true
    mf.mathVirtualKeyboardPolicy = 'manual'
    mf.setValue(clean, { silenceNotifications: true })

    const onInput = () => {
      onLatexChange(stripLatexDelimitersForKatex(mf.getValue('latex')))
    }
    const onPaste = (event) => {
      const pasted = event.clipboardData?.getData('text')
      if (!pasted) return
      const normalizedPaste = looksLikeChemistryText(pasted)
        ? normalizePastedChemistryText(pasted)
        : looksLikeScientificProseText(pasted)
          ? normalizePastedScientificProseText(pasted)
          : ''
      if (!normalizedPaste) return
      event.preventDefault()
      mf.insert(normalizedPaste, { mode: 'math' })
      onLatexChange(stripLatexDelimitersForKatex(mf.getValue('latex')))
    }
    const onKeyDown = (event) => {
      if (event.key !== 'Enter' || event.ctrlKey || event.metaKey || event.altKey) return
      event.preventDefault()
      mf.insert('\\newline ', { mode: 'math' })
      onLatexChange(stripLatexDelimitersForKatex(mf.getValue('latex')))
    }
    mf.addEventListener('input', onInput)
    mf.addEventListener('paste', onPaste)
    mf.addEventListener('keydown', onKeyDown)
    return () => {
      mf.removeEventListener('input', onInput)
      mf.removeEventListener('paste', onPaste)
      mf.removeEventListener('keydown', onKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial bind per sessionKey only
  }, [sessionKey])

  useEffect(() => {
    const mf = mfRef.current
    if (!mf) return
    mf.readOnly = disabled
  }, [disabled])

  useEffect(() => {
    const mf = mfRef.current
    if (!mf) return
    mf.placeholder = toPlaceholderLatex(placeholder) || '\\text{…}'
  }, [placeholder])

  useEffect(() => {
    const mf = mfRef.current
    if (!mf) return
    mf.defaultMode = defaultMode
  }, [defaultMode])

  useEffect(() => {
    const mf = mfRef.current
    if (!mf) return
    mf.smartMode = smartMode
  }, [smartMode])

  useEffect(() => {
    const mf = mfRef.current
    if (!mf) return
    const next = stripLatexDelimitersForKatex(latexValue ?? '')
    if (mf.hasFocus()) return
    const current = stripLatexDelimitersForKatex(mf.getValue('latex'))
    if (current === next) return
    mf.setValue(next, { silenceNotifications: true })
  }, [latexValue])

  const minHeight = variant === 'option' ? '2.85rem' : '7.5rem'

  return (
    <div className="relative min-w-0 max-w-full">
      <math-field
        key={sessionKey}
        ref={mfRef}
        className="academic-question-math-field block w-full min-w-0 max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-white px-2 py-1.5 pr-10 text-base shadow-inner outline-none ring-[#405189] focus-visible:ring-2"
        style={{ minHeight, maxWidth: '100%', overflowX: 'auto', ...MATHFIELD_SURFACE_VARS }}
      />
    </div>
  )
}
