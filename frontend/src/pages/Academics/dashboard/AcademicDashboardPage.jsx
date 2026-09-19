import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookCopy,
  CheckCircle2,
  CircleAlert,
  FileOutput,
  FileQuestion,
  Layers,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Shapes,
  Sigma,
  Tags,
} from 'lucide-react'
import { getAcademicDashboard } from '../../../services/academicDashboardService'
import AcademicLayout from '../../../components/academics/AcademicLayout'

const WORKFLOW_STEPS = [
  {
    key: 'curriculum',
    title: 'Curriculum',
    description: 'Define classes, subjects, and chapters—the structure every campus shares.',
    href: '/academics/settings/classes',
    cta: 'Open curriculum',
    shell: 'border-indigo-100/90 bg-indigo-50/40',
    iconWrap: 'bg-indigo-100/90 text-indigo-600',
    Icon: Shapes,
    buildSummary: (data) => {
      const parts = [
        data.classes ? `${data.classes} class${data.classes === 1 ? '' : 'es'}` : null,
        data.subjects ? `${data.subjects} subject${data.subjects === 1 ? '' : 's'}` : null,
        data.chapters ? `${data.chapters} chapter${data.chapters === 1 ? '' : 's'}` : null,
      ].filter(Boolean)
      return parts.length ? parts.join(' · ') : 'Nothing set up yet'
    },
  },
  {
    key: 'questions',
    title: 'Question bank',
    description: 'Build MCQs, short answers, and long questions tied to chapters.',
    href: '/academics/settings/question-catalog',
    cta: 'Browse catalog',
    shell: 'border-rose-100/90 bg-rose-50/35',
    iconWrap: 'bg-rose-100/70 text-rose-700',
    Icon: FileQuestion,
    buildSummary: (data) => {
      const total = data.questions || 0
      if (!total) return 'No questions yet'
      const { mcq = 0, saq = 0, laq = 0, numerical = 0 } = data.questionBreakdown || {}
      const breakdown = [
        mcq ? `${mcq} MCQ` : null,
        saq ? `${saq} SAQ` : null,
        laq ? `${laq} LAQ` : null,
        numerical ? `${numerical} Numerical` : null,
      ].filter(Boolean)
      return breakdown.length ? `${total.toLocaleString()} total (${breakdown.join(' · ')})` : `${total.toLocaleString()} questions`
    },
  },
  {
    key: 'exams',
    title: 'Exam papers',
    description: 'Configure exam titles, assemble papers, and print ready-to-use sheets.',
    href: '/academics/settings/exam-maker-compact',
    cta: 'Open exam maker',
    shell: 'border-sky-100/90 bg-sky-50/40',
    iconWrap: 'bg-sky-100/80 text-sky-700',
    Icon: FileOutput,
    buildSummary: (data) => {
      const papers = data.questionPapers || 0
      const titles = data.examTitles || 0
      if (!papers && !titles) return 'No papers or titles yet'
      const parts = [
        papers ? `${papers} paper${papers === 1 ? '' : 's'}` : null,
        titles ? `${titles} exam title${titles === 1 ? '' : 's'}` : null,
      ].filter(Boolean)
      return parts.join(' · ')
    },
  },
]

const QUICK_LINKS = [
  {
    title: 'Subjects',
    subtitle: 'Shared subject list',
    href: '/academics/settings/subjects',
    Icon: Sigma,
    iconWrap: 'bg-teal-100/70 text-teal-700',
  },
  {
    title: 'Chapters',
    subtitle: 'Per class & subject',
    href: '/academics/settings/chapters',
    Icon: BookCopy,
    iconWrap: 'bg-amber-100/70 text-amber-800',
  },
  {
    title: 'Exam titles',
    subtitle: 'Naming & types',
    href: '/academics/settings/exam-titles',
    Icon: Tags,
    iconWrap: 'bg-violet-100/70 text-violet-700',
  },
  {
    title: 'Institute settings',
    subtitle: 'Logo & branding',
    href: '/academics/settings/institute',
    Icon: Layers,
    iconWrap: 'bg-slate-100 text-slate-600',
  },
]

