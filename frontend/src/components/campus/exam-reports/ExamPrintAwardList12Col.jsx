export default function ExamPrintAwardList12Col({ payload }) {
  const students = payload?.students || []
  const cols = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'))

  return (
    <div className="exam-award12-sheet">
      <div className="exam-award12-header">
        <div className="exam-award12-fields">
          <div>
            Subject <span className="exam-fill-line exam-fill-line-wide" />
          </div>
          <div>
            Incharge <span className="exam-fill-line exam-fill-line-wide" />
          </div>
        </div>
        <div className="exam-award12-title">
          <h2>Blank Award List</h2>
          <b>For Class {payload?.className}</b>
        </div>
      </div>

      <table className="exam-award12-table exam-print-table">
        <thead>
          <tr>
            <td colSpan={3} className="exam-award12-empty" />
            {cols.map((col) => (
              <td key={col} className="exam-award12-center">
                {col}
              </td>
            ))}
          </tr>
          <tr>
            <td rowSpan={2}>R-#</td>
            <td rowSpan={2}>Serial</td>
            <td>Date</td>
            {cols.map((col) => (
              <td key={`d-${col}`} />
            ))}
          </tr>
          <tr>
            <td>Total Marks</td>
            {cols.map((col) => (
              <td key={`t-${col}`} />
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.regId}>
              <td>{student.serial}</td>
              <td>{student.regId}</td>
              <td className="exam-award12-name">{student.studentName}</td>
              {cols.map((col) => (
                <td key={`${student.regId}-${col}`} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
