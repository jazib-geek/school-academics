import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  Building2,
  BookCopy,
  ChevronDown,
  Columns2,
  FileQuestion,
  FileOutput,
  GraduationCap,
  Home,
  Menu,
  Shapes,
  Sigma,
  Tags,
  X,
} from 'lucide-react'
import { useAcademicInstituteSettings } from '../../contexts/AcademicInstituteSettingsContext'
import { academicLogout } from '../../services/academicAuthService'

function topBarLogoSrc(logo) {
  if (!logo || typeof logo !== 'string') return ''
  const trimmed = logo.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('data:')) return trimmed
  return `data:image/png;base64,${trimmed}`
}

function AcademicLayout({
  pageTitle,
  pageSubtitle,
  pageIcon,
  pageActions,
  isSingleCardLayout = false,
  children,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { instituteSettings } = useAcademicInstituteSettings()
  const username = localStorage.getItem('academicUsername') || 'Academic Admin'
  const schoolTitle =
    (instituteSettings?.instituteName && String(instituteSettings.instituteName).trim()) ||
    'Shared Academics Dashboard'
  const schoolLogoSrc = topBarLogoSrc(instituteSettings?.instituteLogo)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [openSections, setOpenSections] = useState({
    curriculum: false,
    questions: false,
    exams: false,
  })

  useEffect(() => {
    const path = location.pathname
    if (path === '/academics/dashboard') {
      setOpenSections({ curriculum: false, questions: false, exams: false })
      return
    }
    setOpenSections({
      curriculum: /\/settings\/(classes|subjects|chapters)$/.test(path),
      questions: path.includes('/settings/question-catalog'),
      exams: /\/settings\/(exam-titles|exam-maker-compact)$/.test(path),
    })
  }, [location.pathname])

  const toggleSection = (key) => {
    setOpenSections((previous) => ({ ...previous, [key]: !previous[key] }))
  }

  const isDashboard = location.pathname === '/academics/dashboard'
  const isClasses = location.pathname === '/academics/settings/classes'
  const isSubjects = location.pathname === '/academics/settings/subjects'
  const isChapters = location.pathname === '/academics/settings/chapters'
  const isQuestionCatalog = location.pathname === '/academics/settings/question-catalog'
  const isExamTitles = location.pathname === '/academics/settings/exam-titles'
  const isExamMakerCompact = location.pathname === '/academics/settings/exam-maker-compact'
  const isCurriculumActive = isClasses || isSubjects || isChapters
  const isQuestionsActive = isQuestionCatalog
  const isExamsActive = isExamTitles || isExamMakerCompact

  const onLogout = () => {
    academicLogout()
    navigate('/academics/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-700">
      <div className="flex min-h-screen w-full">
        {isMobileSidebarOpen ? (
          <button
            type="button"
            aria-label="Close sidebar overlay"
            className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 bg-[linear-gradient(280deg,#405189,#283357)] text-indigo-50 transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 lg:flex lg:flex-col ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-16 items-center gap-3 border-b border-white/15 px-5">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/20 text-xl text-white">
              <GraduationCap size={22} />
            </div>
            <div>
              <p className="text-[22px] font-semibold leading-5">Academics Admin</p>
              <p className="text-xs text-indigo-200">Global Academic Content</p>
            </div>
            <button
              type="button"
              className="ml-auto rounded-lg p-2 text-indigo-100 hover:bg-white/10 lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-6 text-sm">
            <Link
              to="/academics/dashboard"
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left transition ${
                isDashboard ? 'bg-white/15 font-medium text-white' : 'text-indigo-100 hover:bg-white/10'
              }`}
            >
              <Home size={16} className="shrink-0" />
              <span className="flex-1">Dashboard</span>
            </Link>

            <div className="overflow-hidden rounded-xl">
              <button
                type="button"
                onClick={() => toggleSection('curriculum')}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left transition ${
                  isCurriculumActive ? 'bg-white/15 font-medium text-white' : 'text-indigo-100 hover:bg-white/10'
                }`}
              >
                <BookCopy size={16} className="shrink-0" />
                <span className="flex-1">Curriculum</span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 transition-transform duration-300 ${
                    openSections.curriculum ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <div
                className={`grid overflow-hidden pl-10 pr-2 transition-all duration-300 ${
                  openSections.curriculum ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="min-h-0">
                  <div className="mb-2 mt-1 space-y-1">
                    <Link
                      to="/academics/settings/classes"
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition ${
                        isClasses ? 'bg-white/20 text-white' : 'text-indigo-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Shapes size={14} />
                      Classes
                    </Link>
                    <Link
                      to="/academics/settings/subjects"
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition ${
                        isSubjects ? 'bg-white/20 text-white' : 'text-indigo-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Sigma size={14} />
                      Subjects
                    </Link>
                    <Link
                      to="/academics/settings/chapters"
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition ${
                        isChapters ? 'bg-white/20 text-white' : 'text-indigo-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <BookCopy size={14} />
                      Chapters
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl">
              <button
                type="button"
                onClick={() => toggleSection('questions')}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left transition ${
                  isQuestionsActive ? 'bg-white/15 font-medium text-white' : 'text-indigo-100 hover:bg-white/10'
                }`}
              >
                <FileQuestion size={16} className="shrink-0" />
                <span className="flex-1">Questions</span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 transition-transform duration-300 ${
                    openSections.questions ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <div
                className={`grid overflow-hidden pl-10 pr-2 transition-all duration-300 ${
                  openSections.questions ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="min-h-0">
                  <div className="mb-2 mt-1 space-y-1">
                    <Link
                      to="/academics/settings/question-catalog"
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition ${
                        isQuestionCatalog
                          ? 'bg-white/20 text-white'
                          : 'text-indigo-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <FileQuestion size={14} />
                      Question catalog
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl">
              <button
                type="button"
                onClick={() => toggleSection('exams')}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left transition ${
                  isExamsActive ? 'bg-white/15 font-medium text-white' : 'text-indigo-100 hover:bg-white/10'
                }`}
              >
                <FileOutput size={16} className="shrink-0" />
                <span className="flex-1">Exams</span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 transition-transform duration-300 ${openSections.exams ? 'rotate-180' : ''}`}
                />
              </button>

              <div
                className={`grid overflow-hidden pl-10 pr-2 transition-all duration-300 ${
                  openSections.exams ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="min-h-0">
                  <div className="mb-2 mt-1 space-y-1">
                    <Link
                      to="/academics/settings/exam-titles"
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition ${
                        isExamTitles ? 'bg-white/20 text-white' : 'text-indigo-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Tags size={14} />
                      Exam titles
                    </Link>
                 
                    <Link
                      to="/academics/settings/exam-maker-compact"
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition ${
                        isExamMakerCompact ? 'bg-white/20 text-white' : 'text-indigo-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Columns2 size={14} />
                      Exam Maker
                    </Link>

                  </div>
                </div>
              </div>
            </div>
          </nav>
        </aside>

        <main className="flex-1">
          <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-indigo-100 bg-slate-50/95 px-4 shadow-sm backdrop-blur-sm lg:left-72 lg:px-6">
            <div className="flex items-center gap-3 text-slate-700">
              <button
                type="button"
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
                onClick={() => setIsMobileSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={18} />
              </button>
              <div className="flex items-center gap-2 rounded-lg border border-indigo-100 bg-white px-3 py-1.5">
                {schoolLogoSrc ? (
                  <img
                    src={schoolLogoSrc}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded object-contain"
                  />
                ) : null}
                <p className="text-sm font-semibold">{schoolTitle}</p>
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((previous) => !previous)}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <div className="grid h-8 w-8 place-items-center rounded-full bg-[#405189] text-xs font-semibold text-white">
                  {username.slice(0, 2).toUpperCase()}
                </div>
                <span>{username}</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-300 ${
                    isUserMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isUserMenuOpen ? (
                <div className="absolute right-0 mt-2 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                  <Link
                    to="/academics/settings/institute"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                  >
                    <Building2 size={15} />
                    Institute settings
                  </Link>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                  >
                    <BadgeCheck size={15} />
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </header>

          <div className="p-4 pt-20 md:p-6 md:pt-24 lg:p-7 lg:pt-24">
            {isSingleCardLayout ? (
              <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      {pageIcon ? (
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#405189] text-white shadow-sm">
                          {pageIcon}
                        </div>
                      ) : null}
                      <h1 className="text-3xl font-bold text-slate-800">{pageTitle}</h1>
                    </div>
                    {pageSubtitle ? <p className="mt-1 text-sm text-slate-500">{pageSubtitle}</p> : null}
                  </div>
                  {pageActions ? <div>{pageActions}</div> : null}
                </div>
                <div className="mt-4 border-t border-slate-100 pt-4">{children}</div>
              </section>
            ) : (
              <>
                <header className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3">
                        {pageIcon ? (
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#405189] text-white shadow-sm">
                            {pageIcon}
                          </div>
                        ) : null}
                        <h1 className="text-3xl font-bold text-slate-800">{pageTitle}</h1>
                      </div>
                      {pageSubtitle ? <p className="mt-1 text-sm text-slate-500">{pageSubtitle}</p> : null}
                    </div>
                    {pageActions ? <div>{pageActions}</div> : null}
                  </div>
                </header>
                {children}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default AcademicLayout
