namespace School.Application.DTOs;

public class EmployeeAttendanceMonthlySheetDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public int TotalEmployees { get; set; }
    public int EmployeesWithAttendance { get; set; }
    public int TotalDayRecords { get; set; }
    public IReadOnlyList<EmployeeAttendanceEmployeeGroupDto> Employees { get; set; } =
        Array.Empty<EmployeeAttendanceEmployeeGroupDto>();
}

public class EmployeeAttendanceEmployeeGroupDto
{
    public int EmployeeId { get; set; }
    public string? EmployeeName { get; set; }
    public string? DesignationName { get; set; }
    public int DayCount { get; set; }
    public IReadOnlyList<EmployeeAttendanceDayRowDto> Days { get; set; } = Array.Empty<EmployeeAttendanceDayRowDto>();
}

public class EmployeeAttendanceDayRowDto
{
    public DateTime Date { get; set; }
    public string? CheckInTime { get; set; }
    public string? CheckOutTime { get; set; }
    public int? LateComings { get; set; }
}
