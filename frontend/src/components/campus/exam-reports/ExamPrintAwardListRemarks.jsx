import { getExamPrintMeta } from './examPrintShared'

export default function ExamPrintAwardListRemarks({ payload }) {
  const { campusLabel, schoolName } = getExamPrintMeta()
  const students = payload?.students || []
  const year = payload?.sessionYear
  const session = year ? `${year}-${year + 1}` : ''

  return (
    <div className="exam-award3-sheet">
      <div className="exam-award3-school">
        {schoolName}
        <div className="exam-award3-campus">{campusLabel}</div>
      </div>
      <div className="exam-award3-report">
        <div>
          {payload?.examTypeName} Examination Award List {session}
        </div>
        <div>{payload?.className}</div>
      </div>
      <table className="exam-award3-info">
        <tbody>
          <tr>
            <td>
              <strong>Subject:</strong> <span className="exam-award3-line" />
            </td>
            <td>
              <strong>Teacher:</strong> <span className="exam-award3-line" />
            </td>
            <td>
              <strong>Total Marks:</strong> <span className="exam-award3-line" />
            </td>
          </tr>
        </tbody>
      </table>
      <table className="exam-award3-table exam-print-table">
        <thead>
          <tr>
            <th style={{ width: '5%' }}>Sr.#</th>
            <th style={{ width: '5%' }}>R.#</th>
            <th style={{ width: '25%' }}>Student Name</th>
            <th style={{ width: '10%' }}>
              Super
              <br />
              Checking
            </th>
            <th style={{ width: '55%' }}>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.regId}>
              <td className="exam-award3-center">{student.serial}</td>
              <td className="exam-award3-center">{student.regId}</td>
              <td className="exam-award3-name">{student.studentName}</td>
              <td />
              <td />
            </tr>
          ))}
          <tr>
            <td>&nbsp;</td>
            <td />
            <td />
            <td />
            <td />
          </tr>
          <tr>
            <td>&nbsp;</td>
            <td />
            <td />
            <td />
            <td />
          </tr>
        </tbody>
      </table>
      <div className="exam-award3-remarks">
        <div className="exam-award3-remarks-title">
          <strong>General Remarks:</strong>
        </div>
        <div className="exam-award3-box" />
        <div className="exam-award3-box" />
        <div className="exam-award3-box" />
      </div>
    </div>
  )
}
