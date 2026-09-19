using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/campus/employees")]
public class EmployeesController : ControllerBase
{
    private readonly IEmployeeService _service;

    public EmployeesController(IEmployeeService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetEmployees([FromQuery] EmployeeListFilterDto filter, CancellationToken token)
    {
        var result = await _service.GetEmployeesAsync(filter, token);
        return Ok(ApiResponse<PagedResultDto<EmployeeListItemDto>>.SuccessResponse(result));
    }

    [HttpGet("lookups")]
    public async Task<IActionResult> GetLookups(CancellationToken token)
    {
        var result = await _service.GetLookupDataAsync(token);
        return Ok(ApiResponse<EmployeeLookupDataDto>.SuccessResponse(result));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetEmployee(int id, CancellationToken token)
    {
        try
        {
            var result = await _service.GetEmployeeAsync(id, token);
            return Ok(ApiResponse<EmployeeDetailDto>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateEmployee([FromBody] EmployeeUpsertDto request, CancellationToken token)
    {
        try
        {
            var result = await _service.CreateEmployeeAsync(request, token);
            return CreatedAtAction(nameof(GetEmployee), new { id = result.ID },
                ApiResponse<EmployeeDetailDto>.SuccessResponse(result, "Employee created."));
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
            return Conflict(ApiResponse<object>.FailureResponse(
                "The employee could not be created because a unique value is already in use."));
        }
    }

    [HttpPost("{id:int}/update")]
    public async Task<IActionResult> UpdateEmployee(int id, [FromBody] EmployeeUpsertDto request, CancellationToken token)
    {
        try
        {
            var result = await _service.UpdateEmployeeAsync(id, request, token);
            return Ok(ApiResponse<EmployeeDetailDto>.SuccessResponse(result, "Employee updated."));
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
            return Conflict(ApiResponse<object>.FailureResponse(
                "The employee could not be updated because a unique value is already in use."));
        }
    }

    [HttpPost("{id:int}/status")]
    public async Task<IActionResult> SetEmployeeStatus(
        int id,
        [FromBody] EmployeeStatusUpdateDto request,
        CancellationToken token)
    {
        try
        {
            await _service.SetEmployeeStatusAsync(id, request.IsActive, token);
            var message = request.IsActive ? "Employee activated." : "Employee deactivated.";
            return Ok(ApiResponse<object>.SuccessResponse(new { }, message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("by-thumb/{thumbId}")]
    public async Task<IActionResult> GetEmployeeByThumbId(string thumbId, CancellationToken token)
    {
        try
        {
            var result = await _service.GetEmployeeByThumbIdAsync(thumbId, token);
            return Ok(ApiResponse<EmployeeByThumbDto>.SuccessResponse(result));
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

    [HttpPost("biometric/enroll")]
    public async Task<IActionResult> EnrollFingerprint([FromBody] BiometricEnrollRequestDto request, CancellationToken token)
    {
        try
        {
            var result = await _service.EnrollFingerprintAsync(request, token);
            return Ok(ApiResponse<BiometricEnrollResponseDto>.SuccessResponse(result, "Fingerprint enrolled."));
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

    [HttpGet("biometric/templates")]
    public async Task<IActionResult> GetEnrolledTemplates(CancellationToken token)
    {
        var result = await _service.GetEnrolledFingerprintTemplatesAsync(token);
        return Ok(ApiResponse<IReadOnlyList<BiometricTemplateDto>>.SuccessResponse(result));
    }
}
