import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookCopy, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import Select from 'react-select'
import AcademicLayout from '../../../components/academics/AcademicLayout'
import {
  deleteAcademicChapter,
  getAcademicChapters,
  getAcademicClasses,
  getAcademicSubjects,
  upsertAcademicChapter,
} from '../../../services/academicCatalogService'

const emptyForm = {
  id: '',
  classId: '',
  subjectId: '',
  chapterNo: '',
  chapterName: '',
}

function AcademicChaptersPage() {
  const [rows, setRows] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ classId: '', subjectId: '', search: '' })
  const [form, setForm] = useState(emptyForm)

  const classOptions = useMemo(
    () => classes.map((item) => ({ value: item.id, label: item.className })),
    [classes],
  )
  const subjectOptions = useMemo(
    () => subjects.map((item) => ({ value: item.id, label: item.subjectName })),
    [subjects],
  )

  const selectedFilterClass = useMemo(
    () => classOptions.find((option) => option.value === Number(filters.classId)) || null,
    [classOptions, filters.classId],
  )
  const selectedFilterSubject = useMemo(
    () => subjectOptions.find((option) => option.value === Number(filters.subjectId)) || null,
    [filters.subjectId, subjectOptions],
  )
  const selectedFormClass = useMemo(
    () => classOptions.find((option) => option.value === Number(form.classId)) || null,
    [classOptions, form.classId],
  )
  const selectedFormSubject = useMemo(
    () => subjectOptions.find((option) => option.value === Number(form.subjectId)) || null,
    [form.subjectId, subjectOptions],
  )

  const filteredRows = useMemo(() => {
    const keyword = filters.search.trim().toLowerCase()
    return rows.filter((item) => {
      if (filters.classId && item.classId !== Number(filters.classId)) return false
      if (filters.subjectId && item.subjectId !== Number(filters.subjectId)) return false
      if (!keyword) return true
      return (
        item.chapterName.toLowerCase().includes(keyword) ||
        item.className.toLowerCase().includes(keyword) ||
        item.subjectName.toLowerCase().includes(keyword) ||
        String(item.chapterNo).includes(keyword)
      )
    })
  }, [filters, rows])

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const [chapterData, classData, subjectData] = await Promise.all([
        getAcademicChapters(),
        getAcademicClasses(),
        getAcademicSubjects(),
      ])
      setRows(chapterData)
      setClasses(classData)
      setSubjects(subjectData)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to load chapters.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timerId = setTimeout(() => load(), 0)
    return () => clearTimeout(timerId)
  }, [load])

  const openCreateModal = () => {
    setError('')
    setForm(emptyForm)
    setIsModalOpen(true)
  }

  const openEditModal = (item) => {
    setError('')
    setForm({
      id: String(item.id),
      classId: String(item.classId),
      subjectId: String(item.subjectId),
      chapterNo: String(item.chapterNo),
      chapterName: item.chapterName,
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (isSaving) return
    setIsModalOpen(false)
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    try {
      await upsertAcademicChapter({
        id: form.id ? Number(form.id) : undefined,
        classId: Number(form.classId),
        subjectId: Number(form.subjectId),
        chapterNo: Number(form.chapterNo),
        chapterName: form.chapterName,
      })
      await load()
      setIsModalOpen(false)
      setForm(emptyForm)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Chapter save failed.')
    } finally {
      setIsSaving(false)
    }
  }

  const onDelete = async (itemId) => {
    setDeletingId(itemId)
    setError('')
    try {
      await deleteAcademicChapter(itemId)
      await load()
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Chapter delete failed.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <AcademicLayout
      pageTitle="Chapters"
      pageSubtitle="Manage class and subject wise chapter catalog."
      pageIcon={<BookCopy size={18} />}
      isSingleCardLayout
      pageActions={
        <button type="button" onClick={openCreateModal} className="btn-soft btn-soft-primary">
          <Plus size={16} />
          Add Chapter
        </button>
      }
    >
      {error ? (
        <section className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </section>
      ) : null}

      <section className="mb-4 grid gap-3 md:grid-cols-3">
        <Select
          options={classOptions}
          value={selectedFilterClass}
          onChange={(option) => setFilters((p) => ({ ...p, classId: option?.value ? String(option.value) : '' }))}
          isClearable
          placeholder="Filter by class"
        />
        <Select
          options={subjectOptions}
          value={selectedFilterSubject}
          onChange={(option) =>
            setFilters((p) => ({ ...p, subjectId: option?.value ? String(option.value) : '' }))
          }
          isClearable
          placeholder="Filter by subject"
        />
        <input
          value={filters.search}
          onChange={(event) => setFilters((p) => ({ ...p, search: event.target.value }))}
          placeholder="Search chapter name/no"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#405189] focus:ring-2 focus:ring-indigo-100"
        />
      </section>

      <section className="max-h-[65vh] overflow-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[720px] border-collapse text-[13px] leading-snug">
          <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="border border-slate-200 px-3 py-2 font-semibold">Sr #</th>
              <th className="border border-slate-200 px-3 py-2 font-semibold">Class</th>
              <th className="border border-slate-200 px-3 py-2 font-semibold">Subject</th>
              <th className="border border-slate-200 px-3 py-2 font-semibold">Chapter No</th>
              <th className="border border-slate-200 px-3 py-2 font-semibold">Chapter Name</th>
              <th className="border border-slate-200 px-3 py-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="border border-slate-200 px-4 py-12">
                  <div className="flex items-center justify-center gap-2 text-slate-500">
                    <Loader2 size={18} className="animate-spin text-[#405189]" />
                    <span>Loading chapters...</span>
                  </div>
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="border border-slate-200 px-4 py-10 text-center text-slate-500">
                  No chapters found.
                </td>
              </tr>
            ) : (
              filteredRows.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="border border-slate-200 px-3 py-1.5">{index + 1}</td>
                  <td className="border border-slate-200 px-3 py-1.5">{item.className}</td>
                  <td className="border border-slate-200 px-3 py-1.5">{item.subjectName}</td>
                  <td className="border border-slate-200 px-3 py-1.5">{item.chapterNo}</td>
                  <td className="border border-slate-200 px-3 py-1.5">{item.chapterName}</td>
                  <td className="border border-slate-200 px-3 py-1.5">
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
          className={`w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl transition-all duration-300 ${
            isModalOpen ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-95 opacity-0'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                {form.id ? 'Edit Chapter' : 'Add New Chapter'}
              </h3>
              <p className="mt-1 text-sm text-slate-500">Fill details and save the chapter.</p>
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

          <form onSubmit={onSubmit} className="mt-4 grid gap-3">
            <Select
              options={classOptions}
              value={selectedFormClass}
              onChange={(option) => setForm((p) => ({ ...p, classId: option?.value ? String(option.value) : '' }))}
              placeholder="Select class"
              required
            />
            <Select
              options={subjectOptions}
              value={selectedFormSubject}
              onChange={(option) =>
                setForm((p) => ({ ...p, subjectId: option?.value ? String(option.value) : '' }))
              }
              placeholder="Select subject"
              required
            />
            <input
              value={form.chapterNo}
              onChange={(event) => setForm((p) => ({ ...p, chapterNo: event.target.value }))}
              placeholder="Chapter number"
              type="number"
              min={1}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#405189] focus:ring-2 focus:ring-indigo-100"
              required
            />
            <input
              value={form.chapterName}
              onChange={(event) => setForm((p) => ({ ...p, chapterName: event.target.value }))}
              placeholder="Chapter name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#405189] focus:ring-2 focus:ring-indigo-100"
              required
            />

            <div className="mt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="btn-soft btn-soft-primary"
              >
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className="btn-soft btn-soft-success">
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : form.id ? (
                  <Pencil size={16} />
                ) : (
                  <Save size={16} />
                )}
                {isSaving ? 'Saving...' : form.id ? 'Update Chapter' : 'Save Chapter'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AcademicLayout>
  )
}

export default AcademicChaptersPage
