import { useEffect, useMemo, useState } from 'react'
import { Bell, CalendarClock, ClipboardList, MessageSquare, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import EmployeeLayout from '../../components/employee/EmployeeLayout'
import { getEmployeeAttendanceStats } from '../../services/attendanceService'

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

function EmployeeDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)

  const loadStats = async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await getEmployeeAttendanceStats({ date: getPakistanToday() })
      setStats(result)
      setLastUpdatedAt(new Date())
    } catch {
      setError('Unable to load live attendance stats.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const quickTiles = useMemo(
    () => {
      const totalMarked = stats?.totalMarked ?? 0
      const presentCount = stats?.presentCount ?? 0
      const percentage = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0

      return [
        {
          id: 'attendance',
          label: 'Attendance',
          icon: CalendarClock,
          value: isLoading && !stats ? 'Loading...' : `${percentage}% (${presentCount}/${totalMarked})`,
          iconBadgeClass: 'bg-indigo-100 text-indigo-700',
          onClick: () => navigate('/employee/attendance-report'),
        },
        {
          id: 'tasks',
          label: 'Tasks',
          icon: ClipboardList,
          value: 'Coming soon',
          iconBadgeClass: 'bg-emerald-100 text-emerald-700',
        },
        {
          id: 'notices',
          label: 'Notices',
          icon: Bell,
          value: 'Coming soon',
          iconBadgeClass: 'bg-amber-100 text-amber-700',
        },
        {
          id: 'messages',
          label: 'Messages',
          icon: MessageSquare,
          value: 'Coming soon',
          iconBadgeClass: 'bg-rose-100 text-rose-700',
        },
      ]
    },
    [isLoading, stats],
  )

  return (
    <EmployeeLayout
      title="Dashboard"
      subtitle="Overall employee overview"
      quickTiles={quickTiles}
      showProfileCard={false}
    >
      <div className="flex items-center justify-between rounded-xl px-1 py-1">
        <p className="text-xs text-slate-500">
          {lastUpdatedAt ? `Updated ${lastUpdatedAt.toLocaleTimeString()}` : 'Waiting for first update...'}
        </p>
        <button
          type="button"
          onClick={loadStats}
          disabled={isLoading}
          className="emp-cta-btn emp-cta-btn-primary"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </EmployeeLayout>
  )
}

export default EmployeeDashboardPage
