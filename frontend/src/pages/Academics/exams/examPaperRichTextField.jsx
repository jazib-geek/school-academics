import { useCallback, useEffect, useRef } from 'react'
import { Bold, Italic, Underline } from 'lucide-react'
import { isRichHtmlContent, sanitizeExamPaperRichHtml } from './examPaperRichTextUtils.js'

export function ExamPaperRichView({ value, className = '' }) {
  const raw = `${value ?? ''}`
  if (!raw.trim()) return null
  if (isRichHtmlContent(raw)) {
    return (
      <span
        className={`exam-paper-rich-html ${className}`.trim()}
        dangerouslySetInnerHTML={{ __html: sanitizeExamPaperRichHtml(raw) }}
      />
    )
  }
  return <span className={className}>{raw}</span>
}

const FONT_SIZE_OPTIONS = [
  { label: 'Small', px: 11 },
  { label: 'Normal', px: 13 },
  { label: 'Large', px: 15 },
  { label: 'X-Large', px: 17 },
]

function applyCommand(command, value = null) {
  try {
    document.execCommand('styleWithCSS', false, 'true')
    document.execCommand(command, false, value)
  } catch {
    /* ignore */
  }
}

function wrapSelectionWithFontSize(px) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const text = selection.toString()
  if (!text.trim()) return
  const html = `<span style="font-size:${px}px;font-family:Arial,Helvetica,sans-serif">${text}</span>`
  applyCommand('insertHTML', html)
}

export function examPaperRichHtmlToPlain(html) {
  if (!html || !`${html}`.includes('<')) return `${html || ''}`
  const div = document.createElement('div')
  div.innerHTML = sanitizeExamPaperRichHtml(html)
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim()
}

export default function ExamPaperRichTextField({
  value,
  onChange,
  className = '',
  editorClassName = '',
  minHeight = '4.5rem',
}) {
  const editorRef = useRef(null)
  const lastEmittedRef = useRef('')

  const syncFromEditor = useCallback(() => {
    const raw = editorRef.current?.innerHTML ?? ''
    const clean = sanitizeExamPaperRichHtml(raw)
    if (clean === lastEmittedRef.current) return
    lastEmittedRef.current = clean
    onChange?.(clean)
  }, [onChange])

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    const safe = sanitizeExamPaperRichHtml(value || '')
    if (el.innerHTML !== safe) {
      el.innerHTML = safe || ''
      lastEmittedRef.current = safe
    }
  }, [value])

  const toolbarButtonClass =
    'inline-flex h-7 min-w-7 items-center justify-center rounded border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50'

  return (
    <div className={`exam-paper-rich-field ${className}`.trim()}>
      <div
        className="print-hidden mb-1 flex flex-wrap items-center gap-1 rounded-t border border-b-0 border-indigo-200 bg-slate-50 px-1.5 py-1"
        onMouseDown={(event) => event.preventDefault()}
      >
        <button
          type="button"
          className={toolbarButtonClass}
          title="Bold"
          onClick={() => {
            editorRef.current?.focus()
            applyCommand('bold')
            syncFromEditor()
          }}
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          title="Italic"
          onClick={() => {
            editorRef.current?.focus()
            applyCommand('italic')
            syncFromEditor()
          }}
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          title="Underline"
          onClick={() => {
            editorRef.current?.focus()
            applyCommand('underline')
            syncFromEditor()
          }}
        >
          <Underline size={14} />
        </button>
        <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />
        {FONT_SIZE_OPTIONS.map((option) => (
          <button
            key={option.px}
            type="button"
            className={`${toolbarButtonClass} px-2 text-[10px]`}
            title={`${option.label} text`}
            onClick={() => {
              editorRef.current?.focus()
              wrapSelectionWithFontSize(option.px)
              syncFromEditor()
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        className={`exam-paper-rich-editor w-full resize-y overflow-auto rounded-b border border-indigo-200 bg-white px-2 py-1.5 text-[13px] leading-snug text-black outline-none focus:ring-2 focus:ring-indigo-200 ${editorClassName}`.trim()}
        style={{ minHeight }}
        onInput={syncFromEditor}
        onBlur={syncFromEditor}
        suppressContentEditableWarning
      />
    </div>
  )
}
