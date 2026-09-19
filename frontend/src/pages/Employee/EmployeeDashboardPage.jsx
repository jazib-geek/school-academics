import { useEffect, useMemo, useState } from 'react'
import {
  Banknote,
  BookMarked,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  Clock3,
  NotebookPen,
  PenLine,
  RefreshCw,
  ScrollText,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import EmployeeHomeWelcomeCard from '../../components/employee/EmployeeHomeWelcomeCard'
import EmployeeLayout from '../../components/employee/EmployeeLayout'
import { getEmployeeAttendanceStats } from '../../services/attendanceService'
import {
  ensureEmployeeProfile,
  getEmployeeDesignation,
  getEmployeeGender,
} from '../../services/employeeAuthService'
import { hasAnyEmployeeAppAccess, isEmployeeCoordinator } from '../../services/employeeAppAccess'

const getPakistanToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}

const formatPakistanBarDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const utcNoon = Date.UTC(y, m - 1, d, 12, 0, 0)
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
    .format(utcNoon)
    .replace(',', '')
    .toUpperCase()
}

const attendanceProgressTone = (percentage) => {
  if (percentage >= 85) return { bar: 'bg-[var(--emp-success)]', track: 'bg-[var(--emp-success-soft)]' }
  if (percentage >= 70) return { bar: 'bg-[var(--emp-warning)]', track: 'bg-[var(--emp-warning-soft)]' }
  return { bar: 'bg-[var(--emp-danger)]', track: 'bg-[var(--emp-danger-soft)]' }
}

const HOME_TILES = [
  {
    id: 'my-attendance',
    title: 'My attendance',
    description: 'Check-in this month',
    icon: Clock3,
    path: '/employee/my-attendance',
    color: '#1a73e8',
  },
  {
    id: 'my-salary-adjustments',
    title: 'Security and Loan',
    description: 'Balances and this month',
    icon: Banknote,
    path: '/employee/my-salary-adjustments',
    color: '#7b1fa2',
  },
  {
    id: 'my-assignments',
    title: 'My assignments',
    description: 'Classes & subjects',
    icon: BookMarked,
    path: '/employee/my-assignments',
    color: '#0d904f',
  },
  {
    id: 'my-timetable',
    title: 'My timetable',
    description: 'Periods & classes',
    icon: CalendarDays,
    path: '/employee/my-timetable',
    color: '#e37400',
  },
  {
    id: 'datesheets',
    title: 'Date sheets',
    description: 'Exam schedules',
    icon: NotebookPen,
    path: '/employee/datesheets',
    color: '#00897b',
  },
]

const DIARY_HOME_TILE = {
  id: 'diary',
  title: 'Daily diary',
  description: 'Class diaries & uploads',
  icon: PenLine,
  path: '/employee/academics/diary',
  color: '#3949ab',
}

