using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class StudentReportsController : ControllerBase
{
    private readonly ISmartStudentReportService _smart;

    public StudentReportsController(ISmartStudentReportService smart)
    {
        _smart = smart;
    }

    [HttpGet("smart/catalog")]
    public async Task<IActionResult> GetSmartCatalog()
    {
        var catalog = await _smart.GetCatalogAsync();
        return Ok(ApiResponse<object>.SuccessResponse(catalog));
    }

    [HttpGet("smart/executive-snapshot")]
    public async Task<IActionResult> GetExecutiveSnapshot()
    {
        var snapshot = await _smart.GetExecutiveSnapshotAsync();
        return Ok(ApiResponse<object>.SuccessResponse(snapshot));
    }

    [HttpPost("smart/run")]
    public async Task<IActionResult> RunSmartReport([FromBody] SmartStudentReportRunRequestDto? request)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.ReportId))
        {
            return BadRequest(ApiResponse<object>.FailureResponse("reportId is required."));
        }

        try
        {
            var result = await _smart.RunAsync(request.ReportId, request.Parameters ?? new());
            return Ok(ApiResponse<object>.SuccessResponse(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }
}
