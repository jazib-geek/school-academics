import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Pencil, Plus, Settings, X } from 'lucide-react'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import {
  createAccountGroup,
  createAccountLevel4,
  createAccountSubGroup,
  getAccountGroups,
  getAccountLevel4,
  getAccountMasters,
  getAccountSubGroups,
  renameAccountGroup,
  renameAccountLevel4,
  renameAccountSubGroup,
} from '../../../services/accountService'

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-2 focus:ring-indigo-100'

const TABS = [
  { id: '1', label: 'Level 1' },
  { id: '2', label: 'Level 2' },
  { id: '3', label: 'Level 3' },
  { id: '4', label: 'Level 4' },
]

export default function CampusAccountSettingsPage() {
  const [tab, setTab] = useState('4')
  const [masters, setMasters] = useState([])
  const [groups, setGroups] = useState([])
  const [subGroups, setSubGroups] = useState([])
  const [accounts, setAccounts] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const [masterId, setMasterId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [subGroupId, setSubGroupId] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [editing, setEditing] = useState(null)
  const [editTitle, setEditTitle] = useState('')

  const filteredGroups = useMemo(
    () => (masterId ? groups.filter((g) => String(g.masterId) === String(masterId)) : groups),
    [groups, masterId],
  )

  const filteredSubGroups = useMemo(
    () => (groupId ? subGroups.filter((s) => s.groupId === groupId) : subGroups),
    [subGroups, groupId],
  )

  const filteredAccounts = useMemo(
    () => (subGroupId ? accounts.filter((a) => a.subGroupId === subGroupId) : accounts),
    [accounts, subGroupId],
  )

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [m, g, s, a] = await Promise.all([
        getAccountMasters(),
        getAccountGroups(),
        getAccountSubGroups(),
        getAccountLevel4(),
      ])
      setMasters(m)
      setGroups(g)
      setSubGroups(s)
      setAccounts(a)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load account settings.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const create = async (event) => {
    event?.preventDefault?.()
    const title = newTitle.trim()
    if (!title) {
      toast.error('Enter a name.')
      return
    }
    setIsSaving(true)
    const toastId = 'acct-create'
    toast.loading('Saving...', { id: toastId })
    try {
      if (tab === '2') {
        if (!masterId) throw new Error('Select a Level 1 master.')
        await createAccountGroup({ masterId: Number(masterId), title })
      } else if (tab === '3') {
        if (!groupId) throw new Error('Select a Level 2 group.')
        await createAccountSubGroup({ groupId, title })
      } else if (tab === '4') {
        if (!subGroupId) throw new Error('Select a Level 3 subgroup.')
        await createAccountLevel4({ subGroupId, accountTitle: title })
      }
      toast.success('Saved.', { id: toastId })
      setNewTitle('')
      await load()
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Could not save.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const saveRename = async (event) => {
    event?.preventDefault?.()
    if (!editing) return
    const title = editTitle.trim()
    if (!title) {
      toast.error('Enter a name.')
      return
    }
    setIsSaving(true)
    try {
      if (editing.kind === 'group') await renameAccountGroup(editing.id, title)
      if (editing.kind === 'subGroup') await renameAccountSubGroup(editing.id, title)
      if (editing.kind === 'account') await renameAccountLevel4(editing.id, title)
      toast.success('Updated.')
      setEditing(null)
      await load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <CampusShell headerContext="Accounts">
      <div className="min-h-screen bg-slate-100 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <div className="mx-auto max-w-6xl space-y-4">
          <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                  <Settings size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Accounts Settings</h1>
                  <p className="text-sm text-slate-500">Manage chart of accounts levels.</p>
                </div>
              </div>
              <div className="inline-flex h-10 overflow-hidden rounded-lg border border-slate-300 bg-white p-0.5">
                {TABS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`rounded-md px-3 text-sm font-medium ${
                      tab === item.id ? 'bg-[var(--campus-primary)] text-white' : 'text-slate-600'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {tab !== '1' ? (
              <form onSubmit={create} className="grid gap-3 md:grid-cols-12">
                <select
                  className={`${inputClass} md:col-span-3`}
                  value={masterId}
                  onChange={(e) => {
                    setMasterId(e.target.value)
                    setGroupId('')
                    setSubGroupId('')
                  }}
                >
                  <option value="">Level 1 master</option>
                  {masters.map((m) => (
                    <option key={m.masterId} value={m.masterId}>
                      {m.title}
                    </option>
                  ))}
                </select>
                {(tab === '3' || tab === '4') && (
                  <select
                    className={`${inputClass} md:col-span-3`}
                    value={groupId}
                    onChange={(e) => {
                      setGroupId(e.target.value)
                      setSubGroupId('')
                    }}
                  >
                    <option value="">Level 2 group</option>
                    {filteredGroups.map((g) => (
                      <option key={g.id} value={g.groupId}>
                        {g.groupTitle}
                      </option>
                    ))}
                  </select>
                )}
                {tab === '4' && (
                  <select
                    className={`${inputClass} md:col-span-3`}
                    value={subGroupId}
                    onChange={(e) => setSubGroupId(e.target.value)}
                  >
                    <option value="">Level 3 subgroup</option>
                    {filteredSubGroups.map((s) => (
                      <option key={s.id} value={s.subGroupId}>
                        {s.subGroupName}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  className={`${inputClass} ${tab === '2' ? 'md:col-span-6' : tab === '3' ? 'md:col-span-3' : 'md:col-span-2'}`}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={tab === '4' ? 'Account name' : 'Name'}
                />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 text-sm font-medium text-white md:col-span-1"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={16} />}
                  Add
                </button>
              </form>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {isLoading ? (
              <div className="flex items-center justify-center gap-3 p-10 text-slate-500">
                <Loader2 size={22} className="animate-spin text-[var(--campus-primary)]" />
                <span className="text-sm font-medium">Loading chart...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {tab === '1' && (
                  <table className="min-w-full text-left text-[13px] leading-snug">
                    <thead>
                      <tr>
                        <th className="px-3 py-2">Master ID</th>
                        <th className="px-3 py-2">Title</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masters.map((m) => (
                        <tr key={m.masterId} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-1.5">{m.masterId}</td>
                          <td className="px-3 py-1.5 font-semibold text-slate-900">{m.title}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {tab === '2' && (
                  <table className="min-w-full text-left text-[13px] leading-snug">
                    <thead>
                      <tr>
                        <th className="px-3 py-2">Master</th>
                        <th className="px-3 py-2">Group ID</th>
                        <th className="px-3 py-2">Group Title</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(masterId ? filteredGroups : groups).map((g) => (
                        <tr key={g.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-1.5">{g.masterTitle}</td>
                          <td className="px-3 py-1.5 tabular-nums">{g.groupId}</td>
                          <td className="px-3 py-1.5 font-semibold text-slate-900">{g.groupTitle}</td>
                          <td className="px-3 py-1.5 text-right">
                            <button
                              type="button"
                              className="btn-table-action text-[var(--campus-primary)]"
                              onClick={() => {
                                setEditing({ kind: 'group', id: g.id })
                                setEditTitle(g.groupTitle)
                              }}
                            >
                              <Pencil size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {tab === '3' && (
                  <table className="min-w-full text-left text-[13px] leading-snug">
                    <thead>
                      <tr>
                        <th className="px-3 py-2">Master</th>
                        <th className="px-3 py-2">Group</th>
                        <th className="px-3 py-2">Sub Group ID</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(groupId ? filteredSubGroups : subGroups).map((s) => (
                        <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-1.5">{s.masterTitle}</td>
                          <td className="px-3 py-1.5">{s.groupTitle}</td>
                          <td className="px-3 py-1.5 tabular-nums">{s.subGroupId}</td>
                          <td className="px-3 py-1.5 font-semibold text-slate-900">{s.subGroupName}</td>
                          <td className="px-3 py-1.5 text-right">
                            <button
                              type="button"
                              className="btn-table-action text-[var(--campus-primary)]"
                              onClick={() => {
                                setEditing({ kind: 'subGroup', id: s.id })
                                setEditTitle(s.subGroupName)
                              }}
                            >
                              <Pencil size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {tab === '4' && (
                  <table className="min-w-full text-left text-[13px] leading-snug">
                    <thead>
                      <tr>
                        <th className="px-3 py-2">Master</th>
                        <th className="px-3 py-2">Group</th>
                        <th className="px-3 py-2">Sub Group</th>
                        <th className="px-3 py-2">Account ID</th>
                        <th className="px-3 py-2">Account Title</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(subGroupId ? filteredAccounts : accounts).map((a) => (
                        <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-1.5">{a.masterTitle}</td>
                          <td className="px-3 py-1.5">{a.groupTitle}</td>
                          <td className="px-3 py-1.5">{a.subGroupName}</td>
                          <td className="px-3 py-1.5 tabular-nums">{a.accountId}</td>
                          <td className="px-3 py-1.5 font-semibold text-slate-900">
                            {a.accountTitle}
                            {a.isSystemAccount ? (
                              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                System
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            {!a.isSystemAccount ? (
                              <button
                                type="button"
                                className="btn-table-action text-[var(--campus-primary)]"
                                onClick={() => {
                                  setEditing({ kind: 'account', id: a.id })
                                  setEditTitle(a.accountTitle)
                                }}
                              >
                                <Pencil size={16} />
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form
            onSubmit={saveRename}
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">Rename</h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-5">
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Name
                <input
                  className={`${inputClass} mt-1`}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 bg-slate-50 px-5 py-4">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setEditing(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-4 py-2 text-sm font-semibold text-white"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </CampusShell>
  )
}
