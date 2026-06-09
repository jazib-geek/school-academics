using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class ExamController : ControllerBase
{
    private readonly IExamService _examService;

    public ExamController(IExamService examService)
    {
        _examService = examService;
    }

    [HttpGet("types")]
    public async Task<IActionResult> GetExamTypes()
    {
        var types = await _examService.GetExamTypesAsync();
        return Ok(types);
    }

    [HttpGet("mark-sheet")]
    public async Task<IActionResult> GetExamMarkSheet(
        [FromQuery] int sectionId,
        [FromQuery] int examTypeId,
        [FromQuery] bool includeDrawing = false,
        [FromQuery] bool includeStemp = false,
        [FromQuery] string sortBy = "position")
    {
        var options = new ExamAggregationOptions
        {
            IncludeDrawingInTotals = includeDrawing,
            IncludeStempInTotals = includeStemp
        };

        var sheet = await _examService.GetExamMarkSheetAsync(sectionId, examTypeId, options, sortBy);

        if (sheet == null)
            return NotFound(new { message = "No exam mark sheet found for this class and exam type." });

        return Ok(sheet);
    }

    [HttpGet("{studentId:int}/result/{examTypeId:int}")]
    public async Task<IActionResult> GetStudentResult(
        int studentId,
        int examTypeId,
        [FromQuery] bool includeDrawing = false,
        [FromQuery] bool includeStemp = false)
    {
        var options = new ExamAggregationOptions
        {
            IncludeDrawingInTotals = includeDrawing,
            IncludeStempInTotals = includeStemp
        };

        var result = await _examService.GetStudentResultAsync(studentId, examTypeId, options);

        if (result == null)
            return NotFound(new { message = "No exam result found for this student and exam type." });

        return Ok(result);
    }
}
