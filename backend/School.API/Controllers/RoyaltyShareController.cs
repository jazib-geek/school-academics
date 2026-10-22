using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using School.API.Services;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/royalty-share")]
public class RoyaltyShareController : ControllerBase
{
    private readonly IRoyaltyShareService _service;
    private readonly AppDbContext _context;

    public RoyaltyShareController(IRoyaltyShareService service, AppDbContext context)
    {
        _service = service;
        _context = context;
    }

    [HttpGet("meta")]
    public async Task<IActionResult> GetMeta(CancellationToken cancellationToken)
    {
        var result = await _service.GetMetaAsync(cancellationToken);
        return Ok(ApiResponse<RoyaltyShareMetaDto>.SuccessResponse(result));
    }

    [HttpGet("month")]
    public async Task<IActionResult> GetMonth(
        [FromQuery] int year,
        [FromQuery] int month,
        CancellationToken cancellationToken)
    {
        if (!await HasReportPermissionAsync(cancellationToken))
            return Forbid();

        try
        {
            var result = await _service.GetMonthAsync(year, month, cancellationToken);
            return Ok(ApiResponse<RoyaltyShareMonthDto>.SuccessResponse(result));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory(
        [FromQuery] int limit = 24,
        CancellationToken cancellationToken = default)
    {
        if (!await HasReportPermissionAsync(cancellationToken))
            return Forbid();

        try
        {
            var result = await _service.GetHistoryAsync(limit, cancellationToken);
            return Ok(ApiResponse<IReadOnlyList<RoyaltyShareHistoryItemDto>>.SuccessResponse(result));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("close")]
    public async Task<IActionResult> Close(
        [FromBody] CloseRoyaltyShareRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!await IsSuperAdminAsync(cancellationToken))
            return Forbid();

        if (!await HasReportPermissionAsync(cancellationToken))
            return Forbid();

        try
        {
            var userId = await ResolveUserIdAsync(cancellationToken);
            var userName = await ResolveUserNameAsync(cancellationToken);
            var result = await _service.CloseMonthAsync(
                request.Year,
                request.Month,
                userId,
                userName,
                userName,
                cancellationToken);
            return Ok(ApiResponse<RoyaltyShareMonthDto>.SuccessResponse(result, "Month closed."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    private async Task<bool> HasReportPermissionAsync(CancellationToken cancellationToken)
    {
        if (!CampusUserAccess.TryGetCampusUserId(User, out var userId))
            return false;

        return await CampusUserAccess.HasPermissionAsync(_context, userId, "rpt_fee", cancellationToken);
    }

    private async Task<bool> IsSuperAdminAsync(CancellationToken cancellationToken)
    {
        if (!CampusUserAccess.TryGetCampusUserId(User, out var userId))
            return false;

        var user = await _context.Users.AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == userId, cancellationToken);

        return user is { IsActive: true, IsSuperAdmin: true };
    }

    private async Task<int> ResolveUserIdAsync(CancellationToken cancellationToken)
    {
        if (!CampusUserAccess.TryGetCampusUserId(User, out var userId))
            throw new UnauthorizedAccessException();

        return userId;
    }

    private async Task<string?> ResolveUserNameAsync(CancellationToken cancellationToken)
    {
        if (!CampusUserAccess.TryGetCampusUserId(User, out var userId))
            return null;

        return await _context.Users.AsNoTracking()
            .Where(x => x.ID == userId)
            .Select(x => x.Username)
            .FirstOrDefaultAsync(cancellationToken);
    }
}
