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
public class InstituteSettingsController : ControllerBase
{
    private readonly IAcademicInstituteSettingsService _instituteSettingsService;

    public InstituteSettingsController(IAcademicInstituteSettingsService instituteSettingsService)
    {
        _instituteSettingsService = instituteSettingsService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var result = await _instituteSettingsService.GetAllAsync(cancellationToken);
        return Ok(ApiResponse<List<InstituteSettingsDto>>.SuccessResponse(result));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await _instituteSettingsService.GetByIdAsync(id, cancellationToken);
        if (result == null)
        {
            return NotFound(ApiResponse<InstituteSettingsDto>.FailureResponse("Institute settings not found."));
        }

        return Ok(ApiResponse<InstituteSettingsDto>.SuccessResponse(result));
    }

    [HttpPost("upsert")]
    public async Task<IActionResult> Upsert([FromBody] UpsertInstituteSettingsRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _instituteSettingsService.UpsertAsync(request, cancellationToken);
            return Ok(ApiResponse<InstituteSettingsDto>.SuccessResponse(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<InstituteSettingsDto>.FailureResponse(ex.Message));
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var deleted = await _instituteSettingsService.DeleteAsync(id, cancellationToken);
        if (!deleted)
        {
            return NotFound(ApiResponse<object>.FailureResponse("Institute settings not found."));
        }

        return Ok(ApiResponse<object>.SuccessResponse(new { }, "Institute settings deleted."));
    }
}
