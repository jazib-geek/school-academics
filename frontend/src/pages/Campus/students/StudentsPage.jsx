import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BookOpenCheck,
  CalendarCheck2,
  ClipboardCheck,
  FileBarChart2,
  Loader2,
  MoreVertical,
  School,
  Settings,
  Shapes,
  UserCheck,
  UsersRound,
  X,
} from 'lucide-react'
import Select from 'react-select'
import { getClasses } from '../../../services/classService'
import { getStudentFamilyMembers, getStudentLedger, getStudents } from '../../../services/studentService'
import CampusShell from '../../../components/campus/CampusShell.jsx'

const initialFilters = {
  class: '',
  name: '',
  reg_Id: '',
  status: 'active',
  gender: '',
  pageNumber: 1,
  pageSize: 10,
}

function StudentsPage() {
  const [filters, setFilters] = useState(initialFilters)
  const [result, setResult] = useState({
    items: [],
    totalCount: 0,
    totalPages: 0,
    pageNumber: 1,
    pageSize: 10,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isClassesLoading, setIsClassesLoading] = useState(false)
  const [isLedgerLoading, setIsLedgerLoading] = useState(false)
  const [ledgerItems, setLedgerItems] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [openActionForRegId, setOpenActionForRegId] = useState(null)
  /** Desktop and mobile each render a menu when open; one ref would only attach to one node. */
  const actionMenuDesktopRef = useRef(null)
  const actionMenuMobileRef = useRef(null)
  const [familyModal, setFamilyModal] = useState(null)
  const [familyMembers, setFamilyMembers] = useState([])
  const [isFamilyLoading, setIsFamilyLoading] = useState(false)
  const [classOptions, setClassOptions] = useState([])
  const [error, setError] = useState('')
  const classSelectOptions = classOptions.map((item) => ({
    value: item.className,
    label: item.className,
  }))

  const loadStudents = useCallback(async (query) => {
    setIsLoading(true)
    setError('')
    try {
      const data = await getStudents({
        class: query.class || undefined,
        name: query.name?.trim() || undefined,
        reg_Id: query.reg_Id ? Number(query.reg_Id) : undefined,
        isActive:
          query.status === 'all'
            ? undefined
            : query.status === 'active',
        gender: query.gender || undefined,
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
      })

      setResult({
        items: data?.items || [],
        totalCount: data?.totalCount || 0,
        totalPages: data?.totalPages || 0,
        pageNumber: data?.pageNumber || query.pageNumber,
        pageSize: data?.pageSize || query.pageSize,
      })
    } catch {
      setError('Unable to load students. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadClasses = useCallback(async () => {
    setIsClassesLoading(true)
    try {
      const classes = await getClasses()
      setClassOptions(classes)
    } catch {
      setClassOptions([])
    } finally {
      setIsClassesLoading(false)
    }
  }, [])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadStudents(initialFilters)
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadStudents])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadClasses()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadClasses])

  const onFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((previous) => ({ ...previous, [name]: value }))
  }

  const onApplyFilters = (event) => {
    event.preventDefault()
    const next = { ...filters, pageNumber: 1 }
    setFilters(next)
    loadStudents(next)
  }

  const onResetFilters = () => {
    setFilters(initialFilters)
    loadStudents(initialFilters)
  }

  const onPageChange = (nextPage) => {
    const next = { ...filters, pageNumber: nextPage }
    setFilters(next)
    loadStudents(next)
  }

  const openLedger = async (student) => {
    setOpenActionForRegId(null)
    setSelectedStudent(student)
    setIsLedgerLoading(true)
    try {
      const ledger = await getStudentLedger(student.reg_Id)
      setLedgerItems(ledger)
    } catch {
      setLedgerItems([])
    } finally {
      setIsLedgerLoading(false)
    }
  }

  const closeLedger = () => {
    setSelectedStudent(null)
    setLedgerItems([])
  }

  useEffect(() => {
    if (openActionForRegId == null) return
    const onDocMouseDown = (event) => {
      const target = event.target
      const insideDesktop = actionMenuDesktopRef.current?.contains(target)
      const insideMobile = actionMenuMobileRef.current?.contains(target)
      if (!insideDesktop && !insideMobile) {
        setOpenActionForRegId(null)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [openActionForRegId])

  useEffect(() => {
    if (!familyModal) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setFamilyModal(null)
        setFamilyMembers([])
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [familyModal])

  const openFamily = async (student) => {
    const familyId = student.familyID ?? student.FamilyID
    if (familyId == null || familyId === '') {
      return
    }
    setFamilyModal({ familyId: Number(familyId), familyCode: String(familyId) })
    setIsFamilyLoading(true)
    setFamilyMembers([])
    try {
      const rows = await getStudentFamilyMembers(Number(familyId))
      setFamilyMembers(Array.isArray(rows) ? rows : [])
    } catch {
      setFamilyMembers([])
    } finally {
      setIsFamilyLoading(false)
    }
  }

  const closeFamily = () => {
    setFamilyModal(null)
    setFamilyMembers([])
  }

  const familyRowRegId = (row) => row.reg_Id ?? row.regId
  const familyRowName = (row) => row.studentName ?? row.StudentName ?? '-'
  const familyRowClass = (row) => row.className ?? row.ClassName ?? '-'
  const familyRowFather = (row) => row.fatherName ?? row.FatherName ?? '-'
  const familyRowContact = (row) => row.fatherContact ?? row.FatherContact ?? '-'
  const familyRowRegDate = (row) => row.regDate ?? row.RegDate

  const formatDate = (value) => {
    if (!value) return '-'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return '-'
    return parsed.toLocaleDateString()
  }

  const formatAmount = (value) =>
    Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const closingBalance =
    ledgerItems.length > 0 ? ledgerItems[ledgerItems.length - 1]?.balance : null

  const GenderAvatar = ({ gender }) => {
    const normalized = (gender || '').toLowerCase()
    const isFemale = normalized === 'female'

    return (
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
          isFemale ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
        }`}
        title={gender || 'Male'}
      >
        {isFemale ? (
          <svg viewBox="0 0 100 100" className="h-4 w-4" aria-hidden="true">
            <path
              style={{ fill: '#5F3E20', stroke: '#311710' }}
              d="M 24,57 C 31,49 25,27 28,19 32,8 36,1 47,1 c 13,0 20,10 24,20 1,2 0,8 2,14 2,5 -1,10 -1,12 0,5 -1,3 3,10 -7,17 -40,13 -51,0 z"
            />
            <path
              style={{ fill: '#E78FB3', stroke: '#B85D87' }}
              d="m 40,51 c -5,6 -22,4 -25,17 -2,7 -1,30 14,28 -1,-18 -3,-27 -3,-27 0,0 2,17 3,25 11,6 28,6 42,-1 0,-8 -1,-15 0,-22 1,-6 0,24 0,24 0,0 9,2 12,-7 C 85,77 88,61 74,57 63,54 62,51 60,51 58,51 40,51 40,51 z"
            />
            <path
              style={{ fill: '#DEB89F', stroke: '#693311' }}
              d="m 40,45 c 0,0 1,4 -1,7 4,4 13,10 21,0 -1,-3 -1,-3 -1,-7 0,0 -19,0 -19,0 z"
            />
            <path
              style={{ fill: '#DBBFA8', stroke: '#693311' }}
              d="M 50,50 C 33,50 22,4 49,3.4 73,5 66,50 50,50 z"
            />
            <path
              style={{ fill: '#5F3E20' }}
              d="M 46,12 C 42,17 37,21 32,22 27,23 34,2 47,2 54,2 64,6 66,20 58,21 48,15 46,12"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 100 100" className="h-4 w-4" aria-hidden="true">
            <path
              style={{ fill: '#427794', stroke: '#2A424F' }}
              d="m 39,52 c -5,6 -20,3 -23,16 -2,7 -2,30 13,28 -1,-18 -3,-27 -3,-27 0,0 2,17 3,25 11,6 28,6 42,-1 0,-8 -1,-15 0,-22 1,-6 0,24 0,24 0,0 9,2 12,-7 C 85,77 88,59 70,55 59,53 62,52 60,52 58,52 39,52 39,52 z"
            />
            <path
              style={{ fill: '#C29B82', stroke: '#693311' }}
              d="m 40,45 c 0,0 1,4 -1,7 4,4 13,10 21,0 -1,-3 -1,-3 -1,-7 0,0 -19,0 -19,0 z"
            />
            <path
              style={{ fill: '#CDA68E', stroke: '#693311' }}
              d="M 50,50 C 33,50 21,4.1 49,3.4 79,3.3 66,50 50,50 z"
            />
            <path
              style={{ fill: '#553932', stroke: '#311710' }}
              d="M 33,30 C 29,19 29,2.2 49,1.2 66,2.1 72,18 66,30 66,25 67,23 64,19 59,18 52,19 46,12 44,18 30,15 33,30 z"
            />
          </svg>
        )}
      </span>
    )
  }

  return (
    <>
      <CampusShell>
        <div className="space-y-4 p-4 pt-20 md:p-6 md:pt-24">
            <form
              onSubmit={onApplyFilters}
              className="space-y-3 rounded-2xl bg-white p-4 shadow-sm"
            >
              <div className="mb-1 flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#405189] text-white">
                  <School size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Students Directory</h1>
                  <p className="text-sm text-slate-500">
                    Search and manage students with quick filters.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-3">
                  <input
                    name="name"
                    value={filters.name}
                    onChange={onFilterChange}
                    placeholder="Student name"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-3">
                  <Select
                    isClearable
                    isSearchable
                    isLoading={isClassesLoading}
                    options={classSelectOptions}
                    placeholder="Search class"
                    value={
                      filters.class
                        ? { value: filters.class, label: filters.class }
                        : null
                    }
                    onChange={(selectedOption) =>
                      setFilters((previous) => ({
                        ...previous,
                        class: selectedOption?.value || '',
                      }))
                    }
                    className="text-sm"
                    styles={{
                      control: (baseStyles) => ({
                        ...baseStyles,
                        minHeight: '40px',
                        borderRadius: '0.5rem',
                      }),
                      menu: (baseStyles) => ({
                        ...baseStyles,
                        zIndex: 60,
                      }),
                    }}
                  />
                </div>
                <input
                  name="reg_Id"
                  value={filters.reg_Id}
                  onChange={onFilterChange}
                  placeholder="Registration ID"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
                />
                <select
                  name="gender"
                  value={filters.gender}
                  onChange={onFilterChange}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
                >
                  <option value="">Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <div className="flex gap-2 md:col-span-2">
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-[#405189] px-3 py-2 text-sm font-medium text-white"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm font-medium text-slate-600">Status:</span>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={filters.status === 'active'}
                    onChange={onFilterChange}
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="radio"
                    name="status"
                    value="all"
                    checked={filters.status === 'all'}
                    onChange={onFilterChange}
                  />
                  All
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="radio"
                    name="status"
                    value="deactivated"
                    checked={filters.status === 'deactivated'}
                    onChange={onFilterChange}
                  />
                  Deactivated
                </label>
              </div>
            </form>

            <div className="rounded-2xl bg-white shadow-sm">
              {error ? (
                <p className="p-4 text-sm text-rose-600">{error}</p>
              ) : isLoading ? (
                <div className="flex items-center justify-center gap-3 p-10 text-slate-500">
                  <Loader2 size={22} className="animate-spin text-[#405189]" />
                  <span className="text-sm font-medium">Fetching students...</span>
                </div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-full text-sm">
                      <thead className="text-left">
                        <tr>
                          <th className="px-4 py-3">Reg ID</th>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Class</th>
                          <th className="px-4 py-3">Family ID</th>
                          <th className="px-4 py-3">Father</th>
                          <th className="px-4 py-3">Contact</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="relative px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.items.map((student) => (
                          <tr key={student.reg_Id} className="border-t border-slate-100">
                            <td className="px-4 py-3">{student.reg_Id}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <GenderAvatar gender={student.gender} />
                                <span>{student.fullName || '-'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">{student.className || '-'}</td>
                            <td className="px-4 py-3">{student.familyID || '-'}</td>
                            <td className="px-4 py-3">{student.fatherName || '-'}</td>
                            <td className="px-4 py-3">{student.fatherContact || '-'}</td>
                            <td className="px-4 py-3">
                              {student.isActive ? (
                                <span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                                  Active
                                </span>
                              ) : (
                                <span className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-600">
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td
                              ref={openActionForRegId === student.reg_Id ? actionMenuDesktopRef : null}
                              className="relative px-4 py-3 text-right"
                            >
                              <button
                                type="button"
                                aria-haspopup="menu"
                                aria-expanded={openActionForRegId === student.reg_Id}
                                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                                onClick={() =>
                                  setOpenActionForRegId((current) =>
                                    current === student.reg_Id ? null : student.reg_Id
                                  )
                                }
                              >
                                <MoreVertical size={18} />
                              </button>
                              {openActionForRegId === student.reg_Id ? (
                                <div
                                  className="absolute right-2 top-full z-[60] mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg"
                                  role="menu"
                                >
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                    onClick={() => openLedger(student)}
                                  >
                                    <FileBarChart2 size={16} className="text-indigo-600" />
                                    Ledger
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    disabled={!(student.familyID ?? student.FamilyID)}
                                    title={
                                      !(student.familyID ?? student.FamilyID)
                                        ? 'No family ID on record'
                                        : undefined
                                    }
                                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    onClick={() => {
                                      if (student.familyID ?? student.FamilyID) {
                                        setOpenActionForRegId(null)
                                        openFamily(student)
                                      }
                                    }}
                                  >
                                    <UsersRound size={16} className="text-indigo-600" />
                                    Family
                                  </button>
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                        {result.items.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                              No students found.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-3 p-4 md:hidden">
                    {result.items.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 p-4 text-center text-sm text-slate-500">
                        No students found.
                      </div>
                    ) : (
                      result.items.map((student) => (
                        <article
                          key={student.reg_Id}
                          className="relative rounded-xl border border-slate-200 p-4 shadow-sm"
                        >
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-xs text-slate-400">Reg ID</p>
                                  <p className="font-semibold text-slate-800">{student.reg_Id}</p>
                                </div>
                                {student.isActive ? (
                                  <span className="shrink-0 rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                                    Active
                                  </span>
                                ) : (
                                  <span className="shrink-0 rounded bg-slate-200 px-2 py-1 text-xs text-slate-600">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              <p className="flex items-center gap-2 font-medium text-slate-700">
                                <GenderAvatar gender={student.gender} />
                                <span className="truncate">{student.fullName || '-'}</span>
                              </p>
                            </div>
                            <div
                              ref={openActionForRegId === student.reg_Id ? actionMenuMobileRef : null}
                              className="relative shrink-0"
                            >
                              <button
                                type="button"
                                aria-haspopup="menu"
                                aria-expanded={openActionForRegId === student.reg_Id}
                                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                                onClick={() =>
                                  setOpenActionForRegId((current) =>
                                    current === student.reg_Id ? null : student.reg_Id
                                  )
                                }
                              >
                                <MoreVertical size={18} />
                              </button>
                              {openActionForRegId === student.reg_Id ? (
                                <div
                                  className="absolute right-0 top-full z-[60] mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg"
                                  role="menu"
                                >
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                    onClick={() => openLedger(student)}
                                  >
                                    <FileBarChart2 size={16} className="text-indigo-600" />
                                    Ledger
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    disabled={!(student.familyID ?? student.FamilyID)}
                                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    onClick={() => {
                                      if (student.familyID ?? student.FamilyID) {
                                        setOpenActionForRegId(null)
                                        openFamily(student)
                                      }
                                    }}
                                  >
                                    <UsersRound size={16} className="text-indigo-600" />
                                    Family
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                            <p>Class: {student.className || '-'}</p>
                            <p>Family ID: {student.familyID || '-'}</p>
                            <p>Father: {student.fatherName || '-'}</p>
                            <p className="col-span-2">Contact: {student.fatherContact || '-'}</p>
                          </div>
                        </article>
                      ))
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 p-4">
                    <p className="text-sm text-slate-500">Total: {result.totalCount}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onPageChange(Math.max(1, result.pageNumber - 1))}
                        disabled={result.pageNumber <= 1}
                        className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span className="text-sm text-slate-600">
                        Page {result.pageNumber} / {Math.max(result.totalPages, 1)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onPageChange(Math.min(result.totalPages || 1, result.pageNumber + 1))
                        }
                        disabled={result.pageNumber >= result.totalPages}
                        className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
      </CampusShell>

      {selectedStudent ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">
                  Ledger - {selectedStudent.fullName || selectedStudent.reg_Id}
                </h2>
                <p className="text-sm text-slate-500">Reg ID: {selectedStudent.reg_Id}</p>
              </div>
              <button
                type="button"
                onClick={closeLedger}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-auto p-4">
              {isLedgerLoading ? (
                <div className="flex items-center justify-center gap-3 p-8 text-slate-500">
                  <Loader2 size={20} className="animate-spin text-[#405189]" />
                  <span>Loading ledger...</span>
                </div>
              ) : ledgerItems.length === 0 ? (
                <p className="p-4 text-center text-sm text-slate-500">No ledger entries found.</p>
              ) : (
                <>
                  <table className="min-w-full text-sm">
                    <thead className="text-left">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2 text-right">Debit</th>
                        <th className="px-3 py-2 text-right">Credit</th>
                        <th className="px-3 py-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerItems.map((entry) => (
                        <tr key={entry.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">{formatDate(entry.date)}</td>
                          <td className="px-3 py-2">{entry.description || '-'}</td>
                          <td className="px-3 py-2 text-right">{formatAmount(entry.debit)}</td>
                          <td className="px-3 py-2 text-right">{formatAmount(entry.credit)}</td>
                          <td className="px-3 py-2 text-right font-semibold">
                            {formatAmount(entry.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-3 flex justify-end border-t border-slate-200 pt-3">
                    <p className="text-base font-extrabold text-slate-800">
                      Closing Balance: {formatAmount(closingBalance)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {familyModal ? (
        <div
          className="fixed inset-0 z-[82] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm"
          onClick={closeFamily}
          role="presentation"
        >
          <div
            className="max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="family-modal-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <h2 id="family-modal-title" className="text-xl font-semibold text-slate-800">
                  Family
                </h2>
                <p className="text-sm text-slate-500">
                  Family ID {familyModal.familyCode} — students linked to the same family record
                </p>
              </div>
              <div className="flex shrink-0 items-start gap-3">
                {!isFamilyLoading && familyMembers.length > 0 ? (
                  <div className="max-w-[14rem] text-right text-sm sm:max-w-xs">
                    <p className="font-semibold text-slate-800">{familyRowFather(familyMembers[0])}</p>
                    <p className="mt-0.5 text-slate-600">{familyRowContact(familyMembers[0])}</p>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={closeFamily}
                  className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                  aria-label="Close family list"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="max-h-[65vh] overflow-auto p-4">
              {isFamilyLoading ? (
                <div className="flex items-center justify-center gap-3 p-8 text-slate-500">
                  <Loader2 size={20} className="animate-spin text-[#405189]" />
                  <span>Loading family members...</span>
                </div>
              ) : familyMembers.length === 0 ? (
                <p className="p-4 text-center text-sm text-slate-500">No students found for this family.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left">
                      <tr>
                        <th className="px-3 py-2">Student name</th>
                        <th className="px-3 py-2">Class</th>
                        <th className="px-3 py-2">Reg. date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {familyMembers.map((row) => (
                        <tr key={familyRowRegId(row)} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium text-slate-800">{familyRowName(row)}</td>
                          <td className="px-3 py-2">{familyRowClass(row)}</td>
                          <td className="px-3 py-2">{formatDate(familyRowRegDate(row))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default StudentsPage
