using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/fee/generate")]
public class FeeGenerateController : ControllerBase
{
    private readonly IFeeGenerateService _service;

    public FeeGenerateController(IFeeGenerateService service)
    {
        _service = service;
    }

    [HttpPost("all")]
    public async Task<IActionResult> GenerateForAll(
        [FromBody] GenerateFeeAllRequestDto? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
            return BadRequest(ApiResponse<object>.FailureResponse("Request is required."));

        try
        {
            int? userId = int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var parsedUserId)
                ? parsedUserId
                : null;
            await _service.GenerateForAllAsync(request, userId, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Fee generated for all students."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("student/{studentId:int}/period")]
    public async Task<IActionResult> GetStudentPeriod(
        int studentId,
        [FromQuery] int month,
        [FromQuery] int year,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.GetStudentPeriodAsync(studentId, month, year, cancellationToken);
            return Ok(ApiResponse<FeeGenerateStudentPeriodDto>.SuccessResponse(result));
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

    [HttpPost("student")]
    public async Task<IActionResult> GenerateForStudent(
        [FromBody] GenerateFeeStudentRequestDto? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
            return BadRequest(ApiResponse<object>.FailureResponse("Request is required."));

        try
        {
            int? userId = int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var parsedUserId)
                ? parsedUserId
                : null;
            await _service.GenerateForStudentAsync(request, userId, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Fee generated for student."));
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
}
