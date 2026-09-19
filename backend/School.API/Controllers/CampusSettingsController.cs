using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/campus/settings")]
public class CampusSettingsController : ControllerBase
{
    private readonly ICampusSettingsService _settings;

    public CampusSettingsController(ICampusSettingsService settings) => _settings = settings;

    [HttpGet("classes")]
    public async Task<IActionResult> GetClasses(CancellationToken cancellationToken) =>
        Ok(ApiResponse<IReadOnlyList<CampusClassDto>>.SuccessResponse(await _settings.GetClassesAsync(cancellationToken)));

    [HttpPost("classes")]
    public Task<IActionResult> CreateClass([FromBody] CampusClassUpsertDto request, CancellationToken cancellationToken) =>
        ExecuteCreate(() => _settings.CreateClassAsync(request, cancellationToken), "Class created.");

    [HttpPost("classes/{id:int}/update")]
    public Task<IActionResult> UpdateClass(int id, [FromBody] CampusClassUpsertDto request, CancellationToken cancellationToken) =>
        ExecuteUpdate(() => _settings.UpdateClassAsync(id, request, cancellationToken), "Class updated.");

    [HttpPost("classes/{id:int}/status")]
    public Task<IActionResult> SetClassStatus(int id, [FromBody] StatusUpdateDto request, CancellationToken cancellationToken) =>
        ExecuteStatus(() => _settings.SetClassStatusAsync(id, request.IsActive, cancellationToken), request.IsActive, "Class");

    [HttpGet("section-colors")]
    public async Task<IActionResult> GetSectionColors(CancellationToken cancellationToken) =>
        Ok(ApiResponse<IReadOnlyList<SectionColorDto>>.SuccessResponse(await _settings.GetSectionColorsAsync(cancellationToken)));

    [HttpPost("section-colors")]
    public Task<IActionResult> CreateSectionColor([FromBody] SectionColorUpsertDto request, CancellationToken cancellationToken) =>
        ExecuteCreate(() => _settings.CreateSectionColorAsync(request, cancellationToken), "Section color created.");

    [HttpPost("section-colors/{id:int}/update")]
    public Task<IActionResult> UpdateSectionColor(int id, [FromBody] SectionColorUpsertDto request, CancellationToken cancellationToken) =>
        ExecuteUpdate(() => _settings.UpdateSectionColorAsync(id, request, cancellationToken), "Section color updated.");

    [HttpPost("section-colors/{id:int}/status")]
    public Task<IActionResult> SetSectionColorStatus(int id, [FromBody] StatusUpdateDto request, CancellationToken cancellationToken) =>
        ExecuteStatus(() => _settings.SetSectionColorStatusAsync(id, request.IsActive, cancellationToken), request.IsActive, "Section color");

