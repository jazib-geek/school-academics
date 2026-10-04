import { useEffect, useId, useState } from 'react'
import { BookOpen, BookCheck, CalendarDays, ChevronDown, ClipboardCheck, Clock3, FileText, GraduationCap, HeartHandshake, ListChecks, MessageCircle, NotebookPen, Send, ShieldCheck, Sunrise, Sunset, Users } from 'lucide-react'

const icons = { morning: Sunrise, dispatch: Send, activities: CalendarDays, priority: MessageCircle, criticalDiary: NotebookPen, parents: Users, routine: ListChecks, friday: CalendarDays, tests: ClipboardCheck, oxygen: MessageCircle, kaizen: GraduationCap, diary: BookOpen, notebooks: BookCheck, observation: NotebookPen, teachers: HeartHandshake, faculty: ShieldCheck, closing: Sunset, theme: CalendarDays, strength: Users, checks: ListChecks, schedule: Clock3 }

export default function ProformaAccordion({ title, sectionId, status, children, reveal = false }) {
  const [expanded, setExpanded] = useState(false)
  const id = useId()
  useEffect(() => { if (reveal) setExpanded(true) }, [reveal])
  const open = expanded
  const Icon = icons[sectionId] || FileText
  return <section className="cw-proforma-row cw-accordion" data-open={open}>
    <button type="button" className="cw-accordion-trigger" aria-expanded={open} aria-controls={id} onClick={() => setExpanded(!open)}>
      <span className={`cw-accordion-icon cw-accordion-icon-${sectionId}`}><Icon size={17} strokeWidth={1.8} aria-hidden="true" /></span>
      <strong>{title}</strong>{status && <small>{status}</small>}<ChevronDown className="cw-accordion-chevron" size={16} aria-hidden="true" />
    </button>
    <div className="cw-accordion-drawer" id={id} inert={!open ? true : undefined} aria-hidden={!open}>
      <div><div className="cw-accordion-content">{children}</div></div>
    </div>
  </section>
}
