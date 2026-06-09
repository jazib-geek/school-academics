import { useCallback, useEffect, useState } from 'react'
import { Loader2, Pencil, Plus, Save, Shapes, Trash2, X } from 'lucide-react'
import AcademicLayout from '../../../components/academics/AcademicLayout'
import {
  deleteAcademicClass,
  getAcademicClasses,
  upsertAcademicClass,
} from '../../../services/academicCatalogService'

function AcademicClassesPage() {
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ id: '', className: '' })

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await getAcademicClasses()
      setRows(data)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to load classes.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timerId = setTimeout(() => load(), 0)
    return () => clearTimeout(timerId)
  }, [load])

  const onSubmit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    try {
      await upsertAcademicClass({
        id: form.id ? Number(form.id) : undefined,
        className: form.className,
      })
      await load()
      setIsModalOpen(false)
      setForm({ id: '', className: '' })
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Class save failed.')
    } finally {
      setIsSaving(false)
    }
  }

  const openCreateModal = () => {
    setError('')
    setForm({ id: '', className: '' })
    setIsModalOpen(true)
  }

  const openEditModal = (item) => {
    setError('')
    setForm({ id: String(item.id), className: item.className })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (isSaving) return
    setIsModalOpen(false)
  }

  const onDelete = async (itemId) => {
    setDeletingId(itemId)
    setError('')
    try {
      await deleteAcademicClass(itemId)
      await load()
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Class delete failed.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <AcademicLayout
      pageTitle="Classes"
      pageSubtitle="Manage shared academic classes."
      pageIcon={<Shapes size={18} />}
      isSingleCardLayout
      pageActions={
        <button type="button" onClick={openCreateModal} className="btn-soft btn-soft-primary">
          <Plus size={16} />
          Add Class
        </button>
      }
    >
      {error ? (
        <section className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </section>
      ) : null}

      <section className="max-h-[65vh] overflow-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[520px] border-collapse text-sm md:min-w-[640px]">
          <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="border border-slate-200 px-2 py-2 font-semibold md:px-4 md:py-3">Sr #</th>
              <th className="border border-slate-200 px-2 py-2 font-semibold md:px-4 md:py-3">
                Class Name
              </th>
              <th className="border border-slate-200 px-2 py-2 text-right font-semibold md:px-4 md:py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="border border-slate-200 px-2 py-12 md:px-4">
                  <div className="flex items-center justify-center gap-2 text-slate-500">
                    <Loader2 size={18} className="animate-spin text-[#405189]" />
                    <span>Loading classes...</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="border border-slate-200 px-2 py-10 text-center text-slate-500 md:px-4"
                >
                  No classes found.
                </td>
              </tr>
            ) : (
              rows.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="border border-slate-200 px-2 py-2.5 font-medium text-slate-700 md:px-4 md:py-3">
                    {index + 1}
                  </td>
                  <td className="border border-slate-200 px-2 py-2.5 text-slate-700 md:px-4 md:py-3">
                    {item.className}
                  </td>
                  <td className="border border-slate-200 px-2 py-2.5 md:px-4 md:py-3">
                    <div className="flex justify-end">
                      <div className="action-group">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="action-link action-link-success"
                        >
                          <Pencil size={14} />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="action-link action-link-danger"
                        >
                          {deletingId === item.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <div
        className={`fixed inset-0 z-[80] flex items-center justify-center p-4 transition-all duration-300 ${
          isModalOpen
            ? 'pointer-events-auto bg-slate-900/40 opacity-100 backdrop-blur-sm'
            : 'pointer-events-none bg-slate-900/0 opacity-0 backdrop-blur-0'
        }`}
      >
        <div
          className={`w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl transition-all duration-300 ${
            isModalOpen ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-95 opacity-0'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                {form.id ? 'Edit Class' : 'Add New Class'}
              </h3>
              <p className="mt-1 text-sm text-slate-500">Enter class details below.</p>
            </div>
            <button
              type="button"
              onClick={closeModal}
              disabled={isSaving}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Class Name
              </label>
              <input
                value={form.className}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, className: event.target.value }))
                }
                placeholder="Enter class name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-0 transition focus:border-[#405189] focus:ring-2 focus:ring-indigo-100"
                required
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="btn-soft btn-soft-primary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-soft btn-soft-success"
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : form.id ? (
                  <Pencil size={16} />
                ) : (
                  <Save size={16} />
                )}
                {isSaving ? 'Saving...' : form.id ? 'Update Class' : 'Save Class'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AcademicLayout>
  )
}

export default AcademicClassesPage
