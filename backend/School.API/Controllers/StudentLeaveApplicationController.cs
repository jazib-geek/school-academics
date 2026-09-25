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
[Route("api/campus/leave-applications")]
public class StudentLeaveApplicationController : ControllerBase
{
    private readonly IStudentLeaveApplicationService _service;
    private readonly AppDbContext _context;

    public StudentLeaveApplicationController(
        IStudentLeaveApplicationService service,
        AppDbContext context)
    {
        _service = service;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status,
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        if (!await HasPermissionAsync("view_leave_applications", cancellationToken))
            return Forbid();

        try
        {
            var result = await _service.ListForCampusAsync(
                status,
                dateFrom,
                dateTo,
                search,
                cancellationToken);
            return Ok(ApiResponse<CampusLeaveApplicationListDto>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{id:int}/approve")]
    public async Task<IActionResult> Approve(
        int id,
        [FromBody] CampusLeaveDecisionRequestDto? request,
        CancellationToken cancellationToken)
    {
        if (!await HasPermissionAsync("manage_leave_applications", cancellationToken))
            return Forbid();

        try
        {
            var reviewer = await ResolveReviewerUserKeyAsync(cancellationToken);
            var result = await _service.ApproveAsync(id, reviewer, request, cancellationToken);
            return Ok(ApiResponse<CampusLeaveDecisionResultDto>.SuccessResponse(result, "Leave approved."));
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
        [FromBody] CampusLeaveDecisionRequestDto? request,
        CancellationToken cancellationToken)
    {
        if (!await HasPermissionAsync("manage_leave_applications", cancellationToken))
            return Forbid();

        try
        {
            var reviewer = await ResolveReviewerUserKeyAsync(cancellationToken);
            var result = await _service.RejectAsync(id, reviewer, request, cancellationToken);
            return Ok(ApiResponse<CampusLeaveDecisionResultDto>.SuccessResponse(result, "Leave rejected."));
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

    private async Task<string> ResolveReviewerUserKeyAsync(CancellationToken cancellationToken)
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
