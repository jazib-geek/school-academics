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
public class ClassesController : ControllerBase
{
    private readonly IAcademicCatalogService _academicCatalogService;

    public ClassesController(IAcademicCatalogService academicCatalogService)
    {
        _academicCatalogService = academicCatalogService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _academicCatalogService.GetClassesAsync();
        return Ok(ApiResponse<List<AcademicClassDto>>.SuccessResponse(result));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _academicCatalogService.GetClassByIdAsync(id);
        if (result == null)
        {
            return NotFound(ApiResponse<AcademicClassDto>.FailureResponse("Class not found."));
        }

        return Ok(ApiResponse<AcademicClassDto>.SuccessResponse(result));
    }

    [HttpPost("upsert")]
    public async Task<IActionResult> Upsert([FromBody] UpsertAcademicClassRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.ClassName))
        {
            return BadRequest(ApiResponse<AcademicClassDto>.FailureResponse("ClassName is required."));
        }

        var result = await _academicCatalogService.UpsertClassAsync(request);
        return Ok(ApiResponse<AcademicClassDto>.SuccessResponse(result));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _academicCatalogService.DeleteClassAsync(id);
        if (!deleted)
        {
            return NotFound(ApiResponse<object>.FailureResponse("Class not found."));
        }

        return Ok(ApiResponse<object>.SuccessResponse(new { }, "Class deleted."));
    }
}