    [HttpPost("section-colors/{id:int}/delete")]
    public async Task<IActionResult> DeleteSectionColor(int id, CancellationToken cancellationToken)
    {
        try
        {
            await _settings.DeleteSectionColorAsync(id, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Section color deleted."));
        }
        catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.FailureResponse(ex.Message)); }
        catch (InvalidOperationException ex) { return Conflict(ApiResponse<object>.FailureResponse(ex.Message)); }
    }

    [HttpGet("sections")]
    public async Task<IActionResult> GetSections(CancellationToken cancellationToken) =>
        Ok(ApiResponse<IReadOnlyList<CampusSectionDto>>.SuccessResponse(await _settings.GetSectionsAsync(cancellationToken)));

    [HttpPost("sections")]
    public Task<IActionResult> CreateSection([FromBody] CampusSectionUpsertDto request, CancellationToken cancellationToken) =>
        ExecuteCreate(() => _settings.CreateSectionAsync(request, cancellationToken), "Section created.");

    [HttpPost("sections/{id:int}/update")]
    public Task<IActionResult> UpdateSection(int id, [FromBody] CampusSectionUpsertDto request, CancellationToken cancellationToken) =>
        ExecuteUpdate(() => _settings.UpdateSectionAsync(id, request, cancellationToken), "Section updated.");

    [HttpPost("sections/{id:int}/status")]
    public Task<IActionResult> SetSectionStatus(int id, [FromBody] StatusUpdateDto request, CancellationToken cancellationToken) =>
        ExecuteStatus(() => _settings.SetSectionStatusAsync(id, request.IsActive, cancellationToken), request.IsActive, "Section");

    [HttpGet("occupations")]
    public async Task<IActionResult> GetOccupations(CancellationToken cancellationToken) =>
        Ok(ApiResponse<IReadOnlyList<OccupationDto>>.SuccessResponse(await _settings.GetOccupationsAsync(cancellationToken)));

    [HttpPost("occupations")]
    public Task<IActionResult> CreateOccupation([FromBody] OccupationUpsertDto request, CancellationToken cancellationToken) =>
        ExecuteCreate(() => _settings.CreateOccupationAsync(request, cancellationToken), "Occupation created.");

    [HttpPost("occupations/{id:int}/update")]
    public Task<IActionResult> UpdateOccupation(int id, [FromBody] OccupationUpsertDto request, CancellationToken cancellationToken) =>
        ExecuteUpdate(() => _settings.UpdateOccupationAsync(id, request, cancellationToken), "Occupation updated.");

    [HttpPost("occupations/{id:int}/status")]
    public Task<IActionResult> SetOccupationStatus(int id, [FromBody] StatusUpdateDto request, CancellationToken cancellationToken) =>
        ExecuteStatus(() => _settings.SetOccupationStatusAsync(id, request.IsActive, cancellationToken), request.IsActive, "Occupation");

    [HttpGet("degrees")]
    public async Task<IActionResult> GetDegrees(CancellationToken cancellationToken) =>
        Ok(ApiResponse<IReadOnlyList<DegreeLookupDto>>.SuccessResponse(await _settings.GetDegreesAsync(cancellationToken)));

    [HttpPost("degrees")]
    public Task<IActionResult> CreateDegree([FromBody] DegreeLookupUpsertDto request, CancellationToken cancellationToken) =>
        ExecuteCreate(() => _settings.CreateDegreeAsync(request, cancellationToken), "Degree created.");

    [HttpPost("degrees/{id:int}/update")]
    public Task<IActionResult> UpdateDegree(int id, [FromBody] DegreeLookupUpsertDto request, CancellationToken cancellationToken) =>
        ExecuteUpdate(() => _settings.UpdateDegreeAsync(id, request, cancellationToken), "Degree updated.");

    [HttpPost("degrees/{id:int}/status")]
    public Task<IActionResult> SetDegreeStatus(int id, [FromBody] StatusUpdateDto request, CancellationToken cancellationToken) =>
        ExecuteStatus(() => _settings.SetDegreeStatusAsync(id, request.IsActive, cancellationToken), request.IsActive, "Degree");

    private async Task<IActionResult> ExecuteCreate<T>(Func<Task<T>> action, string message)
    {
        try { return Ok(ApiResponse<T>.SuccessResponse(await action(), message)); }
        catch (ArgumentException ex) { return BadRequest(ApiResponse<object>.FailureResponse(ex.Message)); }
        catch (InvalidOperationException ex) { return Conflict(ApiResponse<object>.FailureResponse(ex.Message)); }
        catch (DbUpdateException) { return Conflict(ApiResponse<object>.FailureResponse("Could not create because a unique value is already in use.")); }
    }

    private async Task<IActionResult> ExecuteUpdate<T>(Func<Task<T>> action, string message)
    {
        try { return Ok(ApiResponse<T>.SuccessResponse(await action(), message)); }
        catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.FailureResponse(ex.Message)); }
        catch (ArgumentException ex) { return BadRequest(ApiResponse<object>.FailureResponse(ex.Message)); }
        catch (InvalidOperationException ex) { return Conflict(ApiResponse<object>.FailureResponse(ex.Message)); }
        catch (DbUpdateException) { return Conflict(ApiResponse<object>.FailureResponse("Could not update because a unique value is already in use.")); }
    }

    private async Task<IActionResult> ExecuteStatus(Func<Task> action, bool isActive, string label)
    {
        try
        {
            await action();
            return Ok(ApiResponse<object>.SuccessResponse(new { }, isActive ? $"{label} activated." : $"{label} deactivated."));
        }
        catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.FailureResponse(ex.Message)); }
    }
}
