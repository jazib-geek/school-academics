import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronRight, Loader2, Search, X } from 'lucide-react'
import EmployeeSheetHeading from './EmployeeSheetHeading'

const tone = (value) => {
  if (['Satisfactory', 'Yes', 'Completed', 'All satisfactory', 'Good'].includes(value)) return 'good'
  if (['Needs attention', 'No', 'Not completed', 'Not corrected', 'Below average', 'Warning'].includes(value)) return 'attention'
  return 'neutral'
}

function ChoiceSheet({ label, options, value, onSelect, onClose, trigger, searchable, clearable, loading }) {
  const [query, setQuery] = useState('')
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const triggerElement = trigger.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; triggerElement?.focus({ preventScroll: true }) }
  }, [trigger])
  return createPortal(<dialog ref={ref} className="cw-choice-sheet" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose() }}>
    <header><EmployeeSheetHeading id={titleId}>{label}</EmployeeSheetHeading><button type="button" aria-label="Close choices" onClick={onClose}><X size={19} /></button></header>
    {searchable && <label className="cw-choice-search"><Search size={17} /><input aria-label={`Search ${label.toLowerCase()}`} placeholder="Search name or class…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>}
    <div className={searchable ? 'cw-choice-results' : 'cw-choice-options'}>{loading ? <p className="cw-choice-loading" role="status"><Loader2 size={20} className="cw-choice-loading-icon" aria-hidden="true" />Loading…</p> : <>{options.filter((option) => `${option.label} ${option.description || ''}`.toLowerCase().includes(query.trim().toLowerCase())).map((option) => <button autoFocus={!searchable && value === option.value} type="button" key={option.value} className={searchable ? 'cw-choice-result' : `cw-choice-pill cw-choice-${tone(option.label)}`} aria-pressed={value === option.value} onClick={() => onSelect(option.value)}><span>{option.label}{option.description && <small>{option.description}</small>}</span>{value === option.value && <Check size={15} aria-hidden="true" />}</button>)}{!options.some((option) => `${option.label} ${option.description || ''}`.toLowerCase().includes(query.trim().toLowerCase())) && <p className="cw-choice-empty">No matches. Try another name or class.</p>}</>}</div>
    {clearable && <button type="button" className="cw-choice-clear" onClick={() => onSelect('')}>Clear selection</button>}
  </dialog>, document.body)
}

export default function QuickChoiceField({ label, options, value, onChange, searchable = false, clearable = true, hideLabel = false, disabled = false, loading = false }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef(null)
  const labelId = useId()
  const items = options.map((option) => typeof option === 'string' ? { value: option, label: option } : option)
  const selected = items.find((option) => option.value === value)
  const showLoadingOnTrigger = loading && !value
  return <div className="cw-field"><span id={labelId} className={hideLabel ? 'sr-only' : undefined}>{label}</span><button ref={trigger} type="button" className="cw-choice-trigger" aria-labelledby={labelId} aria-haspopup="dialog" aria-expanded={open} aria-busy={loading || undefined} disabled={disabled} onClick={() => { if (!disabled) setOpen(true) }}><span className={value ? `cw-choice-value cw-choice-${tone(selected?.label || value)}` : 'cw-choice-placeholder'}>{showLoadingOnTrigger ? <span className="cw-choice-loading-inline"><Loader2 size={15} className="cw-choice-loading-icon" aria-hidden="true" />Loading…</span> : (selected?.label || value || 'Choose')}</span><ChevronRight size={15} aria-hidden="true" /></button>
    {open && <ChoiceSheet label={label} options={items} value={value} searchable={searchable} clearable={clearable} loading={loading} trigger={trigger} onClose={() => setOpen(false)} onSelect={(next) => { onChange(next); setOpen(false) }} />}
  </div>
}
