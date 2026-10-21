export const NOTE_COLORS = [
  { key: '', label: 'Plain', swatch: 'bg-white', card: 'bg-white ring-slate-200' },
  { key: 'yellow', label: 'Yellow', swatch: 'bg-amber-200', card: 'bg-amber-50 ring-amber-200' },
  { key: 'green', label: 'Green', swatch: 'bg-emerald-200', card: 'bg-emerald-50 ring-emerald-200' },
  { key: 'blue', label: 'Blue', swatch: 'bg-sky-200', card: 'bg-sky-50 ring-sky-200' },
  { key: 'pink', label: 'Pink', swatch: 'bg-rose-200', card: 'bg-rose-50 ring-rose-200' },
  { key: 'purple', label: 'Purple', swatch: 'bg-violet-200', card: 'bg-violet-50 ring-violet-200' },
  { key: 'orange', label: 'Orange', swatch: 'bg-orange-200', card: 'bg-orange-50 ring-orange-200' },
]

export function noteCardClass(color) {
  return (NOTE_COLORS.find((c) => c.key === (color || '')) || NOTE_COLORS[0]).card
}

export const KIND_OPTIONS = [
  { value: 'Reminder', label: 'Reminder' },
  { value: 'Todo', label: 'To-do' },
  { value: 'Note', label: 'Note' },
  { value: 'Instruction', label: 'Instruction' },
]

export const KIND_LABEL = Object.fromEntries(KIND_OPTIONS.map((k) => [k.value, k.label]))

export const KIND_BADGE = {
  Reminder: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  Todo: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  Note: 'bg-amber-50 text-amber-700 ring-amber-100',
  Instruction: 'bg-sky-50 text-sky-700 ring-sky-100',
}

export const PRIORITY_OPTIONS = [
  { value: 0, label: 'Normal' },
  { value: 1, label: 'High' },
  { value: 2, label: 'Urgent' },
]

export const PRIORITY_STRIPE = ['bg-slate-200', 'bg-amber-400', 'bg-rose-500']

export const STATUS_BADGE = {
  Pending: 'bg-amber-50 text-amber-700 ring-amber-100',
  Done: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  Dismissed: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export const STATUS_LABEL = {
  Pending: 'Pending',
  Done: 'Done',
  Dismissed: 'Seen',
}
