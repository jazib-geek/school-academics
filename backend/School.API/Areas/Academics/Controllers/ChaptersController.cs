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
public class ChaptersController : ControllerBase
{
    private readonly IAcademicCatalogService _academicCatalogService;

    public ChaptersController(IAcademicCatalogService academicCatalogService)
    {
        _academicCatalogService = academicCatalogService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _academicCatalogService.GetChaptersAsync();
        return Ok(ApiResponse<List<ChapterDto>>.SuccessResponse(result));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _academicCatalogService.GetChapterByIdAsync(id);
        if (result == null)
        {
            return NotFound(ApiResponse<ChapterDto>.FailureResponse("Chapter not found."));
        }

        return Ok(ApiResponse<ChapterDto>.SuccessResponse(result));
    }

    [HttpPost("upsert")]
    public async Task<IActionResult> Upsert([FromBody] UpsertChapterRequestDto request)
    {
        if (request.ClassId <= 0 || request.SubjectId <= 0 || request.ChapterNo <= 0 || string.IsNullOrWhiteSpace(request.ChapterName))
        {
            return BadRequest(ApiResponse<ChapterDto>.FailureResponse(
                "ClassId, SubjectId, ChapterNo and ChapterName are required."));
        }

        try
        {
            var result = await _academicCatalogService.UpsertChapterAsync(request);
            return Ok(ApiResponse<ChapterDto>.SuccessResponse(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ChapterDto>.FailureResponse(ex.Message));
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _academicCatalogService.DeleteChapterAsync(id);
        if (!deleted)
        {
            return NotFound(ApiResponse<object>.FailureResponse("Chapter not found."));
        }

        return Ok(ApiResponse<object>.SuccessResponse(new { }, "Chapter deleted."));
    }
}
