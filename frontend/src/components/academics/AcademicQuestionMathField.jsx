import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import 'mathlive'
import 'mathlive/static.css'
import {
  applyAcademicQuestionKeyboardLayouts,
  restoreDefaultKeyboardLayouts,
} from './academicMathVirtualKeyboards'
import {
  looksLikeChemistryText,
  looksLikeScientificProseText,
  mathliveLatexToStorage,
  normalizePastedChemistryText,
  normalizePastedScientificProseText,
  storageLatexToMathlive,
} from './academicQuestionLatexUtils'

function toPlaceholderLatex(placeholder) {
  if (!placeholder?.trim()) return ''
  const t = placeholder.trim()
  if (t.startsWith('\\')) return t
  const safe = t.replace(/\\/g, '\\textbackslash{}').replace(/{/g, '\\{').replace(/}/g, '\\}')
  return `\\text{${safe}}`
}

function readStorageLatex(mf) {
  return mathliveLatexToStorage(mf.getValue('latex'))
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
 * Multi-line: MathLive `\displaylines` in the editor ↔ `\newline` in stored / KaTeX text.
 */
const AcademicQuestionMathField = forwardRef(function AcademicQuestionMathField(
  {
    sessionKey,
    latexValue,
    onLatexChange,
    disabled = false,
    placeholder = '',
    variant = 'question',
    defaultMode = 'text',
    smartMode = true,
    normalizeMathPaste = null,
    onFocusField = null,
  },
  ref,
) {
  const mfRef = useRef(null)
  const onLatexChangeRef = useRef(onLatexChange)
  const normalizeMathPasteRef = useRef(normalizeMathPaste)
  const onFocusFieldRef = useRef(onFocusField)

  useEffect(() => {
    onLatexChangeRef.current = onLatexChange
  }, [onLatexChange])

  useEffect(() => {
    normalizeMathPasteRef.current = normalizeMathPaste
  }, [normalizeMathPaste])

  useEffect(() => {
    onFocusFieldRef.current = onFocusField
  }, [onFocusField])

  useImperativeHandle(ref, () => ({
    insertLatex: (latex, options = {}) => {
      const mf = mfRef.current
      if (!mf || mf.readOnly) return
      mf.focus()

      let resolvedLatex = latex
      const hasSelection = mf.selection && mf.selectionIsCollapsed === false
      if (hasSelection && resolvedLatex === '\\frac{#?}{#?}') {
        resolvedLatex = '\\frac{#@}{#?}'
      }

      const hasPlaceholder = /#\?|#\d|#@|\\placeholder\b/.test(resolvedLatex)
      mf.insert(resolvedLatex, {
        mode: 'math',
        // Templates with □ keep caret inside; finished symbols (₂, x²) place caret after.
        selectionMode: hasPlaceholder ? 'placeholder' : 'after',
        ...options,
      })
      onLatexChangeRef.current?.(readStorageLatex(mf))
    },
    /** Insert a visual line break (MathLive multiline row). */
    insertLineBreak: () => {
      const mf = mfRef.current
      if (!mf || mf.readOnly) return
      mf.focus()
      mf.executeCommand?.('addRowAfter')
      onLatexChangeRef.current?.(readStorageLatex(mf))
    },
    /** Leave subscript / superscript / fraction box and continue typing normally. */
    exitScript: () => {
      const mf = mfRef.current
      if (!mf || mf.readOnly) return
      mf.focus()
      const commands = ['moveAfterParent', 'moveToNextChar', 'moveRight']
      for (const command of commands) {
        try {
          if (mf.executeCommand?.(command)) break
        } catch {
          // try next
        }
      }
      onLatexChangeRef.current?.(readStorageLatex(mf))
    },
    focus: () => mfRef.current?.focus(),
    getMathField: () => mfRef.current,
  }))

  useEffect(() => {
    const mf = mfRef.current
    if (!mf) return undefined

    const clean = storageLatexToMathlive(latexValue ?? '')
    mf.readOnly = disabled
    mf.placeholder = toPlaceholderLatex(placeholder) || '\\text{…}'
    mf.defaultMode = defaultMode
    mf.smartMode = smartMode
    mf.smartFence = true
    mf.smartSuperscript = true
    mf.mathVirtualKeyboardPolicy = 'manual'
    mf.setValue(clean, { silenceNotifications: true })

    const emitChange = () => {
      onLatexChangeRef.current?.(readStorageLatex(mf))
    }

    const onInput = () => emitChange()

    const onPaste = (event) => {
      const pasted = event.clipboardData?.getData('text')
      if (!pasted) return

      let normalizedPaste = ''
      if (looksLikeChemistryText(pasted)) {
        normalizedPaste = normalizePastedChemistryText(pasted)
      } else if (looksLikeScientificProseText(pasted)) {
        normalizedPaste = normalizePastedScientificProseText(pasted)
      } else if (typeof normalizeMathPasteRef.current === 'function') {
        normalizedPaste = normalizeMathPasteRef.current(pasted) || ''
      }

      if (!normalizedPaste) return
      event.preventDefault()
      mf.insert(storageLatexToMathlive(normalizedPaste), { mode: 'math' })
      emitChange()
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        try {
          mf.executeCommand?.('moveAfterParent')
        } catch {
          mf.executeCommand?.('moveToNextChar')
        }
        emitChange()
        return
      }
      // Enter → visual MathLive row (not literal \newline, which shows as pink $ \newline $).
      if (event.key !== 'Enter' || event.ctrlKey || event.metaKey || event.altKey) return
      event.preventDefault()
      event.stopPropagation()
      mf.executeCommand?.('addRowAfter')
      emitChange()
    }

    const onFocusIn = () => {
      applyAcademicQuestionKeyboardLayouts()
      onFocusFieldRef.current?.()
    }

    const onFocusOut = (event) => {
      // Keep Chem/Math layouts for the next catalog field; restore defaults when leaving all fields.
      const related = event.relatedTarget
      if (related && typeof related.closest === 'function' && related.closest('math-field')) return
      // Delay so focus moving to another math-field does not flash default layouts.
      window.setTimeout(() => {
        const active = document.activeElement
        if (active?.tagName?.toLowerCase() === 'math-field') return
        restoreDefaultKeyboardLayouts()
      }, 0)
    }

    mf.addEventListener('input', onInput)
    mf.addEventListener('paste', onPaste)
    mf.addEventListener('keydown', onKeyDown)
    mf.addEventListener('focusin', onFocusIn)
    mf.addEventListener('focusout', onFocusOut)
    return () => {
      mf.removeEventListener('input', onInput)
      mf.removeEventListener('paste', onPaste)
      mf.removeEventListener('keydown', onKeyDown)
      mf.removeEventListener('focusin', onFocusIn)
      mf.removeEventListener('focusout', onFocusOut)
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
    const next = storageLatexToMathlive(latexValue ?? '')
    if (mf.hasFocus()) return
    const current = storageLatexToMathlive(readStorageLatex(mf))
    if (current === next) return
    mf.setValue(next, { silenceNotifications: true })
  }, [latexValue])

  const minHeight = variant === 'option' ? '2.85rem' : '10rem'
  const fieldPaddingClass = variant === 'option' ? 'pl-2 pr-5' : 'px-2 pr-10'

  return (
    <div className="relative min-w-0 max-w-full">
      <math-field
        key={sessionKey}
        ref={mfRef}
        className={`academic-question-math-field academic-question-math-field--${variant} block w-full min-w-0 max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-white py-1.5 text-base shadow-inner outline-none ring-[#405189] focus-visible:ring-2 ${fieldPaddingClass}`}
        style={{ minHeight, maxWidth: '100%', overflowX: 'auto', ...MATHFIELD_SURFACE_VARS }}
      />
    </div>
  )
})

AcademicQuestionMathField.displayName = 'AcademicQuestionMathField'

export default AcademicQuestionMathField
