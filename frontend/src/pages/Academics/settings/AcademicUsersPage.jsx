import { useCallback, useEffect, useMemo, useState } from 'react'
import { KeyRound, Loader2, Pencil, Plus, Power, RefreshCw, Save, Shield, UserRound, X } from 'lucide-react'
import { toast } from 'sonner'
import AcademicLayout from '../../../components/academics/AcademicLayout.jsx'
import {
  createAcademicUser,
  forceChangeAcademicUserPassword,
  getAcademicPermissionCatalog,
  getAcademicUser,
  getAcademicUsers,
  setAcademicUserStatus,
  updateAcademicUser,
} from '../../../services/academicUserService'
import { hasAcademicPermission } from '../../../services/academicAuthService'

const emptyForm = {
  userName: '',
  password: '',
  isActive: true,
  grantedPermissionCodes: [],
}

const emptyPasswordForm = {
  newPassword: '',
  confirmPassword: '',
}

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#405189] focus:ring-2 focus:ring-indigo-100'

const REVEAL_SECONDS = 5

function AcademicUsersPage() {
  const canCreate = hasAcademicPermission('create_user')
  const canEdit = hasAcademicPermission('edit_user')
  const canDeactivate = hasAcademicPermission('delete_user')

  const [rows, setRows] = useState([])
  const [permissionGroups, setPermissionGroups] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingUser, setIsLoadingUser] = useState(false)
  const [showActive, setShowActive] = useState(true)
  const [revealedPassword, setRevealedPassword] = useState(null)
  const [revealSecondsLeft, setRevealSecondsLeft] = useState(0)
  const [passwordTarget, setPasswordTarget] = useState(null)
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  const sortedRows = useMemo(
    () =>
      [...rows]
        .filter((row) => Boolean(row.isActive) === showActive)
        .sort((a, b) => String(a.userName || '').localeCompare(String(b.userName || ''))),
    [rows, showActive],
  )

  const allCodes = useMemo(
    () => permissionGroups.flatMap((group) => (group.permissions || []).map((p) => p.code)),
    [permissionGroups],
  )

  const grantedSet = useMemo(
    () => new Set((form.grantedPermissionCodes || []).map((code) => String(code).toLowerCase())),
    [form.grantedPermissionCodes],
  )

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [users, catalog] = await Promise.all([getAcademicUsers(), getAcademicPermissionCatalog()])
      setRows(users)
      setPermissionGroups(catalog)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load users.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!revealedPassword) return undefined

    setRevealSecondsLeft(REVEAL_SECONDS)
    const intervalId = window.setInterval(() => {
      setRevealSecondsLeft((previous) => Math.max(0, previous - 1))
    }, 1000)

    const timeoutId = window.setTimeout(() => {
      setRevealedPassword(null)
    }, REVEAL_SECONDS * 1000)

    return () => {
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [revealedPassword])

  const setValue = (name, value) => setForm((current) => ({ ...current, [name]: value }))

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
    setIsEditorOpen(false)
  }

  const startCreate = () => {
    if (!canCreate) return
    setEditingId(null)
    setForm(emptyForm)
    setIsEditorOpen(true)
  }

  const startEdit = async (row) => {
    if (!canEdit) return
    setIsLoadingUser(true)
    setEditingId(row.id)
    setIsEditorOpen(true)
    try {
      const user = await getAcademicUser(row.id)
      setForm({
        userName: user?.userName || '',
        password: '',
        isActive: user?.isActive ?? true,
        grantedPermissionCodes: [...(user?.grantedPermissionCodes || [])],
      })
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load user.')
      resetForm()
    } finally {
      setIsLoadingUser(false)
    }
  }

  const togglePermission = (code) => {
    const key = String(code).toLowerCase()
    setForm((current) => {
      const next = new Set((current.grantedPermissionCodes || []).map((c) => String(c).toLowerCase()))
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return { ...current, grantedPermissionCodes: [...next] }
    })
  }

  const toggleGroup = (group, checked) => {
    const codes = (group.permissions || []).map((p) => String(p.code).toLowerCase())
    setForm((current) => {
      const next = new Set((current.grantedPermissionCodes || []).map((c) => String(c).toLowerCase()))
      codes.forEach((code) => {
        if (checked) next.add(code)
        else next.delete(code)
      })
      return { ...current, grantedPermissionCodes: [...next] }
    })
  }

  const selectAll = (checked) => {
    setForm((current) => ({
      ...current,
      grantedPermissionCodes: checked ? allCodes.map((code) => String(code).toLowerCase()) : [],
    }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    const toastId = 'academic-user-save'
    toast.loading(editingId ? 'Updating user...' : 'Creating user...', { id: toastId })
    try {
      const payload = {
        userName: form.userName.trim(),
        password: form.password.trim() || null,
        isActive: Boolean(form.isActive),
        grantedPermissionCodes: form.grantedPermissionCodes || [],
      }
      if (!editingId && !payload.password) {
        toast.error('Password is required.', { id: toastId })
        return
      }
      if (editingId) await updateAcademicUser(editingId, payload)
      else await createAcademicUser(payload)
      toast.success(editingId ? 'User updated.' : 'User created.', { id: toastId })
      resetForm()
      load()
    } catch (error) {
      const validation = error?.response?.data?.errors
      const firstValidation = validation ? Object.values(validation).flat()[0] : ''
      toast.error(firstValidation || error?.response?.data?.message || 'Could not save user.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleStatus = async (row) => {
    if (!canDeactivate) return
    try {
      await setAcademicUserStatus(row.id, !row.isActive)
      toast.success(!row.isActive ? 'User activated.' : 'User deactivated.')
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update user status.')
    }
  }

  const revealPassword = (row, event) => {
    event.stopPropagation()
    const password = row.password || ''
    if (!password) {
      toast.error('No password is set for this user.')
      return
    }
    setRevealedPassword({
      id: row.id,
      userName: row.userName || 'User',
      password,
      x: Math.min(event.clientX, window.innerWidth - 240),
      y: Math.min(event.clientY + 8, window.innerHeight - 120),
    })
  }

  const closeReveal = () => setRevealedPassword(null)

  const openForcePassword = (row) => {
    if (!canEdit) return
    setPasswordTarget(row)
    setPasswordForm(emptyPasswordForm)
  }

  const closeForcePassword = () => {
    if (isSavingPassword) return
    setPasswordTarget(null)
    setPasswordForm(emptyPasswordForm)
  }

  const submitForcePassword = async (event) => {
    event.preventDefault()
    if (!passwordTarget) return

    const newPassword = passwordForm.newPassword.trim()
    const confirmPassword = passwordForm.confirmPassword.trim()

    if (!newPassword || !confirmPassword) {
      toast.error('Please enter and confirm the new password.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.')
      return
    }

    setIsSavingPassword(true)
    const toastId = 'academic-user-force-password'
    toast.loading('Updating password...', { id: toastId })
    try {
      await forceChangeAcademicUserPassword(passwordTarget.id, { newPassword, confirmPassword })
      toast.success('Password updated.', { id: toastId })
      setPasswordTarget(null)
      setPasswordForm(emptyPasswordForm)
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update password.', { id: toastId })
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <AcademicLayout
      pageTitle="Users"
      pageSubtitle="Create academics users and assign screen permissions."
      pageIcon={<Shield size={18} />}
      pageActions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-10 overflow-hidden rounded-lg border border-slate-300 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setShowActive(true)}
              className={`rounded-md px-3 text-sm font-medium transition ${
                showActive ? 'bg-[#405189] text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setShowActive(false)}
              className={`rounded-md px-3 text-sm font-medium transition ${
                !showActive ? 'bg-[#405189] text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Inactive
            </button>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
          {canCreate ? (
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#405189] px-4 text-sm font-medium text-white"
            >
              <Plus size={18} /> Add user
            </button>
          ) : null}
        </div>
      }
      isSingleCardLayout={false}
    >
      <section className="overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px] leading-snug">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Username</th>
                <th className="px-3 py-2 font-medium">Password</th>
                <th className="px-3 py-2 font-medium">Permissions</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-[#405189]">
                        <UserRound size={16} />
                      </div>
                      <div className="font-semibold text-slate-900">{row.userName || '-'}</div>
                    </div>
                  </td>
                  <td className="px-3 py-1.5">
                    <button
                      type="button"
                      onClick={(event) => revealPassword(row, event)}
                      title="Click to show password"
                      className="inline-flex cursor-pointer items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[12px] tracking-widest text-slate-600 hover:border-[#405189]/40 hover:bg-indigo-50 hover:text-[#405189]"
                    >
                      ***
                    </button>
                  </td>
                  <td className="px-3 py-1.5 text-slate-700">{row.grantedPermissionCount ?? 0}</td>
                  <td className="px-3 py-1.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        row.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {row.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex justify-end gap-1">
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => openForcePassword(row)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-[#405189] hover:bg-indigo-50"
                          aria-label={`Change password for ${row.userName}`}
                          title="Change password"
                        >
                          <KeyRound size={16} />
                        </button>
                      ) : null}
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => void startEdit(row)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-[#405189] hover:bg-indigo-50"
                          aria-label={`Edit ${row.userName}`}
                        >
                          <Pencil size={16} />
                        </button>
                      ) : null}
                      {canDeactivate ? (
                        <button
                          type="button"
                          onClick={() => void toggleStatus(row)}
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 ${
                            row.isActive ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                          aria-label={row.isActive ? `Deactivate ${row.userName}` : `Activate ${row.userName}`}
                        >
                          <Power size={16} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-[#405189]" />
            Loading users...
          </div>
        ) : null}

        {!isLoading && sortedRows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            {showActive ? 'No active users found.' : 'No inactive users found.'}
          </p>
        ) : null}
      </section>

      {revealedPassword ? (
        <div className="fixed inset-0 z-[85]" onClick={closeReveal}>
          <div
            role="dialog"
            aria-label="Password"
            className="absolute w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
            style={{ left: revealedPassword.x, top: revealedPassword.y }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Password</p>
                <p className="text-xs text-slate-500">{revealedPassword.userName}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {revealSecondsLeft}s
              </span>
            </div>
            <p className="break-all font-mono text-sm font-semibold text-slate-900">{revealedPassword.password}</p>
          </div>
        </div>
      ) : null}

      {passwordTarget ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitForcePassword}
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#405189] text-white">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Change password</h2>
                  <p className="text-sm text-slate-500">
                    Set a new password for {passwordTarget.userName || 'this user'}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeForcePassword}
                disabled={isSavingPassword}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 px-5 py-5">
              <label className="block text-xs font-semibold uppercase text-slate-500">
                New password
                <input
                  type="password"
                  className={`${inputClass} mt-1`}
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
                  }
                  maxLength={200}
                  required
                  autoComplete="new-password"
                />
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Confirm password
                <input
                  type="password"
                  className={`${inputClass} mt-1`}
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))
                  }
                  maxLength={200}
                  required
                  autoComplete="new-password"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                type="button"
                disabled={isSavingPassword}
                onClick={closeForcePassword}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingPassword}
                className="inline-flex items-center gap-2 rounded-lg bg-[#405189] px-4 py-2 text-sm font-semibold text-white hover:bg-[#344574] disabled:opacity-60"
              >
                {isSavingPassword ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                Save password
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {isEditorOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form
            onSubmit={submit}
            role="dialog"
            aria-modal="true"
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#405189] text-white">
                  {editingId ? <Pencil size={18} /> : <Plus size={18} />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit user' : 'Add user'}</h2>
                  <p className="text-sm text-slate-500">Set login details and allowed actions.</p>
                </div>
              </div>
              <button type="button" onClick={resetForm} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {isLoadingUser ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin text-[#405189]" />
                  Loading user...
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-semibold uppercase text-slate-500">
                      Username
                      <input
                        className={`${inputClass} mt-1`}
                        value={form.userName}
                        onChange={(event) => setValue('userName', event.target.value)}
                        maxLength={100}
                        required
                        autoComplete="off"
                      />
                    </label>
                    <label className="block text-xs font-semibold uppercase text-slate-500">
                      Password{' '}
                      {editingId ? <span className="font-normal normal-case text-slate-400">(leave blank to keep)</span> : null}
                      <div className="relative mt-1">
                        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="password"
                          className={`${inputClass} pl-9`}
                          value={form.password}
                          onChange={(event) => setValue('password', event.target.value)}
                          maxLength={200}
                          required={!editingId}
                          autoComplete="new-password"
                        />
                      </div>
                    </label>
                  </div>

                  <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(form.isActive)}
                      onChange={(event) => setValue('isActive', event.target.checked)}
                      className="h-4 w-4 accent-[#405189]"
                    />
                    Active
                  </label>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-800">Permissions</h3>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => selectAll(true)}
                          className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          onClick={() => selectAll(false)}
                          className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Clear all
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {permissionGroups.map((group) => {
                        const codes = (group.permissions || []).map((p) => p.code)
                        const checkedCount = codes.filter((code) => grantedSet.has(String(code).toLowerCase())).length
                        const allChecked = codes.length > 0 && checkedCount === codes.length
                        const someChecked = checkedCount > 0 && !allChecked

                        return (
                          <div key={group.moduleHead} className="overflow-hidden rounded-xl border border-slate-200">
                            <div className="flex items-center justify-between gap-3 bg-slate-50 px-3 py-2">
                              <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                <input
                                  type="checkbox"
                                  checked={allChecked}
                                  ref={(el) => {
                                    if (el) el.indeterminate = someChecked
                                  }}
                                  onChange={(event) => toggleGroup(group, event.target.checked)}
                                  className="h-4 w-4 accent-[#405189]"
                                />
                                {group.moduleHead}
                              </label>
                              <span className="text-xs text-slate-500">
                                {checkedCount}/{codes.length}
                              </span>
                            </div>
                            <div className="grid gap-1 p-2 sm:grid-cols-2">
                              {(group.permissions || []).map((permission) => (
                                <label
                                  key={permission.code}
                                  className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  <input
                                    type="checkbox"
                                    checked={grantedSet.has(String(permission.code).toLowerCase())}
                                    onChange={() => togglePermission(permission.code)}
                                    className="mt-0.5 h-4 w-4 accent-[#405189]"
                                  />
                                  <span className="font-medium">{permission.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                type="button"
                disabled={isSaving}
                onClick={resetForm}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || isLoadingUser}
                className="inline-flex items-center gap-2 rounded-lg bg-[#405189] px-4 py-2 text-sm font-semibold text-white hover:bg-[#344574] disabled:opacity-60"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingId ? 'Save changes' : 'Create user'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </AcademicLayout>
  )
}

export default AcademicUsersPage
