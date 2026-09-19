namespace School.Infrastructure.Repositories;

public class EmployeeLoginRecord
{
    public int ID { get; set; }
    public string? EmployeeName { get; set; }
    public string? Gender { get; set; }
    public int? BranchID { get; set; }
    public int? DesignationId { get; set; }
    public string? DesignationName { get; set; }

    public bool CanMarkStudentAttendance { get; set; }
    public bool CanViewStudentAttendance { get; set; }
    public bool CanViewSubjectAllocation { get; set; }
    public bool CanEditSubjectAllocation { get; set; }
    public bool CanViewTimetable { get; set; }
    public bool CanEditTimetable { get; set; }
    public bool CanViewDatesheet { get; set; }
    public bool CanEditDatesheet { get; set; }
    public bool CanViewDiary { get; set; }
    public bool CanEditDiary { get; set; }
    public bool CanAccessLessonPlan { get; set; }
    public bool CanViewStudentExamDetail { get; set; }
    public bool CanRecordStudentConduct { get; set; }
    public bool CanViewStudentConduct { get; set; }
}
