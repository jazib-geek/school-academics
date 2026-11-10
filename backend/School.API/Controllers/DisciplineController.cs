using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using School.API.Filters;
using School.API.Services;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[AuthorizeCampusOrEmployee]
[Route("api/discipline")]
public class DisciplineController : ControllerBase
{
    private const string ViewPermission = "view_discipline";
    private readonly IDisciplineService _service;
    private readonly AppDbContext _context;

    public DisciplineController(IDisciplineService service, AppDbContext context)
    {
        _service = service;
        _context = context;
    }

    [HttpGet("my-day")]
    public async Task<IActionResult> GetMyDay([FromQuery] DateOnly date, CancellationToken cancellationToken)
    {
        var employeeId = await RequireInchargeAsync(cancellationToken);
        if (!employeeId.HasValue)
            return Forbid();

        try
        {
            var result = await _service.GetMyDayAsync(employeeId.Value, date, cancellationToken);
            return Ok(ApiResponse<DisciplineDayDto>.SuccessResponse(result));
        }
        catch (Exception ex) when (ex is ArgumentException or UnauthorizedAccessException or InvalidOperationException)
        {
            return MapError(ex);
        }
    }

    [HttpPost("round")]
    public async Task<IActionResult> SaveRound(
        [FromBody] DisciplineRoundSaveDto request,
        CancellationToken cancellationToken)
    {
        var employeeId = await RequireInchargeAsync(cancellationToken);
        if (!employeeId.HasValue)
            return Forbid();

        try
        {
            var result = await _service.SaveRoundAsync(employeeId.Value, request, cancellationToken);
            return Ok(ApiResponse<DisciplineDayDto>.SuccessResponse(result, "Saved."));
        }
        catch (Exception ex) when (ex is ArgumentException or UnauthorizedAccessException or InvalidOperationException)
        {
            return MapError(ex);
        }
    }

    [HttpPost("finding")]
    public async Task<IActionResult> SaveFinding(
        [FromBody] DisciplineFindingSaveDto request,
        CancellationToken cancellationToken)
    {
        var employee = await RequireInchargeProfileAsync(cancellationToken);
        if (employee == null)
            return Forbid();

        try
        {
            var result = await _service.SaveFindingAsync(employee.Value.Id, employee.Value.Name, request, cancellationToken);
            return Ok(ApiResponse<DisciplineDayDto>.SuccessResponse(result, "Saved."));
        }
        catch (Exception ex) when (ex is ArgumentException or UnauthorizedAccessException or InvalidOperationException or KeyNotFoundException)
        {
            return MapError(ex);
        }
    }

    [HttpPost("finding/{id:int}/delete")]
    public async Task<IActionResult> DeleteFinding(int id, CancellationToken cancellationToken)
    {
        var employee = await RequireInchargeProfileAsync(cancellationToken);
        if (employee == null)
            return Forbid();

        try
        {
            var result = await _service.DeleteFindingAsync(employee.Value.Id, employee.Value.Name, id, cancellationToken);
            return Ok(ApiResponse<DisciplineDayDto>.SuccessResponse(result, "Removed."));
        }
        catch (Exception ex) when (ex is ArgumentException or UnauthorizedAccessException or InvalidOperationException or KeyNotFoundException)
        {
            return MapError(ex);
        }
    }

    [HttpPost("day-report")]
    public async Task<IActionResult> SubmitDayReport(
        [FromBody] DisciplineDayReportSaveDto request,
        CancellationToken cancellationToken)
    {
        var employee = await RequireInchargeProfileAsync(cancellationToken);
        if (employee == null)
            return Forbid();

        try
        {
            var result = await _service.SubmitDayReportAsync(employee.Value.Id, employee.Value.Name, request, cancellationToken);
            return Ok(ApiResponse<DisciplineDayDto>.SuccessResponse(result, "Day report submitted."));
        }
        catch (Exception ex) when (ex is ArgumentException or UnauthorizedAccessException or InvalidOperationException)
        {
            return MapError(ex);
        }
    }

    [HttpGet("day")]
    public async Task<IActionResult> GetCampusDay([FromQuery] DateOnly date, CancellationToken cancellationToken)
    {
        if (!await CanViewCampusAsync(cancellationToken))
            return Forbid();

        try
        {
            var result = await _service.GetCampusDayAsync(date, cancellationToken);
            return Ok(ApiResponse<DisciplineCampusDayDto>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    private async Task<int?> RequireInchargeAsync(CancellationToken cancellationToken)
    {
        var profile = await RequireInchargeProfileAsync(cancellationToken);
        return profile?.Id;
    }

    private async Task<(int Id, string Name)?> RequireInchargeProfileAsync(CancellationToken cancellationToken)
    {
        if (!IsEmployee() || !int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var employeeId) || employeeId <= 0)
            return null;

        var employee = await _context.Employees.AsNoTracking()
            .Where(x => x.ID == employeeId && x.IsActive == true && x.IsDisciplineIncharge)
            .Select(x => new { x.ID, x.EmployeeName })
            .FirstOrDefaultAsync(cancellationToken);
        if (employee == null)
            return null;

        var name = string.IsNullOrWhiteSpace(employee.EmployeeName) ? "Staff" : employee.EmployeeName.Trim();
        return (employee.ID, name);
    }

    private async Task<bool> CanViewCampusAsync(CancellationToken cancellationToken)
    {
        if (!CampusUserAccess.TryGetCampusUserId(User, out var campusUserId))
            return false;
        return await CampusUserAccess.HasPermissionAsync(_context, campusUserId, ViewPermission, cancellationToken);
    }

    private bool IsEmployee() =>
        string.Equals(
            User.FindFirst(AuthSourceClaims.ClaimType)?.Value,
            AuthSourceClaims.Employee,
            StringComparison.OrdinalIgnoreCase);

    private IActionResult MapError(Exception ex) => ex switch
    {
        KeyNotFoundException => NotFound(ApiResponse<object>.FailureResponse(ex.Message)),
        UnauthorizedAccessException => StatusCode(StatusCodes.Status403Forbidden, ApiResponse<object>.FailureResponse(ex.Message)),
        InvalidOperationException => Conflict(ApiResponse<object>.FailureResponse(ex.Message)),
        _ => BadRequest(ApiResponse<object>.FailureResponse(ex.Message)),
    };
}
