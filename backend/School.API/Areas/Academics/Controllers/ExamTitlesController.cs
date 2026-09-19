using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Academics.DTOs;
using School.Application.Academics.Interfaces;
using School.Application.Common;

namespace School.API.Areas.Academics.Controllers;

[Area("Academics")]
[ApiController]
[Authorize(Policy = "AcademicsOnly")]
[Route("api/academics/[controller]")]
public class ExamTitlesController : ControllerBase
{
    private readonly IAcademicExamTitleService _academicExamTitleService;

    public ExamTitlesController(IAcademicExamTitleService academicExamTitleService)
    {
        _academicExamTitleService = academicExamTitleService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var result = await _academicExamTitleService.GetAllAsync(cancellationToken);
        return Ok(ApiResponse<List<ExamTitleDto>>.SuccessResponse(result));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await _academicExamTitleService.GetByIdAsync(id, cancellationToken);
        if (result == null)
        {
            return NotFound(ApiResponse<ExamTitleDto>.FailureResponse("Exam title not found."));
        }

        return Ok(ApiResponse<ExamTitleDto>.SuccessResponse(result));
    }

    [HttpPost("upsert")]
    public async Task<IActionResult> Upsert([FromBody] UpsertExamTitleRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _academicExamTitleService.UpsertAsync(request, cancellationToken);
            return Ok(ApiResponse<ExamTitleDto>.SuccessResponse(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ExamTitleDto>.FailureResponse(ex.Message));
        }
    }

    /// <summary>POST delete route for Plesk/proxies that block HTTP DELETE.</summary>
    [HttpPost("{id:int}/delete")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await _academicExamTitleService.DeleteAsync(id, cancellationToken);
            if (!deleted)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Exam title not found."));
            }

            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Exam title deleted."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }
}
