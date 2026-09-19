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
            await _service.GenerateForAllAsync(request, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Fee generated for all students."));
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
            await _service.GenerateForStudentAsync(request, cancellationToken);
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
