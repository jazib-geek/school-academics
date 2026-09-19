import { Loader2 } from 'lucide-react'

export default function TimetablePopupLoader({ open, text = 'Please wait…' }) {
  if (!open) return null

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
    >
      <div
        role="status"
        aria-live="polite"
        className="flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl bg-white px-6 py-7 text-center shadow-2xl ring-1 ring-slate-200"
      >
        <Loader2 size={34} className="animate-spin text-[var(--campus-primary)]" />
        <p className="text-base font-semibold text-slate-900">{text}</p>
      </div>
    </div>
  )
}
