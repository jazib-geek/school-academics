using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class ExamReportsController : ControllerBase
{
    private readonly ISmartExamReportService _smart;

    public ExamReportsController(ISmartExamReportService smart)
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

    [HttpGet("smart/class-subjects")]
    public async Task<IActionResult> GetClassSubjects([FromQuery] int sectionId)
    {
        if (sectionId <= 0)
            return BadRequest(ApiResponse<object>.FailureResponse("Please choose a class."));

        var subjects = await _smart.GetClassSubjectsAsync(sectionId);
        return Ok(ApiResponse<object>.SuccessResponse(subjects));
    }

    [HttpPost("smart/run")]
    public async Task<IActionResult> RunSmartReport([FromBody] SmartStudentReportRunRequestDto? request)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.ReportId))
        {
            return BadRequest(ApiResponse<object>.FailureResponse("Please choose a report."));
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
