import { useCallback, useEffect, useState } from 'react'
import { Coffee, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { PermissionControl } from '../../../components/campus/CampusPermissionUi.jsx'
import { hasCampusPermission } from '../../../services/authService'
import { getPayrollSettings, updatePayrollSettings } from '../../../services/payrollSettingsService'

const inputClass =
  'h-10 w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

function CampusAllowancesSettingsPage() {
  const canManage = hasCampusPermission('manage_payroll_allowances')
  const [teaAllowance, setTeaAllowance] = useState('0')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getPayrollSettings()
      setTeaAllowance(String(data?.teaAllowance ?? 0))
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load allowances.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    const amount = Number(teaAllowance)
    if (Number.isNaN(amount) || amount < 0) {
      toast.error('Enter a valid tea allowance amount.')
      return
    }

    setIsSaving(true)
    try {
      const data = await updatePayrollSettings({ teaAllowance: amount })
      setTeaAllowance(String(data?.teaAllowance ?? amount))
      toast.success('Allowance saved.')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not save allowance.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <CampusShell headerContext="Allowances">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-3xl">
          <section className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                <Coffee size={18} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Allowances</h1>
                <p className="text-sm text-slate-500">
                  Monthly tea allowance applied when salaries are calculated.
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 py-8 text-slate-500">
                <Loader2 className="animate-spin" size={16} />
                Loading…
              </div>
            ) : (
              <PermissionControl permission="manage_payroll_allowances">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">Tea allowance</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    value={teaAllowance}
                    disabled={!canManage}
                    onChange={(e) => setTeaAllowance(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={!canManage || isSaving}
                    onClick={handleSave}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-medium text-white hover:bg-[#364574] disabled:opacity-60"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    Save
                  </button>
                </div>
              </PermissionControl>
            )}
          </section>
        </div>
      </div>
    </CampusShell>
  )
}

export default CampusAllowancesSettingsPage
