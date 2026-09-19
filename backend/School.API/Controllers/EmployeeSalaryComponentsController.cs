using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/campus/employee-salary-components")]
public class EmployeeSalaryComponentsController : ControllerBase
{
    public const string ManageLoansPermission = "manage_employee_loans";
    public const string EditPastLoansPermission = "edit_past_employee_loans";

    private readonly IEmployeeSalaryComponentService _service;
    private readonly AppDbContext _context;

    public EmployeeSalaryComponentsController(
        IEmployeeSalaryComponentService service,
        AppDbContext context)
    {
        _service = service;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetByEmployee(
        [FromQuery] int employeeId,
        CancellationToken cancellationToken)
    {
        if (employeeId <= 0)
            return BadRequest(ApiResponse<object>.FailureResponse("Employee is required."));

        try
        {
            var result = await _service.GetByEmployeeAsync(employeeId, cancellationToken);
            return Ok(ApiResponse<IReadOnlyList<EmployeeSalaryComponentDto>>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyComponents(CancellationToken cancellationToken)
    {
        var denied = EnsureEmployeeCaller(out var employeeId);
        if (denied != null)
            return denied;

        try
        {
            var result = await _service.GetByEmployeeAsync(employeeId, cancellationToken);
            return Ok(ApiResponse<IReadOnlyList<EmployeeSalaryComponentDto>>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("salary-status")]
    public async Task<IActionResult> GetPeriodStatus(
        [FromQuery] int employeeId,
        [FromQuery] int month,
        [FromQuery] int year,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.GetPeriodStatusAsync(employeeId, month, year, cancellationToken);
            return Ok(ApiResponse<EmployeeSalaryPeriodStatusDto>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("my/salary-status")]
    public async Task<IActionResult> GetMyPeriodStatus(
        [FromQuery] int month,
        [FromQuery] int year,
        CancellationToken cancellationToken)
    {
        var denied = EnsureEmployeeCaller(out var employeeId);
        if (denied != null)
            return denied;

        try
        {
            var result = await _service.GetPeriodStatusAsync(employeeId, month, year, cancellationToken);
            return Ok(ApiResponse<EmployeeSalaryPeriodStatusDto>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost]
    public async Task<IActionResult> Upsert(
        [FromBody] UpsertEmployeeSalaryComponentDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var denied = await EnsureCanMutatePeriodAsync(request.Month, request.Year, cancellationToken);
            if (denied != null)
                return denied;

            var userId = TryGetUserId();
            var result = await _service.UpsertAsync(request, userId, cancellationToken);
            return Ok(ApiResponse<EmployeeSalaryComponentDto>.SuccessResponse(result, "Saved."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{id:int}/delete")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        try
        {
            var row = await _context.EmployeeSalaryComponents
                .AsNoTracking()
                .Where(x => x.ID == id)
                .Select(x => new { x.Month, x.Year })
                .FirstOrDefaultAsync(cancellationToken);
            if (row == null)
                return NotFound(ApiResponse<object>.FailureResponse("Salary component was not found."));

            var denied = await EnsureCanMutatePeriodAsync(row.Month, row.Year, cancellationToken);
            if (denied != null)
                return denied;

            var userId = TryGetUserId();
            await _service.DeleteAsync(id, userId, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Deleted."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    private int? TryGetUserId() =>
        int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var userId) && userId > 0
            ? userId
            : null;

    private IActionResult? EnsureEmployeeCaller(out int employeeId)
    {
        employeeId = 0;
        var authSource = User.FindFirst(AuthSourceClaims.ClaimType)?.Value;
        if (!string.Equals(authSource, AuthSourceClaims.Employee, StringComparison.OrdinalIgnoreCase))
            return Unauthorized(ApiResponse<object>.FailureResponse("Employee sign-in is required."));

        if (!int.TryParse(User.FindFirst("FamilyDbId")?.Value, out employeeId) || employeeId <= 0)
            return Unauthorized(ApiResponse<object>.FailureResponse("You must be signed in."));

        return null;
    }

    private async Task<IActionResult?> EnsureCanMutatePeriodAsync(
        int month,
        int year,
        CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var userId) || userId <= 0)
            return Unauthorized(ApiResponse<object>.FailureResponse("User was not found."));

        var user = await _context.Users
            .AsNoTracking()
            .Where(u => u.ID == userId && u.IsActive == true)
            .Select(u => new { u.Username, u.IsSuperAdmin })
            .FirstOrDefaultAsync(cancellationToken);
        if (user == null)
            return Unauthorized(ApiResponse<object>.FailureResponse("User was not found."));

        if (user.IsSuperAdmin)
            return null;

        var username = user.Username ?? string.Empty;
        var granted = await _context.UserRights
            .AsNoTracking()
            .Where(x => x.UserName == username && x.HasAccess == true && x.ModuleCode != null)
            .Select(x => x.ModuleCode!)
            .ToListAsync(cancellationToken);

        bool Has(string code) =>
            granted.Any(c => string.Equals(c, code, StringComparison.OrdinalIgnoreCase));

        if (!Has(ManageLoansPermission))
            return StatusCode(
                StatusCodes.Status403Forbidden,
                ApiResponse<object>.FailureResponse("You do not have permission to manage salary adjustments."));

        if (SalaryPeriodHelper.IsPastMonth(month, year) && !Has(EditPastLoansPermission))
            return StatusCode(
                StatusCodes.Status403Forbidden,
                ApiResponse<object>.FailureResponse(
                    "You do not have permission to change salary adjustments for past months."));

        return null;
    }
}
