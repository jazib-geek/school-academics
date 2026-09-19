import { useEffect, useRef } from 'react'
import { Bold, Italic, List, ListOrdered, Underline } from 'lucide-react'

/**
 * Lightweight HTML rich-text editor (contentEditable).
 * Value is HTML stored in news/announcement Description.
 */
export default function RichTextEditor({ value, onChange, disabled = false, placeholder = 'Write details…', className = '' }) {
  const ref = useRef(null)
  const lastHtml = useRef('')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const next = value || ''
    if (next !== lastHtml.current && next !== el.innerHTML) {
      el.innerHTML = next
      lastHtml.current = next
    }
  }, [value])

  const emit = () => {
    const el = ref.current
    if (!el) return
    const html = el.innerHTML
    lastHtml.current = html
    onChange?.(html)
  }

  const run = (command) => {
    if (disabled) return
    ref.current?.focus()
    document.execCommand(command, false)
    emit()
  }

  return (
    <div className={`overflow-hidden rounded-lg border border-slate-300 bg-white ${className}`}>
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        <ToolbarButton label="Bold" onClick={() => run('bold')} disabled={disabled}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => run('italic')} disabled={disabled}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Underline" onClick={() => run('underline')} disabled={disabled}>
          <Underline className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Bulleted list" onClick={() => run('insertUnorderedList')} disabled={disabled}>
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" onClick={() => run('insertOrderedList')} disabled={disabled}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder}
        className="min-h-[160px] max-h-[360px] overflow-y-auto px-3 py-2 text-sm text-slate-800 outline-none empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
      />
    </div>
  )
}

function ToolbarButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-40"
    >
      {children}
    </button>
  )
}
