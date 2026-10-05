export const settingsInputClass =
  'h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition focus:border-[#405189] focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500'

export function SettingsCard({ title, description, aside, footer, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-slate-800">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
        </div>
        {aside}
      </header>
      <div className="px-5 py-4">{children}</div>
      {footer ? (
        <footer className="flex flex-wrap items-center justify-end gap-2 rounded-b-xl border-t border-slate-100 bg-slate-50/70 px-5 py-3">
          {footer}
        </footer>
      ) : null}
    </section>
  )
}

export function SettingsField({ label, hint, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[13px] font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  )
}

export function SettingsToggle({ name, checked, onChange, disabled, label, description }) {
  return (
    <label
      className={`flex items-start justify-between gap-4 py-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-slate-700">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-slate-500">{description}</span> : null}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className="peer sr-only"
        />
        <span className="h-5 w-9 rounded-full bg-slate-300 transition peer-checked:bg-[#405189] peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-200 peer-disabled:opacity-50" />
        <span className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
      </span>
    </label>
  )
}

export function SettingsSegmented({ options, value, onChange, disabled }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`relative inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition ${
              active ? 'bg-white text-[#405189] shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {opt.label}
            {opt.badge ? <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> : null}
          </button>
        )
      })}
    </div>
  )
}
