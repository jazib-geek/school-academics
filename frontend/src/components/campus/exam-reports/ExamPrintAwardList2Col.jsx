import { getExamPrintMeta } from './examPrintShared'

function FillLine({ wide }) {
  return <span className={`exam-fill-line${wide ? ' exam-fill-line-wide' : ''}`} />
}

function CheckingPanel({ roster, campusLabel, schoolName, campusPhone }) {
  const students = roster?.students || []

  return (
    <div className="exam-award2-panel">
      <table className="exam-award2-meta-table">
        <tbody>
          <tr>
            <td colSpan={2} className="exam-award2-title">
              {schoolName}
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="exam-award2-sub">
              {campusLabel} | Tel: {campusPhone}
            </td>
          </tr>
          <tr>
            <td colSpan={2}>
              Exam <span className="exam-fill-value">{roster?.examTypeName || ''}</span>
            </td>
          </tr>
          <tr>
            <td>
              Dated <FillLine />
            </td>
            <td>
              Subject <FillLine wide />
            </td>
          </tr>
          <tr>
            <td>{roster?.className}</td>
            <td>
              Total Marks <FillLine />
            </td>
          </tr>
        </tbody>
      </table>

      <table className="exam-award2-table exam-print-table">
        <thead>
          <tr>
            <th>Sr.#</th>
            <th>R.#</th>
            <th>Student Name</th>
            <th>1st checking</th>
            <th>2nd checking</th>
            <th>3rd checking</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.regId}>
              <td>{student.regId}</td>
              <td>{student.serial}</td>
              <td className="exam-award2-name">{student.studentName}</td>
              <td />
              <td />
              <td />
            </tr>
          ))}
        </tbody>
      </table>

      <div className="exam-award2-foot">
        <span>
          Checked By <FillLine wide />
        </span>
        <span>
          Rechecked By <FillLine wide />
        </span>
      </div>
    </div>
  )
}

export default function ExamPrintAwardList2Col({ payload }) {
  const { campusLabel, schoolName, campusPhone } = getExamPrintMeta()
  return (
    <div className="exam-award2-sheet">
      <CheckingPanel roster={payload} campusLabel={campusLabel} schoolName={schoolName} campusPhone={campusPhone} />
      <CheckingPanel roster={payload} campusLabel={campusLabel} schoolName={schoolName} campusPhone={campusPhone} />
    </div>
  )
}
