import { breakLabel } from './timetableHelpers'

export default function TimetableBreakCell({ period, rowSpan, className = '' }) {
  return (
    <td
      rowSpan={rowSpan}
      className={`border border-slate-300 bg-slate-200/90 p-0 align-middle ${className}`}
    >
      <div
        className="flex min-h-14 w-full items-center justify-center px-1 py-2 text-center"
        aria-hidden
      >
        <span
          className="text-xs font-bold uppercase tracking-wide text-slate-600"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          {breakLabel(period)}
        </span>
      </div>
    </td>
  )
}
