import { useCallback, useEffect, useMemo, useState } from 'react'
import { KeyRound, Loader2, MessageCircle, RefreshCw, Search, Smartphone, X } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { PermissionControl } from '../../../components/campus/CampusPermissionUi.jsx'
import { hasCampusPermission } from '../../../services/authService'
import {
  buildFamilyCredentialsWhatsAppUrl,
  changeFamilyAccountPassword,
  getFamilyAccounts,
} from '../../../services/familyAccountService'

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

export default function CampusFamilyAccountsPage() {
  const canManage = hasCampusPermission('manage_family_accounts')
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [passwordTarget, setPasswordTarget] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => {
      return (
        String(row.familyId).includes(q) ||
        String(row.fatherName || '').toLowerCase().includes(q) ||
        String(row.fatherContact || '').toLowerCase().includes(q)
      )
    })
  }, [rows, query])

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      setRows(await getFamilyAccounts())
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load family accounts.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openPassword = (row) => {
    setPasswordTarget(row)
    setNewPassword(row.password || '')
  }

  const closePassword = () => {
    setPasswordTarget(null)
    setNewPassword('')
  }

  const savePassword = async (event) => {
    event.preventDefault()
    if (!passwordTarget) return
    const password = newPassword.trim()
    if (!password) {
      toast.error('Enter a password.')
      return
    }
    setIsSaving(true)
    const toastId = 'family-password'
    toast.loading('Updating password…', { id: toastId })
    try {
      await changeFamilyAccountPassword(passwordTarget.familyId, password)
      toast.success('Password updated.', { id: toastId })
      closePassword()
      await load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update password.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const openWhatsApp = (row) => {
    const url = buildFamilyCredentialsWhatsAppUrl({
      familyId: row.familyId,
      password: row.password,
      fatherContact: row.fatherContact,
    })
    if (!url) {
      toast.error('No valid mobile number for WhatsApp.')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <CampusShell headerContext="Family Accounts">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-6xl space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Family Accounts</h1>
                  <p className="text-sm text-slate-500">Login details for families with at least one active student.</p>
                </div>
              </div>
              <button type="button" onClick={() => void load()} disabled={isLoading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </button>
            </div>
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search family ID, father name, or contact…"
                className={`${inputClass} pl-9`}
              />
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-[13px] leading-snug">
                <thead className="bg-[var(--campus-primary)] text-white">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Family ID</th>
                    <th className="px-3 py-2 text-left font-medium">Father name</th>
                    <th className="px-3 py-2 text-left font-medium">Contact</th>
                    <th className="px-3 py-2 text-left font-medium">Password</th>
                    <th className="px-3 py-2 text-right font-medium">Active students</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-500">No active family accounts found.</td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                        <td className="px-3 py-1.5 font-medium text-slate-800">{row.familyId}</td>
                        <td className="px-3 py-1.5 text-slate-700">{row.fatherName || '—'}</td>
                        <td className="px-3 py-1.5 text-slate-700">{row.fatherContact || '—'}</td>
                        <td className="px-3 py-1.5 font-mono text-slate-700">{row.password || '—'}</td>
                        <td className="px-3 py-1.5 text-right text-slate-700">{row.activeStudentCount}</td>
                        <td className="px-3 py-1.5">
                          <div className="flex justify-end gap-1">
                            <PermissionControl allowed={canManage}>
                              <button
                                type="button"
                                title="Change password"
                                onClick={() => openPassword(row)}
                                className="btn-icon-soft btn-table-action"
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                              </button>
                            </PermissionControl>
                            <PermissionControl allowed={canManage}>
                              <button
                                type="button"
                                title="WhatsApp credentials"
                                onClick={() => openWhatsApp(row)}
                                className="btn-icon-soft btn-table-action text-emerald-600"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </button>
                            </PermissionControl>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {passwordTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={savePassword} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Change password</h2>
                <p className="text-sm text-slate-500">
                  Family ID {passwordTarget.familyId}
                  {passwordTarget.fatherName ? ` · ${passwordTarget.fatherName}` : ''}
                </p>
              </div>
              <button type="button" onClick={closePassword} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">New password</span>
              <input
                className={inputClass}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoFocus
                required
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={closePassword} className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700">
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-medium text-white disabled:opacity-60">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save password
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </CampusShell>
  )
}
