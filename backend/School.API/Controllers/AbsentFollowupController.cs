using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using School.API.Filters;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[AuthorizeCampusOrEmployee]
[Route("api/absent-followup")]
public class AbsentFollowupController : ControllerBase
{
    private readonly IAbsentFollowupService _service;
    private readonly AppDbContext _context;

    public AbsentFollowupController(IAbsentFollowupService service, AppDbContext context)
    {
        _service = service;
        _context = context;
    }

    [HttpGet("reasons")]
    public async Task<IActionResult> GetReasons(CancellationToken cancellationToken)
    {
        var result = await _service.GetReasonsAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AbsentFollowupReasonDto>>.SuccessResponse(result));
    }

    [HttpGet]
    public async Task<IActionResult> GetByDate(
        [FromQuery] DateOnly date,
        CancellationToken cancellationToken)
    {
        try
        {
            if (date == default)
                return BadRequest(ApiResponse<object>.FailureResponse("Date is required."));

            var result = await _service.GetByDateAsync(date, cancellationToken);
            return Ok(ApiResponse<IReadOnlyList<AbsentFollowupRowDto>>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost]
    public async Task<IActionResult> Upsert(
        [FromBody] AbsentFollowupUpsertDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updatedByName = await ResolveUpdatedByNameAsync(cancellationToken);
            var result = await _service.UpsertAsync(request, updatedByName, cancellationToken);
            return Ok(ApiResponse<AbsentFollowupSaveResultDto>.SuccessResponse(result, "Follow-up saved."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (DbUpdateException)
        {
            return Conflict(ApiResponse<object>.FailureResponse("Unable to save follow-up. Please try again."));
        }
    }

    private async Task<string?> ResolveUpdatedByNameAsync(CancellationToken cancellationToken)
    {
        var isEmployee = string.Equals(
            User.FindFirst(AuthSourceClaims.ClaimType)?.Value,
            AuthSourceClaims.Employee,
            StringComparison.OrdinalIgnoreCase);

        if (!isEmployee || !int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var employeeId) || employeeId <= 0)
            return "Campus staff";

        var name = await _context.Employees.AsNoTracking()
            .Where(x => x.ID == employeeId)
            .Select(x => x.EmployeeName)
            .FirstOrDefaultAsync(cancellationToken);

        return string.IsNullOrWhiteSpace(name) ? "Staff" : name.Trim();
    }
}
