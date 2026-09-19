using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/campus/localities")]
public class LocalitiesController : ControllerBase
{
    private readonly ILocalityService _localityService;

    public LocalitiesController(ILocalityService localityService)
    {
        _localityService = localityService;
    }

    [HttpGet]
    public async Task<IActionResult> GetLocalities(CancellationToken cancellationToken)
    {
        var result = await _localityService.GetLocalitiesAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<LocalityDto>>.SuccessResponse(result));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetLocality(int id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _localityService.GetLocalityAsync(id, cancellationToken);
            return Ok(ApiResponse<LocalityDto>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateLocality(
        [FromBody] LocalityUpsertDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _localityService.CreateLocalityAsync(request, cancellationToken);
            return CreatedAtAction(
                nameof(GetLocality),
                new { id = result.Id },
                ApiResponse<LocalityDto>.SuccessResponse(result, "Locality created."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (DbUpdateException)
        {
            return Conflict(ApiResponse<object>.FailureResponse(
                "The locality could not be created because a unique value is already in use."));
        }
    }

    [HttpPost("{id:int}/update")]
    public async Task<IActionResult> UpdateLocality(
        int id,
        [FromBody] LocalityUpsertDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _localityService.UpdateLocalityAsync(id, request, cancellationToken);
            return Ok(ApiResponse<LocalityDto>.SuccessResponse(result, "Locality updated."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (DbUpdateException)
        {
            return Conflict(ApiResponse<object>.FailureResponse(
                "The locality could not be updated because a unique value is already in use."));
        }
    }

    [HttpPost("{id:int}/status")]
    public async Task<IActionResult> SetLocalityStatus(
        int id,
        [FromBody] LocalityStatusUpdateDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _localityService.SetLocalityStatusAsync(id, request.IsActive, cancellationToken);
            var message = request.IsActive ? "Locality activated." : "Locality deactivated.";
            return Ok(ApiResponse<object>.SuccessResponse(new { }, message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }
}
