import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, School, UserPlus, Wallet, AlertTriangle } from 'lucide-react'
import { getFeeCollectionInInterval, getFeeCollectionOnDate, getFeeDefaulters, getOverallReceivable } from '../../../services/feeReportService'
import { getStudents } from '../../../services/studentService'
import CampusShell from '../../../components/campus/CampusShell.jsx'

function DashboardPage() {
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [dashboardData, setDashboardData] = useState({
    activeStudents: 0,
    inactiveStudents: 0,
    collectionToday: 0,
    collectionMonthToDate: 0,
    tuitionDefaulterCount: 0,
    tuitionDefaulterAmount: 0,
    overallReceivable: 0,
    recentAdmissions: [],
    topDefaulters: [],
    classSnapshot: [],
  })

  const getTodayIso = () => new Date().toISOString().slice(0, 10)
  const getMonthStartIso = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  }

  const formatAmount = (value) =>
    Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })

  const formatDate = (value) => {
    if (!value) return '-'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return '-'
    return parsed.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const todayIso = getTodayIso()
      const monthStartIso = getMonthStartIso()
      const now = new Date()
      const month = now.getMonth() + 1
      const year = now.getFullYear()

      const [
        activeStudentsRes,
        inactiveStudentsRes,
        collectionTodayRes,
        collectionIntervalRes,
        tuitionDefaultersRes,
        receivableRes,
      ] = await Promise.all([
        getStudents({ isActive: true, pageNumber: 1, pageSize: 300 }),
        getStudents({ isActive: false, pageNumber: 1, pageSize: 300 }),
        getFeeCollectionOnDate(todayIso),
        getFeeCollectionInInterval(monthStartIso, todayIso),
        getFeeDefaulters(month, year),
        getOverallReceivable(),
      ])

      const activeStudents = activeStudentsRes?.totalCount || 0
      const inactiveStudents = inactiveStudentsRes?.totalCount || 0
      const recentAdmissions = [...(activeStudentsRes?.items || [])]
        .sort((a, b) => {
          const dateA = a.regDate ? new Date(a.regDate).getTime() : 0
          const dateB = b.regDate ? new Date(b.regDate).getTime() : 0
          if (dateA !== dateB) return dateB - dateA
          return Number(b.reg_Id || 0) - Number(a.reg_Id || 0)
        })
        .slice(0, 8)
      const topDefaulters = [...(tuitionDefaultersRes?.items || [])]
        .sort((a, b) => Number(b.outstandingAmount || 0) - Number(a.outstandingAmount || 0))
        .slice(0, 12)

      const classCounter = {}
      for (const item of activeStudentsRes?.items || []) {
        const key = item.class || 'Unassigned'
        classCounter[key] = (classCounter[key] || 0) + 1
      }
      const classSnapshot = Object.entries(classCounter)
        .map(([className, count]) => ({ className, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)

      setDashboardData({
        activeStudents,
        inactiveStudents,
        collectionToday: collectionTodayRes?.totalAmount || 0,
        collectionMonthToDate: collectionIntervalRes?.totalAmount || 0,
        tuitionDefaulterCount: tuitionDefaultersRes?.totalRecords || 0,
        tuitionDefaulterAmount: tuitionDefaultersRes?.totalAmount || 0,
        overallReceivable: receivableRes?.totalAmount || 0,
        recentAdmissions,
        topDefaulters,
        classSnapshot,
      })
    } catch {
      setError('Unable to load dashboard insights right now.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  return (
    <CampusShell>
      <div className="p-4 pt-20 md:p-6 md:pt-24 lg:p-7 lg:pt-24">
     {/*      <section className="mb-5 flex justify-end">
            <button type="button" onClick={loadDashboard} className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100">
              Refresh Dashboard
            </button>
          </section> */}

          {error ? (
            <section className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </section>
          ) : null}

          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-2xl border-t-4 border-violet-500 bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate-500">Active Students</p>
                <School size={18} className="text-violet-600" />
              </div>
              {isLoading ? (
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 size={16} className="animate-spin" /> Loading...
                </div>
              ) : (
                <>
                  <p className="mt-1 text-3xl font-bold text-slate-800">{dashboardData.activeStudents.toLocaleString()}</p>
                  <p className="mt-2 text-xs text-slate-500">Inactive: {dashboardData.inactiveStudents.toLocaleString()}</p>
                </>
              )}
            </article>
            <article className="rounded-2xl border-t-4 border-emerald-500 bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate-500">Fee Collection Today</p>
                <Wallet size={18} className="text-emerald-600" />
              </div>
              {isLoading ? (
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 size={16} className="animate-spin" /> Loading...
                </div>
              ) : (
                <>
                  <p className="mt-1 text-3xl font-bold text-slate-800">Rs {formatAmount(dashboardData.collectionToday)}</p>
                  <p className="mt-2 text-xs text-slate-500">Month to date: Rs {formatAmount(dashboardData.collectionMonthToDate)}</p>
                </>
              )}
            </article>
            <article className="rounded-2xl border-t-4 border-rose-500 bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate-500">Overall Receivable</p>
                <AlertTriangle size={18} className="text-rose-600" />
              </div>
              {isLoading ? (
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 size={16} className="animate-spin" /> Loading...
                </div>
              ) : (
                <>
                  <p className="mt-1 text-3xl font-bold text-slate-800">Rs {formatAmount(dashboardData.overallReceivable)}</p>
                  <p className="mt-2 text-xs text-rose-600">Tuition defaulters: {dashboardData.tuitionDefaulterCount} (Rs {formatAmount(dashboardData.tuitionDefaulterAmount)})</p>
                </>
              )}
            </article>
          </section>

          <section className="grid gap-5 xl:grid-cols-3">
            <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-800">
                    Top Tuition Defaulters
                  </h2>
                  <p className="text-sm text-slate-400">
                    Current month tuition outstanding (active students)
                  </p>
                </div>
                <button onClick={() => navigate('/campus/fee/reports')} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">
                  Open Fee Reports
                </button>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
                  <Loader2 size={18} className="animate-spin" /> Loading insights...
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Student</th>
                        <th className="px-3 py-2">Class</th>
                        <th className="px-3 py-2 text-right">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.topDefaulters.map((item) => (
                        <tr key={`${item.studentId}-${item.month}-${item.year}`} className="border-t border-slate-100">
                          <td className="px-3 py-2">{item.studentName}</td>
                          <td className="px-3 py-2">{item.className || '-'}</td>
                          <td className="px-3 py-2 text-right font-medium">Rs {formatAmount(item.outstandingAmount)}</td>
                        </tr>
                      ))}
                      {dashboardData.topDefaulters.length > 0 &&
                        dashboardData.topDefaulters.length < 12
                        ? Array.from({ length: 12 - dashboardData.topDefaulters.length }).map((_, idx) => (
                            <tr key={`empty-row-${idx}`} className="border-t border-slate-100">
                              <td className="px-3 py-2 text-slate-300">-</td>
                              <td className="px-3 py-2 text-slate-300">-</td>
                              <td className="px-3 py-2 text-right text-slate-300">-</td>
                            </tr>
                          ))
                        : null}
                      {dashboardData.topDefaulters.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                            No defaulters for current month.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {dashboardData.classSnapshot.map((item) => (
                  <div key={item.className} className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-2xl font-semibold text-indigo-700">{item.count}</p>
                    <p className="text-xs text-slate-500">{item.className}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-slate-800">Recent Admissions</h2>
                <button onClick={() => navigate('/campus/students')} className="text-sm text-indigo-600 hover:underline">View students</button>
              </div>

              <div className="space-y-3">
                {dashboardData.recentAdmissions.map((item) => (
                  <div
                    key={`${item.reg_Id}-${item.regDate || 'na'}`}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 p-3"
                  >
                    <div
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-100"
                    >
                      <UserPlus size={15} className="text-violet-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-700">{item.fullName || 'Student'}</p>
                      <p className="text-sm text-slate-500">{item.className || '-'} · Reg #{item.reg_Id}</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-slate-500">{formatDate(item.regDate)}</span>
                  </div>
                ))}
                {dashboardData.recentAdmissions.length === 0 ? (
                  <p className="rounded-xl border border-slate-100 p-4 text-sm text-slate-500">
                    No recent admissions found.
                  </p>
                ) : null}
              </div>

              <p className="mt-4 text-sm text-slate-500">
                Showing {dashboardData.recentAdmissions.length} latest admissions
              </p>
            </article>
          </section>

            <footer className="mt-7 text-center text-sm text-slate-400">
              © 2024 School Admin. All rights reserved.
            </footer>
      </div>
    </CampusShell>
  )
}

export default DashboardPage
