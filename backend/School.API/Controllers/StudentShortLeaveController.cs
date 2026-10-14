using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Application.Services;
using School.Infrastructure.Data;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/attendance/short-leave")]
public class StudentShortLeaveController : ControllerBase
{
    private readonly IStudentShortLeaveService _service;
    private readonly AppDbContext _context;

    public StudentShortLeaveController(IStudentShortLeaveService service, AppDbContext context)
    {
        _service = service;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] DateOnly? date,
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        CancellationToken cancellationToken)
    {
        if (!await HasPermissionAsync(cancellationToken))
            return Forbid();

        try
        {
            var result = await _service.ListAsync(date, dateFrom, dateTo, cancellationToken);
            return Ok(ApiResponse<List<StudentShortLeaveDto>>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id, CancellationToken cancellationToken)
    {
        if (!await HasPermissionAsync(cancellationToken))
            return Forbid();

        try
        {
            var result = await _service.GetAsync(id, cancellationToken);
            return Ok(ApiResponse<StudentShortLeaveDto>.SuccessResponse(result));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateStudentShortLeaveRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!await HasPermissionAsync(cancellationToken))
            return Forbid();

        try
        {
            var approvedBy = await ResolveUserNameAsync(cancellationToken);
            var result = await _service.CreateAsync(request, approvedBy, cancellationToken);
            return Ok(ApiResponse<StudentShortLeaveDto>.SuccessResponse(result, "Short leave allowed."));
        }
        catch (ShortLeaveAlreadyIssuedException ex)
        {
            return Conflict(new ApiResponse<IReadOnlyList<int>>
            {
                Success = false,
                Message = ex.Message,
                Data = ex.ExistingPassIds
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    private async Task<bool> HasPermissionAsync(CancellationToken cancellationToken)
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
                     && x.ModuleCode == "allow_short_leave"
                     && x.HasAccess == true,
                cancellationToken);
    }

    private async Task<string> ResolveUserNameAsync(CancellationToken cancellationToken)
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
