import { formulaToolbarGroups } from './academicMathVirtualKeyboards'

/**
 * Compact Chem / Math insert bar for the question catalog formula editor.
 * Inserts into the focused MathLive field via the parent callback.
 */
export default function AcademicFormulaInsertToolbar({
  disabled = false,
  onInsertLatex,
  onExitScript,
  onInsertLineBreak,
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-2 py-1.5">
      <div className="mb-1.5 flex flex-wrap items-center gap-1 border-b border-slate-200 pb-1.5">
        <button
          type="button"
          disabled={disabled}
          title="Leave subscript, superscript, or fraction box — then type the next word normally (or press Right Arrow)"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onExitScript?.()}
          className="min-h-6 rounded border border-[#405189]/40 bg-[#405189]/10 px-2 text-[11px] font-semibold text-[#405189] shadow-sm transition hover:bg-[#405189]/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Exit script
        </button>
        <button
          type="button"
          disabled={disabled}
          title="New line (same as Enter)"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onInsertLineBreak?.()}
          className="min-h-6 rounded border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-[#405189] hover:text-[#405189] disabled:cursor-not-allowed disabled:opacity-50"
        >
          ↵ Line break
        </button>
        <span className="text-[10px] text-slate-500">
          After a small number (₂ / ⁴) or fraction box, click Exit script or press → to type normally. Press Enter for a
          new line.
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {formulaToolbarGroups.map((group) => (
          <div key={group.id} className="flex flex-wrap items-center gap-1">
            <span className="mr-0.5 min-w-[2.5rem] shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {group.label}
            </span>
            {group.buttons.map((button) => (
              <button
                key={button.id}
                type="button"
                disabled={disabled}
                title={button.title}
                onMouseDown={(event) => {
                  // Keep focus on the math-field so insert targets the caret.
                  event.preventDefault()
                }}
                onClick={() => onInsertLatex?.(button.latex)}
                className="min-h-6 rounded border border-slate-300 bg-white px-1 text-[11px] font-medium leading-tight text-slate-700 shadow-sm transition hover:border-[#405189] hover:text-[#405189] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {button.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
