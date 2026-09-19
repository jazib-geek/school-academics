using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.API.Filters;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[AuthorizeCampusOrEmployee]
[Route("api/campus/teacher-class-subject-assignments")]
public class TeacherClassSubjectAssignmentsController : ControllerBase
{
    private readonly ITeacherClassSubjectAssignmentService _service;

    public TeacherClassSubjectAssignmentsController(ITeacherClassSubjectAssignmentService service)
    {
        _service = service;
    }

    [HttpGet("employees")]
    public async Task<IActionResult> GetEmployees(CancellationToken cancellationToken)
    {
        var result = await _service.GetEmployeesAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<EmployeeLookupDto>>.SuccessResponse(result));
    }

    [HttpGet]
    public async Task<IActionResult> GetAssignments(CancellationToken cancellationToken)
    {
        var result = await _service.GetAssignmentsAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<TeacherClassSubjectAssignmentDto>>.SuccessResponse(result));
    }

    [HttpGet("mine")]
    public async Task<IActionResult> GetMyAssignments(CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var employeeId) || employeeId <= 0)
            return Unauthorized(ApiResponse<object>.FailureResponse("Employee session required."));

        try
        {
            var result = await _service.GetMyAssignmentsAsync(employeeId, cancellationToken);
            return Ok(ApiResponse<EmployeeMyAssignmentsDto>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateAssignment(
        [FromBody] TeacherClassSubjectAssignmentCreateDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.CreateAssignmentAsync(request, cancellationToken);
            return Ok(ApiResponse<TeacherClassSubjectAssignmentDto>.SuccessResponse(result, "Assignment saved."));
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

    /// <summary>POST delete route for Plesk/proxies that block HTTP DELETE.</summary>
    [HttpPost("{id:int}/delete")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteAssignment(int id, CancellationToken cancellationToken)
    {
        try
        {
            await _service.DeleteAssignmentAsync(id, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Assignment deleted."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }
}
