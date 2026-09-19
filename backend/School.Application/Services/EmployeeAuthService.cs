using School.Application.DTOs;
using School.Application.Interfaces;
using School.Application.Common;
using School.Infrastructure.Repositories;

namespace School.Application.Services;

public class EmployeeAuthService : IEmployeeAuthService
{
    private readonly IEmployeeAuthRepository _employeeAuthRepository;
    private readonly ITokenService _tokenService;
    private readonly TenantContext _tenantContext;

    public EmployeeAuthService(
        IEmployeeAuthRepository employeeAuthRepository,
        ITokenService tokenService,
        TenantContext tenantContext)
    {
        _employeeAuthRepository = employeeAuthRepository;
        _tokenService = tokenService;
        _tenantContext = tenantContext;
    }

    public async Task<EmployeeLoginResponseDto?> LoginAsync(EmployeeLoginRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return null;
        }

        var employee = await _employeeAuthRepository.GetActiveEmployeeByCredentialsAsync(
            request.Username.Trim(),
            request.Password.Trim());

        if (employee == null)
        {
            return null;
        }

        var token = _tokenService.GenerateToken(
            employee.ID,
            null,
            _tenantContext.Campus,
            AuthSourceClaims.Employee);

        return new EmployeeLoginResponseDto
        {
            ID = employee.ID,
            EmployeeName = employee.EmployeeName ?? string.Empty,
            Gender = employee.Gender,
            Designation = employee.DesignationName,
            BranchID = employee.BranchID,
            IsCoordinator = employee.DesignationId == EmployeeDesignations.Coordinator,
            Token = token,
            AppAccess = new EmployeeAppAccessDto
            {
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
            },
        };
    }

    public async Task<EmployeeSessionDto?> GetSessionAsync(int employeeId, CancellationToken cancellationToken = default)
    {
        if (employeeId <= 0)
            return null;

        var employee = await _employeeAuthRepository.GetActiveEmployeeByIdAsync(employeeId, cancellationToken);
        if (employee == null)
            return null;

        return new EmployeeSessionDto
        {
            ID = employee.ID,
            EmployeeName = employee.EmployeeName ?? string.Empty,
            Gender = employee.Gender,
            Designation = employee.DesignationName,
        };
    }

    public async Task ChangePasswordAsync(
        int employeeId,
        ChangeEmployeePasswordDto request,
        CancellationToken cancellationToken = default)
    {
        var currentPassword = (request.CurrentPassword ?? string.Empty).Trim();
        var newPassword = (request.NewPassword ?? string.Empty).Trim();
        var confirmPassword = (request.ConfirmPassword ?? string.Empty).Trim();

        if (currentPassword.Length == 0)
            throw new ArgumentException("Current password is required.");
        if (newPassword.Length < 6)
            throw new ArgumentException("New password must be at least 6 characters.");
        if (!string.Equals(newPassword, confirmPassword, StringComparison.Ordinal))
            throw new ArgumentException("New password and confirmation do not match.");
        if (string.Equals(currentPassword, newPassword, StringComparison.Ordinal))
            throw new ArgumentException("New password must be different from the current password.");

        await _employeeAuthRepository.ChangePasswordAsync(
            employeeId,
            currentPassword,
            newPassword,
            cancellationToken);
    }
}
