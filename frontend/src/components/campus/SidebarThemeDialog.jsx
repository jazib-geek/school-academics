import { useState } from 'react'
import { Check, Home, Palette, RotateCcw, Users, Wallet, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  DEFAULT_SIDEBAR_THEME,
  presetsForMode,
  resetSidebarTheme,
  saveSidebarTheme,
  sidebarBackground,
  themeFromPreset,
  toCssVars,
} from '../../utils/sidebarTheme'

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

function ColorField({ label, value, onChange, allowEmpty = false, emptyLabel = 'None' }) {
  const [text, setText] = useState(value || '')
  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    setText(value || '')
  }

  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      {label}
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={HEX_PATTERN.test(value || '') ? value : '#ffffff'}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-slate-300 bg-white p-0.5"
        />
        <input
          type="text"
          value={text}
          placeholder={allowEmpty ? emptyLabel : '#000000'}
          maxLength={7}
          onChange={(event) => {
            const next = event.target.value.trim()
            setText(next)
            if (HEX_PATTERN.test(next)) onChange(next.toLowerCase())
            else if (allowEmpty && !next) onChange('')
          }}
          className="h-9 w-full min-w-0 rounded-md border border-slate-300 px-2 text-sm font-normal normal-case text-slate-700 outline-none focus:border-indigo-400"
        />
        {allowEmpty && value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="shrink-0 rounded-md px-2 py-1 text-xs font-medium normal-case text-slate-500 hover:bg-slate-100"
          >
            Clear
          </button>
        ) : null}
      </div>
    </label>
  )
}

function StrengthField({ label, value, onChange }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      {label} <span className="font-normal normal-case text-slate-400">{value}%</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-indigo-600"
      />
    </label>
  )
}

