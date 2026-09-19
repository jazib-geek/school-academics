export default function ExamPrintAwardListSubjects({ payload }) {
  const students = payload?.students || []
  const subjects = payload?.subjects || []

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
            {subjects.map((subject) => (
              <td key={subject.subjectId} className="exam-award12-center exam-award12-subject">
                {subject.shortName || subject.subjectName}
              </td>
            ))}
          </tr>
          <tr>
            <td rowSpan={2}>R-#</td>
            <td rowSpan={2}>Serial</td>
            <td>Date</td>
            {subjects.map((subject) => (
              <td key={`d-${subject.subjectId}`} />
            ))}
          </tr>
          <tr>
            <td>Total Marks</td>
            {subjects.map((subject) => (
              <td key={`t-${subject.subjectId}`} />
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.regId}>
              <td>{student.serial}</td>
              <td>{student.regId}</td>
              <td className="exam-award12-name">{student.studentName}</td>
              {subjects.map((subject) => (
                <td key={`${student.regId}-${subject.subjectId}`} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
