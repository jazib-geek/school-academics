import { useEffect, useMemo, useState } from 'react'
import { Loader2, X } from 'lucide-react'

const noteDateKey = (value) => String(value || '').slice(0, 10)

function EmployeeConductRecordSheet({
  studentName,
  date,
  types,
  existingNotes,
  initialTypeId,
  isSaving,
  onSave,
  onDelete,
  onClose,
}) {
  const activeTypes = types || []
  const [typeId, setTypeId] = useState(() => initialTypeId || activeTypes[0]?.id || 0)
  const [tagIds, setTagIds] = useState([])
  const [remarks, setRemarks] = useState('')

  const selectedType = useMemo(
    () => activeTypes.find((type) => type.id === typeId) || activeTypes[0] || null,
    [activeTypes, typeId],
  )

  const existingForType = useMemo(() => {
    const currentTypeId = selectedType?.id
    if (!currentTypeId) return null
    return (existingNotes || []).find((note) => note.conductTypeId === currentTypeId) || null
  }, [existingNotes, selectedType])

  useEffect(() => {
    if (initialTypeId) {
      setTypeId(initialTypeId)
      return
    }
    if (!typeId && activeTypes[0]?.id) {
      setTypeId(activeTypes[0].id)
    }
  }, [initialTypeId, activeTypes, typeId])

  useEffect(() => {
    if (existingForType) {
      const existingTagId = existingForType.tags?.[0]?.id
      setTagIds(existingTagId ? [existingTagId] : [])
      setRemarks(existingForType.remarks || '')
      return
    }
    setTagIds([])
    setRemarks('')
  }, [existingForType, selectedType?.id])

  const selectTag = (id) => {
    setTagIds((current) => (current[0] === id ? [] : [id]))
  }

  const canSave = Boolean(selectedType) && (tagIds.length > 0 || remarks.trim().length > 0)

  const submit = (event) => {
    event.preventDefault()
    if (!canSave || isSaving || !selectedType) return
    onSave({
      conductTypeId: selectedType.id,
      tagIds,
      remarks: remarks.trim(),
    })
  }

  return (
    <div className="emp-modal-backdrop fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4">
      <div className="emp-modal-card flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl ring-1 ring-slate-200 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-900">{studentName}</p>
            <p className="mt-0.5 text-xs text-slate-500">{noteDateKey(date)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="emp-icon-btn shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {activeTypes.map((type) => {
                const isActive = selectedType?.id === type.id
                const hasNote = (existingNotes || []).some((note) => note.conductTypeId === type.id)
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setTypeId(type.id)}
                    className={`rounded-full px-3 py-2 text-sm font-semibold ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'border border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    {type.name}
                    {hasNote && !isActive ? (
                      <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    ) : null}
                  </button>
                )
              })}
            </div>

            {selectedType ? (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Quick picks
                </p>
                <p className="mt-1 text-xs text-slate-500">Choose one. Extra detail can go in the note.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(selectedType.tags || []).map((tag) => {
                    const selected = tagIds.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => selectTag(tag.id)}
                        className={`rounded-full px-3 py-2 text-sm font-medium ${
                          selected
                            ? tag.isGood
                              ? 'bg-emerald-600 text-white'
                              : 'bg-rose-600 text-white'
                            : 'border border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        {tag.name}
                      </button>
                    )
                  })}
                </div>

                <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Extra note
                  <textarea
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Optional details"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </label>
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No conduct types are available.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
            {existingForType ? (
              <button
                type="button"
                onClick={() => onDelete(existingForType.id)}
                disabled={isSaving}
                className="emp-cta-btn emp-cta-btn-outline mr-auto text-rose-700"
              >
                Remove
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="emp-cta-btn emp-cta-btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave || isSaving}
              className="emp-cta-btn emp-cta-btn-primary min-w-[5.5rem]"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : existingForType ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EmployeeConductRecordSheet
export { noteDateKey }
