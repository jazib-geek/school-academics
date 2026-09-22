using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using School.Application.Academics.DTOs;
using School.Application.Academics.Interfaces;
using School.Application.Common;

namespace School.API.Areas.Academics.Controllers;

[Area("Academics")]
[ApiController]
[Authorize(Policy = "AcademicsOnly")]
[Route("api/academics/[controller]")]
public class ExamMakerController : ControllerBase
{
    private readonly IAcademicExamMakerService _academicExamMakerService;
    private readonly ILogger<ExamMakerController> _logger;

    public ExamMakerController(IAcademicExamMakerService academicExamMakerService, ILogger<ExamMakerController> logger)
    {
        _academicExamMakerService = academicExamMakerService;
        _logger = logger;
    }

    [HttpGet("question-pool")]
    public async Task<IActionResult> GetQuestionPool(
        [FromQuery] int classId,
        [FromQuery] int subjectId,
        [FromQuery] List<int>? chapterIds = null,
        [FromQuery] string? search = null,
        [FromQuery] string? type = null,
        [FromQuery] string? category = null,
        [FromQuery] int take = 120)
    {
        if (classId <= 0 || subjectId <= 0)
        {
            return BadRequest(ApiResponse<List<QuestionCatalogDto>>.FailureResponse("classId and subjectId are required."));
        }

        var safeTake = Math.Clamp(take, 20, 250);
        var result = await _academicExamMakerService.GetQuestionPoolAsync(classId, subjectId, chapterIds, search, type, category, safeTake);
        return Ok(ApiResponse<List<QuestionCatalogDto>>.SuccessResponse(result));
    }

