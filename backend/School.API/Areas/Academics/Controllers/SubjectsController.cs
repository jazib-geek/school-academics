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
public class SubjectsController : ControllerBase
{
    private readonly IAcademicCatalogService _academicCatalogService;

    public SubjectsController(IAcademicCatalogService academicCatalogService)
    {
        _academicCatalogService = academicCatalogService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _academicCatalogService.GetSubjectsAsync();
        return Ok(ApiResponse<List<AcademicSubjectDto>>.SuccessResponse(result));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _academicCatalogService.GetSubjectByIdAsync(id);
        if (result == null)
        {
            return NotFound(ApiResponse<AcademicSubjectDto>.FailureResponse("Subject not found."));
        }

        return Ok(ApiResponse<AcademicSubjectDto>.SuccessResponse(result));
    }

    [HttpPost("upsert")]
    public async Task<IActionResult> Upsert([FromBody] UpsertAcademicSubjectRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.SubjectName))
        {
            return BadRequest(ApiResponse<AcademicSubjectDto>.FailureResponse("SubjectName is required."));
        }

        try
        {
            var result = await _academicCatalogService.UpsertSubjectAsync(request);
            return Ok(ApiResponse<AcademicSubjectDto>.SuccessResponse(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AcademicSubjectDto>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{id:int}/catalog-headings")]
    public async Task<IActionResult> UpdateCatalogHeadings(int id, [FromBody] UpdateCatalogHeadingsRequestDto request)
    {
        try
        {
            var result = await _academicCatalogService.UpdateCatalogHeadingsAsync(id, request);
            return Ok(ApiResponse<AcademicSubjectDto>.SuccessResponse(result));
        }
        catch (InvalidOperationException ex)
        {
            var missing = ex.Message == "Subject not found.";
            return missing
                ? NotFound(ApiResponse<AcademicSubjectDto>.FailureResponse(ex.Message))
                : BadRequest(ApiResponse<AcademicSubjectDto>.FailureResponse(ex.Message));
        }
    }

    /// <summary>POST delete route for Plesk/proxies that block HTTP DELETE.</summary>
    [HttpPost("{id:int}/delete")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var deleted = await _academicCatalogService.DeleteSubjectAsync(id);
            if (!deleted)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Subject not found."));
            }

            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Subject deleted."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }
}
