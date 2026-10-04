import { Activity, BookOpenCheck, ClipboardList, ListTodo, UsersRound } from 'lucide-react'

export const PROFORMA_PAGE_SUBTITLES = {
  1: 'Planning/Execution Matters',
  2: 'Concerns, routine matters & tests',
  3: 'Oxygen Period & students’ checks',
  4: 'Notebook rechecking & class observation',
  5: 'Teacher follow-up & closing',
}

const PROFORMA_PAGE_ICONS = {
  1: ClipboardList,
  2: ListTodo,
  3: Activity,
  4: BookOpenCheck,
  5: UsersRound,
}

export function proformaPageSubtitle(page) {
  return PROFORMA_PAGE_SUBTITLES[page] || ''
}

export function proformaPageNumberFromGroup(group) {
  const match = /^Page (\d)$/.exec(String(group || ''))
  return match ? Number(match[1]) : undefined
}

export function proformaPageSubtitleFromGroup(group) {
  const page = proformaPageNumberFromGroup(group)
  return page ? proformaPageSubtitle(page) : String(group || '')
}

export const PROFORMA_PAGE_GROUPS = ['Page 1', 'Page 2', 'Page 3', 'Page 4', 'Page 5']

export default function ProformaPageHeading({ children, className = 'cw-proforma-heading', page }) {
  const pageNum = page ?? Number(Object.entries(PROFORMA_PAGE_SUBTITLES).find(([, title]) => title === children)?.[0])
  const Icon = PROFORMA_PAGE_ICONS[pageNum] || ClipboardList
  return (
    <h3 className={className}>
      <span className="cw-proforma-page-icon" aria-hidden="true">
        <Icon size={13} strokeWidth={2.25} />
      </span>
      <span className="cw-proforma-heading-text">{children}</span>
    </h3>
  )
}