const EMPTY_DASHBOARD = {
  classes: 0,
  subjects: 0,
  chapters: 0,
  questionPapers: 0,
  questions: 0,
  examTitles: 0,
  chaptersWithoutQuestions: 0,
  questionBreakdown: { mcq: 0, saq: 0, laq: 0, numerical: 0 },
  recentPapers: [],
}

function formatShortDate(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatExamType(value) {
  if (!value) return ''
  const normalized = `${value}`.trim().toLowerCase()
  if (normalized === 'subjective') return 'Subjective'
  if (normalized === 'objective') return 'Objective'
  return value
}

function buildSetupHints(data) {
  const hints = []

  if (!data.classes) {
    hints.push({
      tone: 'action',
      message: 'Add your first class to start building the shared curriculum.',
      href: '/academics/settings/classes',
      label: 'Add classes',
    })
  } else if (!data.chapters) {
    hints.push({
      tone: 'action',
      message: 'Classes exist but no chapters yet—link subjects to classes with chapter lists.',
      href: '/academics/settings/chapters',
      label: 'Add chapters',
    })
  }

  if (data.chapters && !data.questions) {
    hints.push({
      tone: 'action',
      message: 'Chapters are ready. Start adding questions to the catalog.',
      href: '/academics/settings/question-catalog',
      label: 'Open question catalog',
    })
  }

  if (data.chaptersWithoutQuestions > 0) {
    hints.push({
      tone: 'warn',
      message: `${data.chaptersWithoutQuestions} chapter${data.chaptersWithoutQuestions === 1 ? '' : 's'} still ha${data.chaptersWithoutQuestions === 1 ? 's' : 've'} no questions.`,
      href: '/academics/settings/question-catalog',
      label: 'Review catalog',
    })
  }

  if (data.questions > 0 && !data.questionPapers) {
    hints.push({
      tone: 'action',
      message: 'You have questions in the bank—create your first exam paper in the exam maker.',
      href: '/academics/settings/exam-maker-compact',
      label: 'Create a paper',
    })
  }

  if (!data.examTitles && data.questionPapers === 0) {
    hints.push({
      tone: 'neutral',
      message: 'Define exam titles (Monthly Test, Mid Term, etc.) before assembling papers.',
      href: '/academics/settings/exam-titles',
      label: 'Manage exam titles',
    })
  }

  return hints
}

function AcademicDashboardPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD)

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await getAcademicDashboard()
      setDashboard({
        ...EMPTY_DASHBOARD,
        ...data,
        questionBreakdown: {
          ...EMPTY_DASHBOARD.questionBreakdown,
          ...(data?.questionBreakdown || {}),
        },
        recentPapers: Array.isArray(data?.recentPapers) ? data.recentPapers : [],
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

  const setupHints = useMemo(() => buildSetupHints(dashboard), [dashboard])
  const isFreshWorkspace =
    !dashboard.classes &&
    !dashboard.subjects &&
    !dashboard.chapters &&
    !dashboard.questions &&
    !dashboard.questionPapers

  return (
    <AcademicLayout
      pageTitle="Academics dashboard"
      pageSubtitle="Shared curriculum, question bank, and exam papers used across all campuses."
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
      {error ? (
        <section className="mb-6 rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3 text-sm text-rose-800/90 shadow-sm">
          {error}
        </section>
      ) : null}

      {isLoading ? (
        <section className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-100 bg-slate-50/40 p-16 shadow-sm">
          <Loader2 size={36} className="animate-spin text-slate-500" />
          <span className="text-sm font-semibold text-slate-600">Loading workspace overview…</span>
        </section>
      ) : (
        <div className="space-y-6">
          {isFreshWorkspace ? (
            <section className="rounded-3xl border border-indigo-100/90 bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 p-6 shadow-sm md:p-8">
              <h2 className="text-xl font-semibold tracking-tight text-slate-800 md:text-2xl">
                Set up shared academics in three steps
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                Build the curriculum tree first, fill the question bank, then assemble exam papers—all
                campuses pull from the same catalog.
              </p>
              <ol className="mt-6 grid gap-3 md:grid-cols-3">
                {WORKFLOW_STEPS.map((step, index) => (
                  <li
                    key={step.key}
                    className="rounded-2xl border border-white/80 bg-white/70 px-4 py-4 shadow-sm"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                      Step {index + 1}
                    </span>
                    <p className="mt-1 font-semibold text-slate-800">{step.title}</p>
                    <p className="mt-1 text-sm leading-snug text-slate-500">{step.description}</p>
                  </li>
                ))}
              </ol>
              <Link
                to="/academics/settings/classes"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Start with classes <ArrowRight size={16} strokeWidth={2} />
              </Link>
            </section>
          ) : null}

          {setupHints.length > 0 ? (
            <section className="space-y-2">
              {setupHints.map((hint) => (
                <article
                  key={`${hint.tone}-${hint.message}`}
                  className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between ${
                    hint.tone === 'warn'
                      ? 'border-amber-200/90 bg-amber-50/70 text-amber-950'
                      : hint.tone === 'action'
                        ? 'border-indigo-100/90 bg-indigo-50/50 text-indigo-950'
                        : 'border-slate-200/90 bg-slate-50/80 text-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {hint.tone === 'warn' ? (
                      <CircleAlert size={18} className="mt-0.5 shrink-0 text-amber-600" strokeWidth={2} />
                    ) : (
                      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-indigo-500" strokeWidth={2} />
                    )}
                    <p className="leading-relaxed">{hint.message}</p>
                  </div>
                  <Link
                    to={hint.href}
                    className="inline-flex shrink-0 items-center gap-1 font-semibold text-inherit underline-offset-2 hover:underline"
                  >
                    {hint.label} <ArrowRight size={14} strokeWidth={2} />
                  </Link>
                </article>
              ))}
            </section>
          ) : null}

          <section>
            <h3 className="mb-4 text-lg font-semibold text-slate-800">Your workspace</h3>
            <div className="grid gap-4 lg:grid-cols-3">
              {WORKFLOW_STEPS.map(({ key, title, description, href, cta, shell, iconWrap, Icon, buildSummary }) => (
                <article key={key} className={`rounded-2xl border p-5 shadow-sm ${shell}`}>
                  <div className="flex items-start gap-3">
                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${iconWrap}`}>
                      <Icon size={20} strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-slate-800">{title}</h4>
                      <p className="mt-1 text-sm leading-snug text-slate-600">{description}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm font-medium text-slate-700">{buildSummary(dashboard)}</p>
                  <Link
                    to={href}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-800 transition hover:text-slate-950"
                  >
                    {cta} <ArrowRight size={14} strokeWidth={2} />
                  </Link>
                </article>
              ))}
            </div>
          </section>

          {dashboard.recentPapers.length > 0 ? (
            <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Recent exam papers</h3>
                  <p className="text-sm text-slate-500">Pick up where you left off in the exam maker.</p>
                </div>
                <Link
                  to="/academics/settings/exam-maker-compact"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700 hover:text-sky-900"
                >
                  Open exam maker <ArrowRight size={14} strokeWidth={2} />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Paper</th>
                      <th className="px-5 py-3">Class</th>
                      <th className="px-5 py-3">Subject</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Marks</th>
                      <th className="px-5 py-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dashboard.recentPapers.map((paper) => (
                      <tr key={paper.id} className="text-slate-700">
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-800">{paper.paperName || 'Untitled'}</p>
                          {paper.examTitle ? (
                            <p className="mt-0.5 text-xs text-slate-500">{paper.examTitle}</p>
                          ) : null}
                        </td>
                        <td className="px-5 py-3">{paper.className || '—'}</td>
                        <td className="px-5 py-3">{paper.subjectName || '—'}</td>
                        <td className="px-5 py-3">{formatExamType(paper.examType) || '—'}</td>
                        <td className="px-5 py-3 tabular-nums">
                          {paper.totalMarks != null ? paper.totalMarks : '—'}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-slate-500">
                          {formatShortDate(paper.createdOn)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="mb-4 text-lg font-semibold text-slate-800">Quick links</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {QUICK_LINKS.map(({ title, subtitle, href, Icon, iconWrap }) => (
                <Link
                  key={href}
                  to={href}
                  className="group flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconWrap}`}>
                    <Icon size={18} strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{title}</p>
                    <p className="text-xs text-slate-500">{subtitle}</p>
                  </div>
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
