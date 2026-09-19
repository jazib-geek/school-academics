/** Full-screen mobile-friendly loader; blocks interaction while an action runs. */
export default function EmployeeBlockingLoader({ open, message = 'Please wait…' }) {
  if (!open) return null

  return (
    <div
      className="emp-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="emp-modal-card w-full max-w-[17rem] rounded-2xl bg-white px-6 py-8 text-center shadow-2xl ring-1 ring-slate-200">
        <span className="emp-loader emp-loader-lg mx-auto block" aria-hidden="true" />
        <p className="mt-4 text-sm font-medium leading-snug text-slate-800">{message}</p>
      </div>
    </div>
  )
}
