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
[Route("api/teacher-conduct")]
public class TeacherConductController : ControllerBase
{
    private const string ViewPermission = "view_teacher_conduct";

    private readonly ITeacherConductService _service;
    private readonly AppDbContext _context;

    public TeacherConductController(ITeacherConductService service, AppDbContext context)
    {
        _service = service;
        _context = context;
    }

    [HttpGet("types")]
    public async Task<IActionResult> GetCatalog(CancellationToken cancellationToken)
    {
        if (!await CanReadCatalogAsync(cancellationToken))
            return Forbid();

        var result = await _service.GetCatalogAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<TeacherConductTypeDto>>.SuccessResponse(result));
    }

    [HttpGet("types/all")]
    public async Task<IActionResult> GetTypes(CancellationToken cancellationToken)
    {
        if (!await CanManageTypesAsync(cancellationToken))
            return Forbid();

        var result = await _service.GetTypesAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<TeacherConductTypeDto>>.SuccessResponse(result));
    }

    [HttpGet("types/{id:int}")]
    public async Task<IActionResult> GetType(int id, CancellationToken cancellationToken)
    {
        if (!await CanManageTypesAsync(cancellationToken))
            return Forbid();

        try
        {
            var result = await _service.GetTypeAsync(id, cancellationToken);
            return Ok(ApiResponse<TeacherConductTypeDto>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("types")]
    public async Task<IActionResult> CreateType(
        [FromBody] TeacherConductTypeUpsertDto request,
        CancellationToken cancellationToken)
    {
        if (!await CanManageTypesAsync(cancellationToken))
            return Forbid();

        try
        {
            var result = await _service.CreateTypeAsync(request, cancellationToken);
            return CreatedAtAction(
                nameof(GetType),
                new { id = result.Id },
                ApiResponse<TeacherConductTypeDto>.SuccessResponse(result, "Conduct type saved."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (DbUpdateException)
        {
            return Conflict(ApiResponse<object>.FailureResponse("A conduct type with this name already exists."));
        }
    }

    [HttpPost("types/{id:int}/update")]
    public async Task<IActionResult> UpdateType(
        int id,
        [FromBody] TeacherConductTypeUpsertDto request,
        CancellationToken cancellationToken)
    {
        if (!await CanManageTypesAsync(cancellationToken))
            return Forbid();

        try
        {
            var result = await _service.UpdateTypeAsync(id, request, cancellationToken);
            return Ok(ApiResponse<TeacherConductTypeDto>.SuccessResponse(result, "Conduct type updated."));
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
            return Conflict(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (DbUpdateException)
        {
            return Conflict(ApiResponse<object>.FailureResponse("A conduct type with this name already exists."));
        }
    }

    [HttpPost("types/{id:int}/delete")]
    public async Task<IActionResult> DeleteType(int id, CancellationToken cancellationToken)
    {
        if (!await CanManageTypesAsync(cancellationToken))
            return Forbid();

        try
        {
            await _service.DeleteTypeAsync(id, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Conduct type deleted."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("employee-lookup")]
    public async Task<IActionResult> LookupEmployees([FromQuery] string search, CancellationToken cancellationToken)
    {
        if (!await CanViewOthersAsync(cancellationToken) && !await CanRecordAsync(cancellationToken))
            return Forbid();

        var result = await _service.SearchEmployeesAsync(search, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<TeacherConductEmployeeLookupDto>>.SuccessResponse(result));
    }

    [HttpPost("note")]
    public async Task<IActionResult> UpsertNote(
        [FromBody] TeacherConductNoteUpsertDto request,
        CancellationToken cancellationToken)
    {
        if (!await CanRecordAsync(cancellationToken))
            return Forbid();

        try
        {
            var recorder = await ResolveRecorderAsync(cancellationToken);
            var result = await _service.UpsertNoteAsync(
                request,
                recorder.EmployeeId,
                recorder.Name,
                cancellationToken);
            return Ok(ApiResponse<TeacherConductNoteDto>.SuccessResponse(result, "Saved."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("note/{id:int}/delete")]
    public async Task<IActionResult> DeleteNote(int id, CancellationToken cancellationToken)
    {
        if (!await CanRecordAsync(cancellationToken))
            return Forbid();

        try
        {
            await _service.DeleteNoteAsync(id, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Removed."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyHistory(
        [FromQuery] int month,
        [FromQuery] int year,
        CancellationToken cancellationToken)
    {
        var employeeId = await TryGetEmployeeIdAsync(cancellationToken);
        if (!employeeId.HasValue)
            return Forbid();

        try
        {
            var result = await _service.GetEmployeeHistoryAsync(employeeId.Value, month, year, cancellationToken);
            return Ok(ApiResponse<TeacherConductHistoryDto>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("employee/{employeeId:int}")]
    public async Task<IActionResult> GetEmployeeHistory(
        int employeeId,
        [FromQuery] int month,
        [FromQuery] int year,
        CancellationToken cancellationToken)
    {
        if (!await CanReadEmployeeHistoryAsync(employeeId, cancellationToken))
            return Forbid();

        try
        {
            var result = await _service.GetEmployeeHistoryAsync(employeeId, month, year, cancellationToken);
            return Ok(ApiResponse<TeacherConductHistoryDto>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("report")]
    public async Task<IActionResult> GetDayReport(
        [FromQuery] DateOnly date,
        [FromQuery] DateOnly? dateTo,
        [FromQuery] int? subjectEmployeeId,
        [FromQuery] int? recordedByEmployeeId,
        CancellationToken cancellationToken)
    {
        if (!await CanViewReportAsync(cancellationToken))
            return Forbid();

        try
        {
            if (date == default)
                return BadRequest(ApiResponse<object>.FailureResponse("Date is required."));

            var result = await _service.GetDayReportAsync(
                date,
                dateTo,
                subjectEmployeeId,
                recordedByEmployeeId,
                cancellationToken);
            return Ok(ApiResponse<TeacherConductDayReportDto>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    private async Task<bool> CanReadCatalogAsync(CancellationToken cancellationToken)
    {
        if (await CanViewReportAsync(cancellationToken))
            return true;
        if (await CanViewOthersAsync(cancellationToken))
            return true;
        if (await CanRecordAsync(cancellationToken))
            return true;
        return await TryGetEmployeeIdAsync(cancellationToken) is > 0;
    }

    private async Task<bool> CanManageTypesAsync(CancellationToken cancellationToken)
    {
        if (CampusUserAccess.TryGetCampusUserId(User, out var campusUserId)
            && await CampusUserAccess.HasPermissionAsync(_context, campusUserId, ViewPermission, cancellationToken))
            return true;

        return await IsCoordinatorAsync(cancellationToken);
    }

    private async Task<bool> CanRecordAsync(CancellationToken cancellationToken)
    {
        var employeeId = await TryGetEmployeeIdAsync(cancellationToken);
        if (!employeeId.HasValue)
            return false;

        if (await IsCoordinatorAsync(employeeId.Value, cancellationToken))
            return true;

        return await _context.Employees.AsNoTracking()
            .AnyAsync(x => x.ID == employeeId && x.CanRecordTeacherConduct, cancellationToken);
    }

    private async Task<bool> CanViewOthersAsync(CancellationToken cancellationToken)
    {
        var employeeId = await TryGetEmployeeIdAsync(cancellationToken);
        if (!employeeId.HasValue)
            return false;

        if (await IsCoordinatorAsync(employeeId.Value, cancellationToken))
            return true;

        return await _context.Employees.AsNoTracking()
            .AnyAsync(x => x.ID == employeeId && x.CanViewTeacherConduct, cancellationToken);
    }

    private async Task<bool> CanViewReportAsync(CancellationToken cancellationToken)
    {
        if (await CanViewOthersAsync(cancellationToken))
            return true;

        if (CampusUserAccess.TryGetCampusUserId(User, out var campusUserId))
            return await CampusUserAccess.HasPermissionAsync(_context, campusUserId, ViewPermission, cancellationToken);

        return false;
    }

    private async Task<bool> CanReadEmployeeHistoryAsync(int subjectEmployeeId, CancellationToken cancellationToken)
    {
        var employeeId = await TryGetEmployeeIdAsync(cancellationToken);
        if (employeeId == subjectEmployeeId)
            return true;

        if (await CanViewOthersAsync(cancellationToken))
            return true;

        if (CampusUserAccess.TryGetCampusUserId(User, out var campusUserId))
            return await CampusUserAccess.HasPermissionAsync(_context, campusUserId, ViewPermission, cancellationToken);

        return false;
    }

    private async Task<int?> TryGetEmployeeIdAsync(CancellationToken cancellationToken)
    {
        var isEmployee = string.Equals(
            User.FindFirst(AuthSourceClaims.ClaimType)?.Value,
            AuthSourceClaims.Employee,
            StringComparison.OrdinalIgnoreCase);

        if (!isEmployee || !int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var employeeId) || employeeId <= 0)
            return null;

        return employeeId;
    }

    private async Task<bool> IsCoordinatorAsync(CancellationToken cancellationToken)
    {
        var employeeId = await TryGetEmployeeIdAsync(cancellationToken);
        if (!employeeId.HasValue)
            return false;
        return await IsCoordinatorAsync(employeeId.Value, cancellationToken);
    }

    private Task<bool> IsCoordinatorAsync(int employeeId, CancellationToken cancellationToken) =>
        _context.Employees.AsNoTracking()
            .AnyAsync(x => x.ID == employeeId && x.DesignationID == EmployeeDesignations.Coordinator, cancellationToken);

    private async Task<(int? EmployeeId, string? Name)> ResolveRecorderAsync(CancellationToken cancellationToken)
    {
        var employeeId = await TryGetEmployeeIdAsync(cancellationToken);
        if (!employeeId.HasValue)
            return (null, "Campus staff");

        var name = await _context.Employees.AsNoTracking()
            .Where(x => x.ID == employeeId)
            .Select(x => x.EmployeeName)
            .FirstOrDefaultAsync(cancellationToken);

        return (employeeId, string.IsNullOrWhiteSpace(name) ? "Staff" : name.Trim());
    }
}
