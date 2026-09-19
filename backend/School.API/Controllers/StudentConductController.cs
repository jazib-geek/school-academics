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
[Route("api/student-conduct")]
public class StudentConductController : ControllerBase
{
    private readonly IStudentConductService _service;
    private readonly AppDbContext _context;

    public StudentConductController(IStudentConductService service, AppDbContext context)
    {
        _service = service;
        _context = context;
    }

    [HttpGet("types")]
    public async Task<IActionResult> GetCatalog(CancellationToken cancellationToken)
    {
        var result = await _service.GetCatalogAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<StudentConductTypeDto>>.SuccessResponse(result));
    }

    [HttpGet("types/all")]
    public async Task<IActionResult> GetTypes(CancellationToken cancellationToken)
    {
        var result = await _service.GetTypesAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<StudentConductTypeDto>>.SuccessResponse(result));
    }

    [HttpGet("types/{id:int}")]
    public async Task<IActionResult> GetType(int id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.GetTypeAsync(id, cancellationToken);
            return Ok(ApiResponse<StudentConductTypeDto>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("types")]
    public async Task<IActionResult> CreateType(
        [FromBody] StudentConductTypeUpsertDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.CreateTypeAsync(request, cancellationToken);
            return CreatedAtAction(
                nameof(GetType),
                new { id = result.Id },
                ApiResponse<StudentConductTypeDto>.SuccessResponse(result, "Conduct type saved."));
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
        [FromBody] StudentConductTypeUpsertDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.UpdateTypeAsync(id, request, cancellationToken);
            return Ok(ApiResponse<StudentConductTypeDto>.SuccessResponse(result, "Conduct type updated."));
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

    [HttpGet("class-sheet")]
    public async Task<IActionResult> GetClassSheet(
        [FromQuery] DateOnly date,
        [FromQuery] int classSectionCompositeId,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.GetClassSheetAsync(date, classSectionCompositeId, cancellationToken);
            return Ok(ApiResponse<StudentConductClassSheetDto>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("note")]
    public async Task<IActionResult> UpsertNote(
        [FromBody] StudentConductNoteUpsertDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var recorder = await ResolveRecorderAsync(cancellationToken);
            var result = await _service.UpsertNoteAsync(
                request,
                recorder.EmployeeId,
                recorder.Name,
                cancellationToken);
            return Ok(ApiResponse<StudentConductNoteDto>.SuccessResponse(result, "Saved."));
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

    [HttpGet("student/{studentId:int}")]
    public async Task<IActionResult> GetStudentHistory(
        int studentId,
        [FromQuery] int month,
        [FromQuery] int year,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.GetStudentHistoryAsync(studentId, month, year, cancellationToken);
            return Ok(ApiResponse<StudentConductHistoryDto>.SuccessResponse(result));
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
        CancellationToken cancellationToken)
    {
        try
        {
            if (date == default)
                return BadRequest(ApiResponse<object>.FailureResponse("Date is required."));

            var result = await _service.GetDayReportAsync(date, cancellationToken);
            return Ok(ApiResponse<StudentConductDayReportDto>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    private async Task<(int? EmployeeId, string? Name)> ResolveRecorderAsync(CancellationToken cancellationToken)
    {
        var isEmployee = string.Equals(
            User.FindFirst(AuthSourceClaims.ClaimType)?.Value,
            AuthSourceClaims.Employee,
            StringComparison.OrdinalIgnoreCase);

        if (!isEmployee || !int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var employeeId) || employeeId <= 0)
            return (null, "Campus staff");

        var name = await _context.Employees.AsNoTracking()
            .Where(x => x.ID == employeeId)
            .Select(x => x.EmployeeName)
            .FirstOrDefaultAsync(cancellationToken);

        return (employeeId, string.IsNullOrWhiteSpace(name) ? "Staff" : name.Trim());
    }
}