function HomeMenuRow({ icon: Icon, title, description, color, onClick, isFirst }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full min-h-[3.25rem] items-center gap-3 px-3.5 py-3 text-left transition active:bg-[#f1f3f4] ${
        isFirst ? '' : 'border-t border-[var(--emp-border)]'
      }`}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.65rem]"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        <Icon size={20} strokeWidth={2.25} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-medium leading-tight text-[var(--emp-text)]">
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-[var(--emp-text-muted)]">
          {description}
        </span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-[var(--emp-border-strong)]" aria-hidden />
    </button>
  )
}

function EmployeeDashboardPage() {
  const navigate = useNavigate()
  const isCoordinator = isEmployeeCoordinator()
  const homeTiles = useMemo(() => {
    let tiles = [...HOME_TILES]
    if (!isCoordinator) {
      tiles = tiles.filter((tile) => tile.id !== 'my-attendance')
    }
    if (hasAnyEmployeeAppAccess('canViewDiary', 'canEditDiary')) {
      tiles.push(DIARY_HOME_TILE)
    }
    return tiles
  }, [isCoordinator])
  const todayIso = useMemo(() => getPakistanToday(), [])
  const dateLabel = useMemo(() => formatPakistanBarDate(todayIso), [todayIso])

  const firstName = useMemo(() => {
    const name = (localStorage.getItem('employeeName') || '').trim()
    if (!name) return 'there'
    return name.split(/\s+/)[0] || 'there'
  }, [])

  const [gender, setGender] = useState(() => getEmployeeGender())
  const [designation, setDesignation] = useState(() => getEmployeeDesignation())

  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)

  const loadStats = async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await getEmployeeAttendanceStats({ date: todayIso })
      setStats(result)
      setLastUpdatedAt(new Date())
    } catch {
      setError('Unable to load attendance for today.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isCoordinator) loadStats()
  }, [isCoordinator])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const profile = await ensureEmployeeProfile()
      if (cancelled) return
      setGender(profile.gender || getEmployeeGender())
      setDesignation(profile.designation || getEmployeeDesignation())
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const totalMarked = stats?.totalMarked ?? 0
  const presentCount = (stats?.presentCount ?? 0) + (stats?.lateCount ?? 0)
  const percentage = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0
  const progressTone = attendanceProgressTone(percentage)

  return (
    <EmployeeLayout
      title="Home"
      showQuickTiles={false}
      showProfileCard={false}
      compactContentTop
      appBarDateLabel={dateLabel}
    >
      <EmployeeHomeWelcomeCard
        firstName={firstName}
        gender={gender}
        designation={designation}
        subtitle={
          isCoordinator
            ? 'Here’s how campus attendance looks today.'
            : 'Choose an option below to get started.'
        }
      />

      {isCoordinator ? (
        <section className="emp-surface overflow-hidden rounded-[var(--emp-radius-lg)]">
          <button
            type="button"
            className="flex w-full items-start gap-3 px-4 pb-3 pt-4 text-left active:bg-[#f8f9fa]"
            onClick={() => navigate('/employee/attendance')}
          >
            <span
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.65rem] bg-[var(--emp-primary-soft)] text-[var(--emp-primary)]"
            >
              <CalendarClock size={20} strokeWidth={2.25} />
            </span>
            <span className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--emp-text-muted)]">
                Today’s attendance
              </p>
              <p className="mt-1.5 text-[2rem] font-semibold leading-none tracking-tight text-[var(--emp-text)]">
                {isLoading && !stats ? '—' : `${percentage}%`}
              </p>
              <p className="mt-1.5 text-sm text-[var(--emp-text-muted)]">
                {isLoading && !stats
                  ? 'Loading…'
                  : `${presentCount} present of ${totalMarked} marked`}
              </p>
            </span>
            <ChevronRight size={20} className="mt-1 shrink-0 text-[var(--emp-border-strong)]" aria-hidden />
          </button>

          <div className={`mx-4 h-2 overflow-hidden rounded-full ${progressTone.track}`}>
            <div
              className={`h-full rounded-full transition-[width] duration-300 ease-out ${progressTone.bar}`}
              style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
              role="progressbar"
              aria-valuenow={percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Attendance percentage"
            />
          </div>

          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <p className="min-w-0 truncate text-[11px] text-[var(--emp-text-muted)]">
              {lastUpdatedAt
                ? `Updated ${lastUpdatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                : 'Not updated yet'}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                loadStats()
              }}
              disabled={isLoading}
              className="emp-icon-btn shrink-0"
              aria-label="Refresh attendance"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          {error ? (
            <p className="border-t border-[var(--emp-border)] px-4 py-2.5 text-sm text-[var(--emp-danger)]">
              {error}
            </p>
          ) : null}
        </section>
      ) : (
        <button
          type="button"
          className="emp-action-row"
          onClick={() => navigate('/employee/my-attendance')}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.65rem] bg-[var(--emp-primary-soft)] text-[var(--emp-primary)]">
            <Clock3 size={20} strokeWidth={2.25} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9375rem] font-semibold leading-tight text-[var(--emp-text)]">
              My attendance
            </span>
            <span className="mt-0.5 block text-xs leading-snug text-[var(--emp-text-muted)]">
              View check-ins for this month
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-[var(--emp-border-strong)]" aria-hidden />
        </button>
      )}

      <section>
        <div className="emp-surface overflow-hidden rounded-[var(--emp-radius-lg)]">
          {homeTiles.map((tile, index) => (
            <HomeMenuRow
              key={tile.id}
              icon={tile.icon}
              title={tile.title}
              description={tile.description}
              color={tile.color}
              isFirst={index === 0}
              onClick={() => navigate(tile.path)}
            />
          ))}
        </div>
      </section>

      {isCoordinator ? (
        <section>
          <h2 className="mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--emp-text-muted)]">
            Campus
          </h2>
          <button
            type="button"
            className="emp-action-row"
            onClick={() => navigate('/employee/coordinator-daily-report')}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.65rem] bg-[#5f63681a] text-[#5f6368]">
              <ScrollText size={20} strokeWidth={2.25} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.9375rem] font-semibold leading-tight text-[var(--emp-text)]">
                Daily report
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-[var(--emp-text-muted)]">
                Head-office update for today
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-[var(--emp-border-strong)]" aria-hidden />
          </button>
        </section>
      ) : null}
    </EmployeeLayout>
  )
}

export default EmployeeDashboardPage
