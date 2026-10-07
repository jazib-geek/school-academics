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
[Route("api/employee-attendance/change-requests")]
public class EmployeeAttendanceChangeRequestController : ControllerBase
{
    private readonly IEmployeeAttendanceChangeRequestService _service;
    private readonly AppDbContext _context;

    public EmployeeAttendanceChangeRequestController(
        IEmployeeAttendanceChangeRequestService service,
        AppDbContext context)
    {
        _service = service;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] DateOnly? date,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var canEdit = await HasPermissionAsync("edit_emp_attendance", cancellationToken);
        var canRequest = await HasPermissionAsync("request_emp_attendance_change", cancellationToken);
        if (!canEdit && !canRequest)
            return Forbid();

        try
        {
            var submitterKey = canRequest && !canEdit
                ? await ResolveUsernameAsync(cancellationToken)
                : null;

            var result = await _service.ListAsync(
                date,
                status,
                submitterKey,
                restrictToSubmitter: canRequest && !canEdit,
                cancellationToken);
            return Ok(ApiResponse<EmployeeAttendanceChangeRequestListDto>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost]
    public async Task<IActionResult> Submit(
        [FromBody] SubmitEmployeeAttendanceChangeRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!await HasPermissionAsync("request_emp_attendance_change", cancellationToken))
            return Forbid();

        try
        {
            var submitter = await ResolveUsernameAsync(cancellationToken);
            var result = await _service.SubmitAsync(
                request,
                submitter,
                ResolveUserId(),
                cancellationToken);
            return Ok(ApiResponse<EmployeeAttendanceChangeRequestSubmitResultDto>.SuccessResponse(
                result,
                "Change request submitted."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{id:int}/approve")]
    public async Task<IActionResult> Approve(int id, CancellationToken cancellationToken)
    {
        if (!await HasPermissionAsync("edit_emp_attendance", cancellationToken))
            return Forbid();

        try
        {
            var reviewer = await ResolveUsernameAsync(cancellationToken);
            var result = await _service.ApproveAsync(id, reviewer, ResolveUserId(), cancellationToken);
            return Ok(ApiResponse<EmployeeAttendanceChangeRequestDecisionResultDto>.SuccessResponse(
                result,
                "Change request approved."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{id:int}/reject")]
    public async Task<IActionResult> Reject(
        int id,
        [FromBody] EmployeeAttendanceChangeRequestDecisionRequestDto? request,
        CancellationToken cancellationToken)
    {
        if (!await HasPermissionAsync("edit_emp_attendance", cancellationToken))
            return Forbid();

        try
        {
            var reviewer = await ResolveUsernameAsync(cancellationToken);
            var result = await _service.RejectAsync(id, reviewer, ResolveUserId(), request, cancellationToken);
            return Ok(ApiResponse<EmployeeAttendanceChangeRequestDecisionResultDto>.SuccessResponse(
                result,
                "Change request rejected."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    private int? ResolveUserId() =>
        int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var userId) && userId > 0
            ? userId
            : null;

    private async Task<bool> HasPermissionAsync(string moduleCode, CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var userId) || userId <= 0)
            return false;

        var isEmployee = string.Equals(
            User.FindFirst(AuthSourceClaims.ClaimType)?.Value,
            AuthSourceClaims.Employee,
            StringComparison.OrdinalIgnoreCase);

        if (isEmployee)
            return false;

        var user = await _context.Users.AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == userId, cancellationToken);

        if (user is null || user.IsActive != true)
            return false;

        if (user.IsSuperAdmin == true)
            return true;

        var username = user.Username ?? string.Empty;
        return await _context.UserRights.AsNoTracking()
            .AnyAsync(
                x => x.UserName == username
                     && x.ModuleCode == moduleCode
                     && x.HasAccess == true,
                cancellationToken);
    }

    private async Task<string> ResolveUsernameAsync(CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var userId) || userId <= 0)
            throw new UnauthorizedAccessException("Campus sign-in is required.");

        var username = await _context.Users.AsNoTracking()
            .Where(x => x.ID == userId)
            .Select(x => x.Username)
            .FirstOrDefaultAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(username))
            throw new UnauthorizedAccessException("Campus sign-in is required.");

        return username.Trim();
    }
}
