using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/campus/designations")]
public class DesignationsController : ControllerBase
{
    private readonly IDesignationService _designationService;

    public DesignationsController(IDesignationService designationService)
    {
        _designationService = designationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetDesignations(CancellationToken cancellationToken)
    {
        var result = await _designationService.GetDesignationsAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<DesignationDto>>.SuccessResponse(result));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetDesignation(int id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _designationService.GetDesignationAsync(id, cancellationToken);
            return Ok(ApiResponse<DesignationDto>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateDesignation(
        [FromBody] DesignationUpsertDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _designationService.CreateDesignationAsync(request, cancellationToken);
            return CreatedAtAction(
                nameof(GetDesignation),
                new { id = result.ID },
                ApiResponse<DesignationDto>.SuccessResponse(result, "Designation created."));
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
                "The designation could not be created because a unique value is already in use."));
        }
    }

    [HttpPost("{id:int}/update")]
    public async Task<IActionResult> UpdateDesignation(
        int id,
        [FromBody] DesignationUpsertDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _designationService.UpdateDesignationAsync(id, request, cancellationToken);
            return Ok(ApiResponse<DesignationDto>.SuccessResponse(result, "Designation updated."));
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
                "The designation could not be updated because a unique value is already in use."));
        }
    }

    [HttpPost("{id:int}/status")]
    public async Task<IActionResult> SetDesignationStatus(
        int id,
        [FromBody] DesignationStatusUpdateDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _designationService.SetDesignationStatusAsync(id, request.IsActive, cancellationToken);
            var message = request.IsActive ? "Designation activated." : "Designation deactivated.";
            return Ok(ApiResponse<object>.SuccessResponse(new { }, message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    /// <summary>POST delete route for Plesk/proxies that block HTTP DELETE.</summary>
    [HttpPost("{id:int}/delete")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteDesignation(int id, CancellationToken cancellationToken)
    {
        try
        {
            await _designationService.DeleteDesignationAsync(id, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Designation deleted."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }
}
