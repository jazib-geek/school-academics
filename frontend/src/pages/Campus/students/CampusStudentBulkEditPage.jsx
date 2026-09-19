import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  GraduationCap,
  Loader2,
  Save,
  TableProperties,
} from 'lucide-react'
import Select from 'react-select'
import { toast } from 'sonner'
import CampusShell from '../../../components/campus/CampusShell.jsx'
import { getClasses } from '../../../services/classService'
import { hasCampusPermission } from '../../../services/authService'
import { getBulkEditStudents, bulkUpdateStudent } from '../../../services/studentService'

const inputClass =
  'h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[13px] text-slate-800 outline-none transition focus:border-[var(--campus-primary)] focus:ring-1 focus:ring-indigo-100'
const inputDirty = 'border-amber-400 bg-amber-50/60 focus:border-amber-500 focus:ring-amber-100'
const inputSaved = 'border-emerald-400 bg-emerald-50/50'

function toNum(value) {
  if (value === '' || value == null) return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function mapRow(row) {
  const classFee = Number(row.classFee ?? 0)
  const tuitionFee = Number(row.tuitionFee ?? 0)
  return {
    regId: row.regId,
    familyCode: row.familyCode ?? null,
    fullName: row.fullName || '',
    fatherName: row.fatherName || '',
    fatherContact: row.fatherContact || '',
    homeAddress: row.homeAddress || '',
    classCompositeId: row.classCompositeId != null ? String(row.classCompositeId) : '',
    className: row.className || '',
    classFee,
    tuitionFee: String(tuitionFee),
    feeConcession: Number(row.feeConcession ?? Math.max(0, classFee - tuitionFee)),
    dirty: false,
    saved: false,
    saving: false,
  }
}

function rowSnapshot(row) {
  return JSON.stringify({
    fullName: row.fullName.trim(),
    fatherName: row.fatherName.trim(),
    fatherContact: row.fatherContact.trim(),
    homeAddress: row.homeAddress.trim(),
    classCompositeId: String(row.classCompositeId || ''),
    tuitionFee: String(toNum(row.tuitionFee)),
  })
}

function CampusStudentBulkEditPage() {
  const navigate = useNavigate()
  const canUpdateFee = hasCampusPermission('update_fee')
  const canTransferClass = hasCampusPermission('trasnfer_std')
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [rows, setRows] = useState([])
  const [baselines, setBaselines] = useState({})
  const [isClassesLoading, setIsClassesLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const classOptions = useMemo(
    () =>
      (classes || []).map((item) => ({
        value: String(item.id),
        label: item.className,
        fee: item.fee ?? 0,
      })),
    [classes],
  )

  const selectedClassOption = classOptions.find((o) => o.value === String(selectedClassId)) || null

  const feeByClassId = useMemo(() => {
    const map = {}
    for (const item of classes || []) {
      map[String(item.id)] = Number(item.fee ?? 0)
    }
    return map
  }, [classes])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setIsClassesLoading(true)
      try {
        const list = await getClasses()
        if (!cancelled) setClasses(list || [])
      } catch {
        if (!cancelled) {
          setClasses([])
          toast.error('Could not load classes.')
        }
      } finally {
        if (!cancelled) setIsClassesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const loadStudents = useCallback(async (classCompositeId) => {
    if (!classCompositeId) {
      setRows([])
      setBaselines({})
      return
    }
    setIsLoading(true)
    try {
      const data = await getBulkEditStudents(Number(classCompositeId))
      const mapped = (data || []).map(mapRow)
      const nextBaselines = {}
      for (const row of mapped) nextBaselines[row.regId] = rowSnapshot(row)
      setRows(mapped)
      setBaselines(nextBaselines)
    } catch (error) {
      setRows([])
      setBaselines({})
      toast.error(error?.response?.data?.message || 'Could not load students for this class.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStudents(selectedClassId)
  }, [selectedClassId, loadStudents])

  const updateRow = (regId, patch) => {
    setRows((current) =>
      current.map((row) => {
        if (row.regId !== regId) return row

        const next = { ...row, ...patch, saved: false }
        if (Object.prototype.hasOwnProperty.call(patch, 'classCompositeId')) {
          const fee = feeByClassId[String(next.classCompositeId)] ?? next.classFee
          next.classFee = fee
          next.className =
            classOptions.find((o) => o.value === String(next.classCompositeId))?.label || next.className
        }
        if (
          Object.prototype.hasOwnProperty.call(patch, 'tuitionFee')
          || Object.prototype.hasOwnProperty.call(patch, 'classCompositeId')
        ) {
          next.feeConcession = Math.max(0, Number(next.classFee || 0) - toNum(next.tuitionFee))
        }

        const baseline = baselines[regId]
        next.dirty = baseline ? rowSnapshot(next) !== baseline : true
        return next
      }),
    )
  }

  const saveRow = async (regId) => {
    const row = rows.find((r) => r.regId === regId)
    if (!row || row.saving) return
    if (!String(row.fullName || '').trim()) {
      toast.error('Student name is required.')
      return
    }
    if (!row.classCompositeId) {
      toast.error('Class is required.')
      return
    }

    setRows((current) =>
      current.map((r) => (r.regId === regId ? { ...r, saving: true } : r)),
    )

    try {
      const result = await bulkUpdateStudent(regId, {
        fullName: row.fullName.trim(),
        fatherName: row.fatherName.trim() || null,
        fatherContact: row.fatherContact.trim() || null,
        homeAddress: row.homeAddress.trim() || null,
        classCompositeId: Number(row.classCompositeId),
        tuitionFee: toNum(row.tuitionFee),
      })

      setBaselines((current) => {
        const next = { ...current }
        const updatedRow = {
          ...row,
          fullName: result.fullName || row.fullName,
          classFee: Number(result.classFee ?? row.classFee),
          tuitionFee: String(result.tuitionFee ?? toNum(row.tuitionFee)),
          classCompositeId: result.classCompositeId != null ? String(result.classCompositeId) : row.classCompositeId,
          homeAddress: row.homeAddress,
        }
        next[regId] = rowSnapshot(updatedRow)

        if (Number(result.familyAddressUpdatedCount || 0) > 0 && row.familyCode) {
          for (const sibling of rows) {
            if (sibling.regId === regId || sibling.familyCode !== row.familyCode) continue
            const synced = { ...sibling, homeAddress: row.homeAddress.trim() }
            next[sibling.regId] = rowSnapshot(synced)
          }
        }
        return next
      })

      setRows((current) =>
        current.map((r) => {
          if (r.regId === regId) {
            return {
              ...r,
              fullName: result.fullName || r.fullName,
              classFee: Number(result.classFee ?? r.classFee),
              tuitionFee: String(result.tuitionFee ?? toNum(r.tuitionFee)),
              feeConcession: Number(result.feeConcession ?? r.feeConcession),
              classCompositeId: result.classCompositeId != null ? String(result.classCompositeId) : r.classCompositeId,
              className: result.className || r.className,
              homeAddress: row.homeAddress,
              dirty: false,
              saved: true,
              saving: false,
            }
          }

          if (
            Number(result.familyAddressUpdatedCount || 0) > 0
            && row.familyCode
            && r.familyCode === row.familyCode
          ) {
            return {
              ...r,
              homeAddress: row.homeAddress.trim(),
              dirty: false,
            }
          }

          return r
        }),
      )

      const siblingNote =
        Number(result.familyAddressUpdatedCount || 0) > 0
          ? ` Address also updated for ${result.familyAddressUpdatedCount} sibling(s).`
          : ''
      toast.success(`Updated #${result.regId}.${siblingNote}`)
    } catch (error) {
      setRows((current) =>
        current.map((r) => (r.regId === regId ? { ...r, saving: false } : r)),
      )
      toast.error(error?.response?.data?.message || 'Could not update student.')
    }
  }

  const dirtyCount = rows.filter((r) => r.dirty).length
  const savedCount = rows.filter((r) => r.saved).length

  return (
    <CampusShell headerContext="Bulk Edit">
      <div className="space-y-4 p-4 pt-[4.25rem] md:p-6 md:pt-[4.5rem]">
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => navigate('/campus/students')}
                className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                title="Back to students"
                aria-label="Back to students"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--campus-primary)] text-white">
                <TableProperties size={18} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Bulk student edit</h1>
                <p className="text-sm text-slate-500">
                  Pick a class, edit rows, then update each changed student.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {dirtyCount > 0 ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">
                  {dirtyCount} unsaved
                </span>
              ) : null}
              {savedCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">
                  <BadgeCheck size={13} />
                  {savedCount} updated
                </span>
              ) : null}
            </div>
          </div>

          <div className="relative z-20 mt-4 flex justify-center">
            <div className="flex w-full max-w-sm items-stretch rounded-xl border border-slate-300 bg-white shadow-sm focus-within:border-[var(--campus-primary)] focus-within:ring-2 focus-within:ring-indigo-100">
              <div className="flex shrink-0 items-center gap-1.5 rounded-l-xl border-r border-slate-200 bg-slate-50 px-3 text-slate-600">
                <GraduationCap size={16} className="text-[var(--campus-primary)]" />
                <span className="text-xs font-semibold uppercase tracking-wide">Class</span>
              </div>
              <div className="min-w-0 flex-1">
                <Select
                  isClearable
                  isSearchable
                  isLoading={isClassesLoading}
                  options={classOptions}
                  placeholder="Select class"
                  value={selectedClassOption}
                  onChange={(option) => setSelectedClassId(option?.value || '')}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  menuPosition="fixed"
                  className="text-sm"
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '40px',
                      border: 'none',
                      borderRadius: '0 0.75rem 0.75rem 0',
                      boxShadow: 'none',
                      backgroundColor: 'transparent',
                      '&:hover': { border: 'none' },
                    }),
                    valueContainer: (base) => ({
                      ...base,
                      paddingLeft: 10,
                      paddingRight: 4,
                    }),
                    indicatorSeparator: () => ({ display: 'none' }),
                    menu: (base) => ({ ...base, zIndex: 80 }),
                    menuPortal: (base) => ({ ...base, zIndex: 80 }),
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {!selectedClassId ? (
            <p className="p-8 text-center text-sm text-slate-500">
              Select a class to load students for editing.
            </p>
          ) : isLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--campus-primary)]" />
              Loading students...
            </div>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">No active students in this class.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-[13px] leading-snug">
                <thead className="bg-[var(--campus-primary)] text-left text-white">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Reg ID</th>
                    <th className="px-3 py-2 font-semibold min-w-[140px]">Full Name</th>
                    <th className="px-3 py-2 font-semibold min-w-[140px]">Father Name</th>
                    <th className="px-3 py-2 font-semibold min-w-[120px]">Father Contact</th>
                    <th className="px-3 py-2 font-semibold min-w-[160px]">Class</th>
                    <th className="w-24 px-3 py-2 font-semibold text-right">Tuition Fee</th>
                    <th className="px-3 py-2 font-semibold min-w-[280px]">Address</th>
                    <th className="px-3 py-2 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const fieldClass = row.saved ? inputSaved : row.dirty ? inputDirty : ''
                    return (
                      <tr
                        key={row.regId}
                        className={`border-t border-slate-100 ${
                          row.saved
                            ? 'bg-emerald-50/40'
                            : row.dirty
                              ? 'bg-amber-50/30'
                              : 'bg-white'
                        }`}
                      >
                        <td className="px-3 py-1.5 whitespace-nowrap font-medium text-slate-700">
                          <div className="flex items-center gap-1.5">
                            {row.regId}
                            {row.saved ? (
                              <span
                                className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700"
                                title="Updated"
                              >
                                <Check size={11} />
                                Updated
                              </span>
                            ) : row.dirty ? (
                              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                Edited
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            className={`${inputClass} ${fieldClass}`}
                            value={row.fullName}
                            onChange={(e) => updateRow(row.regId, { fullName: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            className={`${inputClass} ${fieldClass}`}
                            value={row.fatherName}
                            onChange={(e) => updateRow(row.regId, { fatherName: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            className={`${inputClass} ${fieldClass}`}
                            value={row.fatherContact}
                            onChange={(e) => updateRow(row.regId, { fatherContact: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <span
                            className="block"
                            title={
                              canTransferClass
                                ? undefined
                                : "You don't have access to transfer / change class."
                            }
                          >
                            <select
                              className={`${inputClass} ${fieldClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70`}
                              value={row.classCompositeId}
                              disabled={!canTransferClass}
                              onChange={(e) => updateRow(row.regId, { classCompositeId: e.target.value })}
                            >
                              <option value="">-- select --</option>
                              {classes.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.className}
                                </option>
                              ))}
                            </select>
                          </span>
                        </td>
                        <td className="w-24 px-3 py-1.5">
                          <span
                            className="inline-flex"
                            title={
                              canUpdateFee
                                ? undefined
                                : "You don't have access to update fee."
                            }
                          >
                            <input
                              type="number"
                              min="0"
                              max="9999"
                              inputMode="numeric"
                              className={`${inputClass} ${fieldClass} w-20 text-right disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70`}
                              value={row.tuitionFee}
                              disabled={!canUpdateFee}
                              onChange={(e) => {
                                if (!canUpdateFee) return
                                const digits = e.target.value.replace(/[^\d]/g, '').slice(0, 4)
                                updateRow(row.regId, { tuitionFee: digits })
                              }}
                            />
                          </span>
                        </td>
                        <td className="min-w-[280px] px-3 py-1.5">
                          <input
                            className={`${inputClass} ${fieldClass}`}
                            value={row.homeAddress}
                            onChange={(e) => updateRow(row.regId, { homeAddress: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <button
                            type="button"
                            disabled={!row.dirty || row.saving}
                            onClick={() => void saveRow(row.regId)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--campus-primary)] px-3 text-xs font-semibold text-white transition hover:bg-[#34457c] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {row.saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                            Update
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </CampusShell>
  )
}

export default CampusStudentBulkEditPage
