using Microsoft.EntityFrameworkCore;
using School.Infrastructure.Data;

namespace School.Infrastructure.Repositories;

public class EmployeeAuthRepository : IEmployeeAuthRepository
{
    private readonly AppDbContext _context;

    public EmployeeAuthRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<EmployeeLoginRecord?> GetActiveEmployeeByCredentialsAsync(string thumbId, string password)
    {
        var code = thumbId.Trim();
        if (code.Length == 0)
            return null;

        return await (
            from employee in _context.Employees.AsNoTracking()
            join designation in _context.Designations.AsNoTracking()
                on employee.DesignationID equals designation.ID into designationJoin
            from designation in designationJoin.DefaultIfEmpty()
            where employee.Thumb_ID == code
                && employee.Password == password
                && employee.IsActive == true
            select new EmployeeLoginRecord
            {
                ID = employee.ID,
                EmployeeName = employee.EmployeeName,
                Gender = employee.Gender,
                BranchID = employee.BranchID,
                DesignationId = employee.DesignationID,
                DesignationName = designation != null ? designation.DesignationName : null,
                CanMarkStudentAttendance = employee.CanMarkStudentAttendance,
                CanViewStudentAttendance = employee.CanViewStudentAttendance,
                CanViewSubjectAllocation = employee.CanViewSubjectAllocation,
                CanEditSubjectAllocation = employee.CanEditSubjectAllocation,
                CanViewTimetable = employee.CanViewTimetable,
                CanEditTimetable = employee.CanEditTimetable,
                CanViewDatesheet = employee.CanViewDatesheet,
                CanEditDatesheet = employee.CanEditDatesheet,
                CanViewDiary = employee.CanViewDiary,
                CanEditDiary = employee.CanEditDiary,
                CanAccessLessonPlan = employee.CanAccessLessonPlan,
                CanViewStudentExamDetail = employee.CanViewStudentExamDetail,
                CanRecordStudentConduct = employee.CanRecordStudentConduct,
                CanViewStudentConduct = employee.CanViewStudentConduct,
            })
            .FirstOrDefaultAsync();
    }

    public Task<EmployeeLoginRecord?> GetActiveEmployeeByIdAsync(int employeeId, CancellationToken cancellationToken = default) =>
        (
            from employee in _context.Employees.AsNoTracking()
            join designation in _context.Designations.AsNoTracking()
                on employee.DesignationID equals designation.ID into designationJoin
            from designation in designationJoin.DefaultIfEmpty()
            where employee.ID == employeeId && employee.IsActive == true
            select new EmployeeLoginRecord
            {
                ID = employee.ID,
                EmployeeName = employee.EmployeeName,
                Gender = employee.Gender,
                BranchID = employee.BranchID,
                DesignationId = employee.DesignationID,
                DesignationName = designation != null ? designation.DesignationName : null,
                CanMarkStudentAttendance = employee.CanMarkStudentAttendance,
                CanViewStudentAttendance = employee.CanViewStudentAttendance,
                CanViewSubjectAllocation = employee.CanViewSubjectAllocation,
                CanEditSubjectAllocation = employee.CanEditSubjectAllocation,
                CanViewTimetable = employee.CanViewTimetable,
                CanEditTimetable = employee.CanEditTimetable,
                CanViewDatesheet = employee.CanViewDatesheet,
                CanEditDatesheet = employee.CanEditDatesheet,
                CanViewDiary = employee.CanViewDiary,
                CanEditDiary = employee.CanEditDiary,
                CanAccessLessonPlan = employee.CanAccessLessonPlan,
                CanViewStudentExamDetail = employee.CanViewStudentExamDetail,
                CanRecordStudentConduct = employee.CanRecordStudentConduct,
                CanViewStudentConduct = employee.CanViewStudentConduct,
            })
            .FirstOrDefaultAsync(cancellationToken);

    public Task<bool> IsActiveEmployeeWithDesignationAsync(int employeeId, int designationId, CancellationToken cancellationToken = default) =>
        _context.Employees.AsNoTracking().AnyAsync(
            e => e.ID == employeeId && e.IsActive == true && e.DesignationID == designationId,
            cancellationToken);

    public async Task ChangePasswordAsync(
        int employeeId,
        string currentPassword,
        string newPassword,
        CancellationToken cancellationToken = default)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.ID == employeeId && e.IsActive == true, cancellationToken)
            ?? throw new KeyNotFoundException("Employee not found.");

        if (!string.Equals(employee.Password ?? string.Empty, currentPassword, StringComparison.Ordinal))
            throw new UnauthorizedAccessException("Current password is incorrect.");

        employee.Password = newPassword;
        await _context.SaveChangesAsync(cancellationToken);
    }
}
