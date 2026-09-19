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

        var result = await _academicCatalogService.UpsertSubjectAsync(request);
        return Ok(ApiResponse<AcademicSubjectDto>.SuccessResponse(result));
    }

    /// <summary>POST delete route for Plesk/proxies that block HTTP DELETE.</summary>
    [HttpPost("{id:int}/delete")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _academicCatalogService.DeleteSubjectAsync(id);
        if (!deleted)
        {
            return NotFound(ApiResponse<object>.FailureResponse("Subject not found."));
        }

        return Ok(ApiResponse<object>.SuccessResponse(new { }, "Subject deleted."));
    }
}
