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
public class QuestionCatalogController : ControllerBase
{
    private readonly IAcademicCatalogService _academicCatalogService;

    public QuestionCatalogController(IAcademicCatalogService academicCatalogService)
    {
        _academicCatalogService = academicCatalogService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? chapterId = null)
    {
        var result = await _academicCatalogService.GetQuestionCatalogAsync(chapterId);
        return Ok(ApiResponse<List<QuestionCatalogDto>>.SuccessResponse(result));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _academicCatalogService.GetQuestionCatalogByIdAsync(id);
        if (result == null)
        {
            return NotFound(ApiResponse<QuestionCatalogDto>.FailureResponse("Question not found."));
        }

        return Ok(ApiResponse<QuestionCatalogDto>.SuccessResponse(result));
    }

    [HttpPost("upsert")]
    public async Task<IActionResult> Upsert([FromBody] UpsertQuestionCatalogRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Type) ||
            string.IsNullOrWhiteSpace(request.Category) ||
            string.IsNullOrWhiteSpace(request.DescriptionText) ||
            request.ChapterId <= 0)
        {
            return BadRequest(ApiResponse<QuestionCatalogDto>.FailureResponse(
                "Type, Category, ChapterId and DescriptionText are required."));
        }

        try
        {
            var result = await _academicCatalogService.UpsertQuestionCatalogAsync(request);
            return Ok(ApiResponse<QuestionCatalogDto>.SuccessResponse(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<QuestionCatalogDto>.FailureResponse(ex.Message));
        }
    }

    /// <summary>POST delete route for Plesk/proxies that block HTTP DELETE.</summary>
    [HttpPost("{id:int}/delete")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _academicCatalogService.DeleteQuestionCatalogAsync(id);
        if (!deleted)
        {
            return NotFound(ApiResponse<object>.FailureResponse("Question not found."));
        }

        return Ok(ApiResponse<object>.SuccessResponse(new { }, "Question deleted."));
    }
}
