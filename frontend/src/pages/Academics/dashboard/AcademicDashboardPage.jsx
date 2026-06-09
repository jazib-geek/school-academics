import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BookCopy,
  FileOutput,
  FileQuestion,
  Layers,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Shapes,
  Sigma,
  Sparkles,
  Tags,
} from 'lucide-react'
import { getAcademicDashboard } from '../../../services/academicDashboardService'
import AcademicLayout from '../../../components/academics/AcademicLayout'

const CONTENT_SEGMENTS = [
  { key: 'classes', label: 'Classes', shortLabel: 'Cls', href: '/academics/settings/classes' },
  { key: 'subjects', label: 'Subjects', shortLabel: 'Sub', href: '/academics/settings/subjects' },
  { key: 'chapters', label: 'Chapters', shortLabel: 'Ch', href: '/academics/settings/chapters' },
  {
    key: 'questions',
    label: 'Questions',
    shortLabel: 'Q',
    href: '/academics/settings/question-catalog',
  },
  {
    key: 'questionPapers',
    label: 'Exam papers',
    shortLabel: 'Papers',
    href: '/academics/settings/exam-maker-compact',
  },
]

const CARD_THEME = [
  {
    key: 'classes',
    shell: 'border-indigo-100/90 bg-indigo-50/60 shadow-sm',
    iconWrap: 'bg-indigo-100/90 text-indigo-600',
    linkClass: 'text-indigo-700 hover:text-indigo-900',
    Icon: Shapes,
  },
  {
    key: 'subjects',
    shell: 'border-teal-100/90 bg-teal-50/50 shadow-sm',
    iconWrap: 'bg-teal-100/80 text-teal-700',
    linkClass: 'text-teal-800 hover:text-teal-950',
    Icon: Sigma,
  },
  {
    key: 'chapters',
    shell: 'border-amber-100/90 bg-amber-50/50 shadow-sm',
    iconWrap: 'bg-amber-100/80 text-amber-800',
    linkClass: 'text-amber-900 hover:text-amber-950',
    Icon: BookCopy,
  },
  {
    key: 'questionPapers',
    shell: 'border-sky-100/90 bg-sky-50/50 shadow-sm',
    iconWrap: 'bg-sky-100/80 text-sky-700',
    linkClass: 'text-sky-800 hover:text-sky-950',
    Icon: Layers,
  },
  {
    key: 'questions',
    shell: 'border-rose-100/90 bg-rose-50/40 shadow-sm',
    iconWrap: 'bg-rose-100/70 text-rose-700',
    linkClass: 'text-rose-800 hover:text-rose-950',
    Icon: FileQuestion,
  },
]

const QUICK_TILES = [
  {
    title: 'Curriculum tree',
    subtitle: 'Classes → subjects → chapters',
    href: '/academics/settings/classes',
    shell: 'border-slate-200/90 bg-white hover:border-indigo-200 hover:bg-indigo-50/30',
    iconWrap: 'bg-indigo-100/70 text-indigo-600',
    Icon: Shapes,
  },
  {
    title: 'Question catalog',
    subtitle: 'MCQs, shorts & boards',
    href: '/academics/settings/question-catalog',
    shell: 'border-slate-200/90 bg-white hover:border-rose-200 hover:bg-rose-50/25',
    iconWrap: 'bg-rose-100/70 text-rose-600',
    Icon: FileQuestion,
  },
  {
    title: 'Exam titles',
    subtitle: 'Types & naming patterns',
    href: '/academics/settings/exam-titles',
    shell: 'border-slate-200/90 bg-white hover:border-amber-200 hover:bg-amber-50/30',
    iconWrap: 'bg-amber-100/70 text-amber-700',
    Icon: Tags,
  },
  {
    title: 'Exam maker',
    subtitle: 'Build & preview papers',
    href: '/academics/settings/exam-maker-compact',
    shell: 'border-slate-200/90 bg-white hover:border-sky-200 hover:bg-sky-50/30',
    iconWrap: 'bg-sky-100/70 text-sky-700',
    Icon: FileOutput,
  },
]

const SEGMENT_META = Object.fromEntries(CONTENT_SEGMENTS.map((row) => [row.key, row]))

function AcademicDashboardPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({
    classes: 0,
    subjects: 0,
    chapters: 0,
    questionPapers: 0,
    questions: 0,
  })

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await getAcademicDashboard()
      setStats({
        classes: data?.classes || 0,
        subjects: data?.subjects || 0,
        chapters: data?.chapters || 0,
        questionPapers: data?.questionPapers || 0,
        questions: data?.questions || 0,
      })
    } catch {
      setError('Unable to load academic dashboard.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timerId = setTimeout(() => loadDashboard(), 0)
    return () => clearTimeout(timerId)
  }, [loadDashboard])

  const totalVolume = useMemo(
    () => CONTENT_SEGMENTS.reduce((acc, row) => acc + (stats[row.key] ?? 0), 0),
    [stats],
  )

  return (
    <AcademicLayout
      pageTitle="Academics dashboard"
      pageSubtitle="Shared academics: exams, datesheets, schedules, syllabuses, and weekly or monthly planning—aligned across campuses."
      pageIcon={<LayoutDashboard size={22} strokeWidth={2.2} />}
      pageActions={
        <button
          type="button"
          onClick={() => loadDashboard()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      }
    >
      <section className="mb-6 rounded-2xl border border-amber-200/90 bg-amber-50/80 px-4 py-3 text-sm text-amber-950/90 shadow-sm">
        <div className="flex gap-3">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" strokeWidth={2} aria-hidden />
          <div>
            <p className="font-semibold text-amber-950">Pre-alpha build</p>
            <p className="mt-1 leading-relaxed text-amber-950/85">
              Features and data flows are still changing. Bugs, broken workflows, or unexpected errors may
              appear—save important work elsewhere and let us know if something goes wrong.
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <section className="mb-6 rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3 text-sm text-rose-800/90 shadow-sm">
          {error}
        </section>
      ) : null}

      {isLoading ? (
        <section className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-100 bg-slate-50/40 p-16 shadow-sm">
          <Loader2 size={36} className="animate-spin text-slate-500" />
          <span className="text-sm font-semibold text-slate-600">Loading academics overview…</span>
        </section>
      ) : (
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-indigo-50/35 p-6 shadow-sm md:p-8">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-100/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 left-0 h-56 w-56 rounded-full bg-slate-200/20 blur-3xl" />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl space-y-3">
                <p className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-700/90 shadow-sm">
                  <Sparkles size={13} className="text-indigo-500/90" strokeWidth={2} />
                  Academic handling
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-800 md:text-[1.65rem]">
                  Exams, datesheets, schedules, syllabuses, and planning—one shared workspace
                </h2>
                
              </div>
              <div className="flex shrink-0 flex-wrap gap-3 md:justify-end">
                <div className="rounded-2xl border border-slate-200/90 bg-white/85 px-5 py-4 text-center shadow-sm backdrop-blur-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Catalog records
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-800">
                    {totalVolume.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/90 bg-white/85 px-5 py-4 text-center shadow-sm backdrop-blur-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Question items
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-800">
                    {(stats.questions || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {CARD_THEME.map(({ key, shell, iconWrap, linkClass, Icon }) => (
              <article
                key={key}
                className={`relative rounded-2xl border p-5 ${shell}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {SEGMENT_META[key]?.label}
                    </p>
                    <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-800">
                      {(stats[key] ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${iconWrap}`}>
                    <Icon size={20} strokeWidth={2} />
                  </div>
                </div>
                <Link
                  to={SEGMENT_META[key]?.href ?? '#'}
                  className={`mt-4 inline-flex items-center gap-1 text-xs font-semibold transition ${linkClass}`}
                >
                  Manage <ArrowRight size={14} strokeWidth={2} />
                </Link>
              </article>
            ))}
          </section>

          <section>
            <h3 className="mb-4 text-lg font-semibold text-slate-800">Jump to workspace</h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {QUICK_TILES.map(({ title, subtitle, href, shell, iconWrap, Icon }) => (
                <Link
                  key={href}
                  to={href}
                  className={`group rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${shell}`}
                >
                  <div
                    className={`mb-3 grid h-10 w-10 place-items-center rounded-xl transition ${iconWrap}`}
                  >
                    <Icon size={20} strokeWidth={2} />
                  </div>
                  <p className="text-base font-semibold text-slate-800">{title}</p>
                  <p className="mt-1 text-sm leading-snug text-slate-500">{subtitle}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 transition group-hover:text-slate-900">
                    Open <ArrowRight size={14} strokeWidth={2} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </AcademicLayout>
  )
}

export default AcademicDashboardPage