    [HttpGet("question-availability")]
    public async Task<IActionResult> GetQuestionAvailability([FromQuery] int classId, [FromQuery] int subjectId)
    {
        if (classId <= 0 || subjectId <= 0)
        {
            return BadRequest(ApiResponse<List<QuestionChapterAvailabilityDto>>.FailureResponse("classId and subjectId are required."));
        }

        try
        {
            var result = await _academicExamMakerService.GetQuestionAvailabilityByChapterAsync(classId, subjectId);
            return Ok(ApiResponse<List<QuestionChapterAvailabilityDto>>.SuccessResponse(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<List<QuestionChapterAvailabilityDto>>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromBody] GenerateExamPaperRequestDto request)
    {
        try
        {
            var result = await _academicExamMakerService.GeneratePaperAsync(request);
            return Ok(ApiResponse<ExamPaperDto>.SuccessResponse(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ExamPaperDto>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("create-from-selection")]
    public async Task<IActionResult> CreateFromSelection([FromBody] CreateExamPaperFromSelectionRequestDto request)
    {
        if (request == null)
        {
            return BadRequest(ApiResponse<ExamPaperDto>.FailureResponse("Request cannot be empty."));
        }

        if (request.SelectedQuestions == null || request.SelectedQuestions.Count == 0)
        {
            return BadRequest(ApiResponse<ExamPaperDto>.FailureResponse("At least one question must be selected."));
        }

        var invalidMarks = request.SelectedQuestions.Any(q => q.Marks < 1 || q.Marks > 100);
        if (invalidMarks)
        {
            return BadRequest(ApiResponse<ExamPaperDto>.FailureResponse("Question marks must be between 1 and 100."));
        }

        try
        {
            var result = await _academicExamMakerService.CreatePaperFromSelectionAsync(request);
            return Ok(ApiResponse<ExamPaperDto>.SuccessResponse(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ExamPaperDto>.FailureResponse(ex.Message));
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "ExamMaker create-from-selection: database error after service logging.");
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                ApiResponse<ExamPaperDto>.FailureResponse(
                    "Database error while saving the exam. Check server logs for the full exception."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ExamMaker create-from-selection: unexpected error.");
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                ApiResponse<ExamPaperDto>.FailureResponse(
                    "Unable to save the exam. Check server logs for details."));
        }
    }

    /// <summary>POST is offered in addition to PUT: some hosts/WAFs return 403 + HTML for PUT while POST succeeds.</summary>
    [HttpPost("papers/{id:int}/from-selection")]
    [HttpPut("papers/{id:int}/from-selection")]
    public async Task<IActionResult> UpdateFromSelection(int id, [FromBody] CreateExamPaperFromSelectionRequestDto request)
    {
        if (request == null)
        {
            return BadRequest(ApiResponse<ExamPaperDto>.FailureResponse("Request cannot be empty."));
        }

        if (request.SelectedQuestions == null || request.SelectedQuestions.Count == 0)
        {
            return BadRequest(ApiResponse<ExamPaperDto>.FailureResponse("At least one question must be selected."));
        }

        var invalidMarks = request.SelectedQuestions.Any(q => q.Marks < 1 || q.Marks > 100);
        if (invalidMarks)
        {
            return BadRequest(ApiResponse<ExamPaperDto>.FailureResponse("Question marks must be between 1 and 100."));
        }

        try
        {
            var result = await _academicExamMakerService.UpdatePaperFromSelectionAsync(id, request);
            return Ok(ApiResponse<ExamPaperDto>.SuccessResponse(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ExamPaperDto>.FailureResponse(ex.Message));
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "ExamMaker update-from-selection PaperId={PaperId}: database error after service logging.", id);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                ApiResponse<ExamPaperDto>.FailureResponse(
                    "Database error while saving the exam. Check server logs for the full exception."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ExamMaker update-from-selection PaperId={PaperId}: unexpected error.", id);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                ApiResponse<ExamPaperDto>.FailureResponse(
                    "Unable to save the exam. Check server logs for details."));
        }
    }

    [HttpPost("papers/{id:int}/print-adjustments")]
    public async Task<IActionResult> UpdatePrintAdjustments(int id, [FromBody] ExamPaperPrintAdjustmentsDto? request)
    {
        try
        {
            var result = await _academicExamMakerService.UpdatePrintAdjustmentsAsync(id, request);
            return Ok(ApiResponse<ExamPaperDto>.SuccessResponse(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ExamPaperDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ExamMaker print-adjustments PaperId={PaperId}: unexpected error.", id);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                ApiResponse<ExamPaperDto>.FailureResponse("Unable to save print layout. Check server logs for details."));
        }
    }

    [HttpPost("auto-from-chapters")]
    public async Task<IActionResult> AutoFromChapters([FromBody] RandomizeExamPaperRequestDto request)
    {
        if (request == null)
        {
            return BadRequest(ApiResponse<ExamPaperDto>.FailureResponse("Request cannot be empty."));
        }

        if (request.ChapterRules == null || request.ChapterRules.Count == 0)
        {
            return BadRequest(ApiResponse<ExamPaperDto>.FailureResponse("Select at least one chapter and question count."));
        }

        var invalidCount = request.ChapterRules.Any(rule =>
            rule.McqCount < 0 ||
            rule.SaqCount < 0 ||
            rule.LaqCount < 0 ||
            rule.McqCount > 250 ||
            rule.SaqCount > 250 ||
            rule.LaqCount > 250);
        if (invalidCount)
        {
            return BadRequest(ApiResponse<ExamPaperDto>.FailureResponse("Question counts must be between 0 and 250."));
        }

        try
        {
            var result = await _academicExamMakerService.RandomizePaperFromChaptersAsync(request);
            return Ok(ApiResponse<ExamPaperDto>.SuccessResponse(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ExamPaperDto>.FailureResponse(ex.Message));
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "ExamMaker auto-from-chapters: database error after service logging.");
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                ApiResponse<ExamPaperDto>.FailureResponse(
                    "Database error while saving the randomized exam. Check server logs for the full exception."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ExamMaker auto-from-chapters: unexpected error.");
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                ApiResponse<ExamPaperDto>.FailureResponse(
                    "Unable to save the randomized exam. Check server logs for details."));
        }
    }

    [HttpGet("papers")]
    public async Task<IActionResult> GetPapers([FromQuery] int? classId = null, [FromQuery] int? subjectId = null)
    {
        var result = await _academicExamMakerService.GetPapersAsync(classId, subjectId);
        return Ok(ApiResponse<List<ExamPaperDto>>.SuccessResponse(result));
    }

    [HttpGet("papers/{id:int}")]
    public async Task<IActionResult> GetPaperById(int id)
    {
        var result = await _academicExamMakerService.GetPaperByIdAsync(id);
        if (result == null)
        {
            return NotFound(ApiResponse<ExamPaperDto>.FailureResponse("Paper not found."));
        }

        return Ok(ApiResponse<ExamPaperDto>.SuccessResponse(result));
    }

    /// <summary>POST delete route for Plesk/proxies that block HTTP DELETE.</summary>
    [HttpPost("papers/{id:int}/delete")]
    [HttpDelete("papers/{id:int}")]
    public async Task<IActionResult> DeletePaper(int id)
    {
        try
        {
            var deleted = await _academicExamMakerService.DeletePaperAsync(id);
            if (!deleted)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Paper not found."));
            }

            return Ok(ApiResponse<bool>.SuccessResponse(true));
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "ExamMaker delete PaperId={PaperId}: database error.", id);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                ApiResponse<bool>.FailureResponse("Database error while deleting the exam paper."));
        }
    }
}
