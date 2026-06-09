using School.Application.DTOs;

namespace School.Application.Interfaces
{
    public interface IAttendanceService
    {
        Task<List<AttendanceDto>> GetStudentAttendanceAsync(
        int studentId,
        int? month = null,
        int? year = null);

    Task<ClassAttendanceSheetDto> GetClassAttendanceSheetAsync(DateTime date, int classSectionCompositeId);
    Task<ClassAttendanceSheetDto> GetSchoolAttendanceSheetAsync(DateTime date);
    Task<ClassAttendanceSheetDto> SetClassAttendanceStatusForAllAsync(DateTime date, int classSectionCompositeId, string status);
    Task<ClassAttendanceSheetDto> SetSchoolAttendancePresentForAllAsync(DateTime date);
    Task<ClassAttendanceSheetDto> SetStudentAttendanceStatusAsync(DateTime date, int classSectionCompositeId, int studentId, string status);
    Task<EmployeeAttendanceStatsDto> GetEmployeeAttendanceStatsAsync(DateTime? date = null);
    Task<AttendanceReportDto> GetAttendanceReportAsync(
        DateTime dateFrom,
        DateTime dateTo,
        int? classSectionCompositeId = null,
        string? status = null);
    }
}
