import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { getAllCampusesDashboard } from '../../../services/campusDashboardService'

function CampusDashboardPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [dashboard, setDashboard] = useState({
    date: null,
    totalActiveStudentCount: 0,
    totalFeeCollectionToday: 0,
    campuses: [],
  })

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await getAllCampusesDashboard()
      setDashboard({
        date: data?.date || null,
        totalActiveStudentCount: data?.totalActiveStudentCount || 0,
        totalFeeCollectionToday: data?.totalFeeCollectionToday || 0,
        campuses: data?.campuses || [],
      })
    } catch {
      setError('Unable to load campus dashboard right now.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadDashboard()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadDashboard])

  const formatAmount = (value) =>
    Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })

  const formattedDate = dashboard.date ? new Date(dashboard.date).toLocaleDateString() : '-'

  return (
    <CampusShell campusOverviewActive>
      <div className="space-y-5 p-4 pt-20 md:p-6 md:pt-24">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-800">Campus Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Combined snapshot across all configured campuses.
          </p>
          <p className="mt-2 text-xs text-slate-400">Date: {formattedDate}</p>
        </section>

        {error ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </section>
        ) : null}

        {isLoading ? (
          <section className="flex items-center justify-center gap-3 rounded-2xl bg-white p-10 shadow-sm">
            <Loader2 size={22} className="animate-spin text-[#405189]" />
            <span className="text-sm font-medium text-slate-600">Loading campus stats...</span>
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Total Active Students</p>
                <p className="mt-1 text-4xl font-bold text-slate-800">
                  {dashboard.totalActiveStudentCount.toLocaleString()}
                </p>
              </article>
              <article className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Total Fee Collection Today</p>
                <p className="mt-1 text-4xl font-bold text-slate-800">
                  Rs {formatAmount(dashboard.totalFeeCollectionToday)}
                </p>
              </article>
            </section>

            <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-lg font-semibold text-slate-800">Campus-wise Breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left">
                    <tr>
                      <th className="px-4 py-3">Campus</th>
                      <th className="px-4 py-3">Active Students</th>
                      <th className="px-4 py-3">Fee Collection Today</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.campuses.map((item) => (
                      <tr key={item.campus} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium uppercase">{item.campus}</td>
                        <td className="px-4 py-3">
                          {Number(item.activeStudentCount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">Rs {formatAmount(item.feeCollectionToday)}</td>
                      </tr>
                    ))}
                    {dashboard.campuses.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                          No campus records found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </CampusShell>
  )
}

export default CampusDashboardPage