function SidebarPreview({ theme }) {
  const rows = [
    { label: 'Dashboard', icon: Home, iconClass: 'text-emerald-500', active: true },
    { label: 'Students', icon: Users, iconClass: 'text-sky-500' },
    { label: 'Fee', icon: Wallet, iconClass: 'text-amber-500' },
  ]
  return (
    <div
      style={{ ...toCssVars(theme), background: 'var(--sb-bg)' }}
      className="overflow-hidden rounded-xl text-[color:var(--sb-text)] shadow-inner"
    >
      <div className="border-b border-[color:var(--sb-border)] px-4 py-3">
        <p className="text-sm font-semibold text-[color:var(--sb-active-text)]">Softelligent</p>
        <p className="text-[11px] text-[color:var(--sb-muted)]">School Suite</p>
      </div>
      <div className="space-y-1 p-2 text-[13px]">
        {rows.map((row) => {
          const Icon = row.icon
          return (
            <div
              key={row.label}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${
                row.active
                  ? 'bg-[color:var(--sb-active-bg)] font-medium text-[color:var(--sb-active-text)]'
                  : ''
              }`}
            >
              <Icon size={14} className={theme.iconColor ? 'text-[color:var(--sb-icon)]' : row.iconClass} />
              {row.label}
            </div>
          )
        })}
        <div className="flex items-center gap-2.5 rounded-lg bg-[color:var(--sb-hover-bg)] px-3 py-2">
          <span className="h-3.5 w-3.5" />
          <span className="text-[color:var(--sb-text)]">Hovered item</span>
        </div>
        <div className="space-y-0.5 pl-9 text-xs">
          <p className="rounded-md px-2 py-1 text-[color:var(--sb-muted)]">Sub menu item</p>
          <p className="rounded-md bg-[color:var(--sb-active-bg)] px-2 py-1 text-[color:var(--sb-active-text)]">
            Selected sub item
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SidebarThemeDialog({ initialTheme, onPreview, onClose, onSaved }) {
  const [draft, setDraft] = useState(initialTheme)

  const apply = (next) => {
    setDraft(next)
    onPreview(next)
  }

  const update = (patch) => apply({ ...draft, ...patch, presetId: 'custom' })

  const onSave = () => {
    saveSidebarTheme(draft)
    toast.success('Theme saved on this device.')
    onSaved()
  }

  const onReset = () => {
    resetSidebarTheme()
    apply({ ...DEFAULT_SIDEBAR_THEME })
    toast.success('Theme set back to default.')
  }

  const isGradient = draft.mode === 'gradient'
  const presets = presetsForMode(draft.mode)

  const onModeChange = (mode) => {
    if (mode === draft.mode) return
    const match = presetsForMode(mode).find((preset) => preset.id === draft.presetId)
    if (match) {
      apply(themeFromPreset(match))
      return
    }
    update(mode === 'gradient' && !draft.bg2 ? { mode, bg2: draft.bg } : { mode })
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sidebar-theme-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#405189] text-white">
              <Palette size={18} />
            </div>
            <div>
              <h2 id="sidebar-theme-title" className="text-lg font-bold text-slate-900">
                Theme settings
              </h2>
              <p className="text-sm text-slate-500">
                Changes the colors of the side menu, table headings and page title icons. Saved on this device only.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-5 py-5 md:grid-cols-[1fr_15rem]">
          <div className="space-y-5">
            <div className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm font-medium">
              {['solid', 'gradient'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onModeChange(mode)}
                  className={`flex-1 rounded-lg px-4 py-1.5 capitalize transition ${
                    draft.mode === mode ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">{isGradient ? 'Gradient styles' : 'Solid styles'}</h3>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 md:grid-cols-4 lg:grid-cols-8">
                {presets.map((preset) => {
                  const selected = draft.presetId === preset.id
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      title={preset.name}
                      onClick={() => apply(themeFromPreset(preset))}
                      className="group flex flex-col items-center gap-1"
                    >
                      <span
                        style={{ background: sidebarBackground(preset) }}
                        className={`relative grid h-11 w-full place-items-center rounded-lg border shadow-sm transition ${
                          selected ? 'border-indigo-500 ring-2 ring-indigo-400' : 'border-slate-200 group-hover:scale-105'
                        }`}
                      >
                        <span className="text-[10px] font-bold" style={{ color: preset.text }}>
                          Aa
                        </span>
                        {selected ? (
                          <Check size={12} className="absolute right-1 top-1 rounded-full bg-indigo-600 p-0.5 text-white" />
                        ) : null}
                      </span>
                      <span className="w-full truncate text-center text-[10px] text-slate-500">{preset.name}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Background</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <ColorField label={isGradient ? 'Color 1' : 'Color'} value={draft.bg} onChange={(bg) => update({ bg })} />
                {isGradient ? (
                  <>
                    <ColorField label="Color 2" value={draft.bg2} onChange={(bg2) => update({ bg2 })} />
                    <ColorField
                      label="Color 3"
                      value={draft.bg3}
                      onChange={(bg3) => update({ bg3 })}
                      allowEmpty
                      emptyLabel="Optional"
                    />
                  </>
                ) : null}
              </div>
              {isGradient ? (
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Direction <span className="font-normal normal-case text-slate-400">{draft.angle}°</span>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={draft.angle}
                    onChange={(event) => update({ angle: Number(event.target.value) })}
                    className="mt-2 w-full accent-indigo-600"
                  />
                </label>
              ) : null}
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Text</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <ColorField label="Menu text" value={draft.text} onChange={(text) => update({ text })} />
                <ColorField label="Sub menu text" value={draft.mutedText} onChange={(mutedText) => update({ mutedText })} />
                <ColorField label="Selected text" value={draft.activeText} onChange={(activeText) => update({ activeText })} />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Highlight</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <ColorField label="Selected item" value={draft.activeBg} onChange={(activeBg) => update({ activeBg })} />
                <StrengthField label="Strength" value={draft.activeAlpha} onChange={(activeAlpha) => update({ activeAlpha })} />
                <ColorField label="Hover" value={draft.hoverBg} onChange={(hoverBg) => update({ hoverBg })} />
                <StrengthField label="Strength" value={draft.hoverAlpha} onChange={(hoverAlpha) => update({ hoverAlpha })} />
                <ColorField label="Dividers" value={draft.border} onChange={(border) => update({ border })} />
                <StrengthField label="Strength" value={draft.borderAlpha} onChange={(borderAlpha) => update({ borderAlpha })} />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Icons</h3>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={!draft.iconColor}
                  onChange={(event) => update({ iconColor: event.target.checked ? '' : draft.text })}
                  className="h-4 w-4 accent-indigo-600"
                />
                Keep colorful icons
              </label>
              {draft.iconColor ? (
                <div className="sm:w-1/2">
                  <ColorField label="Icon color" value={draft.iconColor} onChange={(iconColor) => update({ iconColor: iconColor || draft.text })} />
                </div>
              ) : null}
            </section>
          </div>

          <div className="md:sticky md:top-0 md:self-start">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Preview</h3>
            <SidebarPreview theme={draft} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200/60"
          >
            <RotateCcw size={15} />
            Reset to default
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className="inline-flex items-center gap-2 rounded-lg bg-[#405189] px-4 py-2 text-sm font-semibold text-white hover:bg-[#344574]"
            >
              <Check size={16} />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
