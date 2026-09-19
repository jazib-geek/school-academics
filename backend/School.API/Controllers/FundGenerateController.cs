using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/fund/generate")]
public class FundGenerateController : ControllerBase
{
    private readonly IFundGenerateService _service;

    public FundGenerateController(IFundGenerateService service)
    {
        _service = service;
    }

    [HttpGet("student/{studentId:int}")]
    public async Task<IActionResult> GetStudentFunds(int studentId, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.GetStudentFundsAsync(studentId, cancellationToken);
            return Ok(ApiResponse<StudentFundAmountsDto>.SuccessResponse(result));
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
        [FromBody] GenerateFundStudentRequestDto? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
            return BadRequest(ApiResponse<object>.FailureResponse("Request is required."));

        try
        {
            await _service.GenerateForStudentAsync(request, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Funds generated for student."));
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

    [HttpPost("bulk")]
    public async Task<IActionResult> GenerateBulk(
        [FromBody] GenerateFundBulkRequestDto? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
            return BadRequest(ApiResponse<object>.FailureResponse("Request is required."));

        try
        {
            await _service.GenerateBulkAsync(request, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Funds generated."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }
}
