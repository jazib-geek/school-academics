import { useEffect, useMemo, useState } from 'react'
import { EmployeeSelect as Select } from '../../../components/employee/EmployeeSelect'
import { toast } from 'sonner'
import { Loader2, Search } from 'lucide-react'
import EmployeeBackButton from '../../../components/employee/EmployeeBackButton'
import EmployeeLayout from '../../../components/employee/EmployeeLayout'
import { getClasses } from '../../../services/classService'
import { getExamTypes, getTeacherExamAnalysis } from '../../../services/examService'
import { getTeacherAssignmentEmployees } from '../../../services/teacherClassSubjectAssignmentService'
import { getId, getText } from './employeeAcademicsUtils'

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 48,
    borderRadius: 12,
    borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
    boxShadow: state.isFocused ? '0 0 0 4px rgba(99,102,241,0.12)' : 'none',
  }),
  menu: (base) => ({ ...base, zIndex: 40 }),
}

function scoreTone(value) {
  if (value >= 80) return 'bg-emerald-50 text-emerald-800'
  if (value >= 60) return 'bg-amber-50 text-amber-800'
  return 'bg-rose-50 text-rose-800'
}

function EmployeeTeacherAnalysisPage() {
  const [sectionId, setSectionId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [examTypeId, setExamTypeId] = useState('')
  const [classOptions, setClassOptions] = useState([])
  const [employeeOptions, setEmployeeOptions] = useState([])
  const [examTypes, setExamTypes] = useState([])
  const [report, setReport] = useState(null)
  const [isMetaLoading, setIsMetaLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const loadMeta = async () => {
      setIsMetaLoading(true)
      try {
        const [classes, employees, types] = await Promise.all([
          getClasses(),
          getTeacherAssignmentEmployees(),
          getExamTypes(),
        ])
        if (!cancelled) {
          setClassOptions(Array.isArray(classes) ? classes : [])
          setEmployeeOptions(Array.isArray(employees) ? employees : [])
          setExamTypes(Array.isArray(types) ? types : [])
        }
      } catch {
        if (!cancelled) toast.error('Unable to load filters.')
      } finally {
        if (!cancelled) setIsMetaLoading(false)
      }
    }
    loadMeta()
    return () => {
      cancelled = true
    }
  }, [])

  const classSelectOptions = useMemo(
    () =>
      classOptions.map((item) => ({
        value: String(getId(item, 'id', 'ID')),
        label: getText(item, 'className', 'ClassName') || 'Class',
      })),
    [classOptions],
  )

  const employeeSelectOptions = useMemo(
    () =>
      employeeOptions.map((item) => ({
        value: String(getId(item, 'id', 'ID')),
        label: getText(item, 'employeeName', 'EmployeeName') || 'Teacher',
      })),
    [employeeOptions],
  )

  const examTypeSelectOptions = useMemo(
    () =>
      examTypes.map((item) => ({
        value: String(item.id),
        label: item.name || 'Exam',
      })),
    [examTypes],
  )

  const loadReport = async () => {
    const parsedSectionId = Number(sectionId)
    const parsedEmployeeId = Number(employeeId)
    const parsedExamTypeId = Number(examTypeId)

    if (!parsedSectionId || !parsedEmployeeId || !parsedExamTypeId) {
      toast.error('Select a class, teacher, and exam type.')
      return
    }

    setIsLoading(true)
    try {
      const data = await getTeacherExamAnalysis({
        sectionId: parsedSectionId,
        employeeId: parsedEmployeeId,
        examTypeId: parsedExamTypeId,
      })
      setReport(data)
    } catch (error) {
      setReport(null)
      if (error?.response?.status === 404) {
        toast.error('No report found for this selection.')
      } else {
        toast.error('Unable to load analysis. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <EmployeeLayout
      title="Teacher analysis"
      subtitle="Subject results for a class teacher"
      showProfileCard={false}
      showQuickTiles={false}
      compactContentTop
    >
      <div className="space-y-3 pb-4">
        <EmployeeBackButton />

        <div className="emp-surface space-y-3 rounded-2xl p-4">
          <label className="block text-sm font-medium text-slate-700">
            Class
            <div className="mt-1.5">
              <Select
                isLoading={isMetaLoading}
                isClearable
                options={classSelectOptions}
                value={classSelectOptions.find((o) => o.value === sectionId) || null}
                onChange={(opt) => setSectionId(opt?.value || '')}
                placeholder="Select class…"
                styles={selectStyles}
              />
            </div>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Teacher
            <div className="mt-1.5">
              <Select
                isLoading={isMetaLoading}
                isClearable
                options={employeeSelectOptions}
                value={employeeSelectOptions.find((o) => o.value === employeeId) || null}
                onChange={(opt) => setEmployeeId(opt?.value || '')}
                placeholder="Select teacher…"
                styles={selectStyles}
              />
            </div>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Exam type
            <div className="mt-1.5">
              <Select
                isLoading={isMetaLoading}
                isClearable
                options={examTypeSelectOptions}
                value={examTypeSelectOptions.find((o) => o.value === examTypeId) || null}
                onChange={(opt) => setExamTypeId(opt?.value || '')}
                placeholder="Select exam type…"
                styles={selectStyles}
              />
            </div>
          </label>

          <button
            type="button"
            onClick={loadReport}
            disabled={isLoading || isMetaLoading}
            className="emp-cta-btn emp-cta-btn-primary h-12 w-full"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Load report
          </button>
        </div>

        {isLoading ? (
          <div className="emp-surface flex items-center justify-center gap-2 rounded-2xl py-14 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin text-indigo-600" /> Loading…
          </div>
        ) : null}

        {!isLoading && report ? (
          <div className="emp-surface overflow-hidden rounded-2xl">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="font-semibold text-slate-900">{report.employeeName || 'Teacher'}</p>
              <p className="text-xs text-slate-500">
                {report.className} · {report.examTypeName || 'Exam'}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-[13px] leading-snug">
                <thead>
                  <tr className="bg-indigo-50 text-left text-slate-700">
                    <th className="px-3 py-2 font-semibold">Subject</th>
                    <th className="px-3 py-2 text-center font-semibold">%</th>
                    <th className="px-3 py-2 font-semibold">Highest</th>
                    <th className="px-3 py-2 font-semibold">Lowest</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(report.subjects || []).map((subject) => (
                    <tr key={subject.subjectId}>
                      <td className="px-3 py-2 font-medium text-slate-900">{subject.subjectName}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${scoreTone(subject.percentage)}`}>
                          {subject.percentage}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {subject.max ? (
                          <div>
                            <div className="font-semibold">{subject.max.obtainedMarks}</div>
                            <div className="text-[11px] text-slate-500">{subject.max.studentName || '—'}</div>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {subject.min ? (
                          <div>
                            <div className="font-semibold">{subject.min.obtainedMarks}</div>
                            <div className="text-[11px] text-slate-500">{subject.min.studentName || '—'}</div>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                  {(report.subjects || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                        No subjects found for this teacher in the selected class.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </EmployeeLayout>
  )
}

export default EmployeeTeacherAnalysisPage
