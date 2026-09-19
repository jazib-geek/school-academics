namespace School.Application.DTOs;

/// <summary>Employee-portal module flags stored on tblEmployee (coordinators bypass these at runtime).</summary>
public class EmployeeAppAccessDto
{
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
