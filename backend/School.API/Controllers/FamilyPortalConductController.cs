using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/parent/conduct")]
public class FamilyPortalConductController : ControllerBase
{
    private readonly IParentConductService _service;

    public FamilyPortalConductController(IParentConductService service)
    {
        _service = service;
    }

    [HttpGet("inbox")]
    public async Task<IActionResult> GetInbox(CancellationToken cancellationToken)
    {
        if (!TryGetFamilyIdentity(out var familyId, out var error))
            return error!;

        var result = await _service.GetInboxAsync(familyId, cancellationToken);
        return Ok(ApiResponse<ParentConductInboxDto>.SuccessResponse(result));
    }

    [HttpGet("students/{studentId:int}/unread-count")]
    public async Task<IActionResult> GetUnreadCount(
        int studentId,
        CancellationToken cancellationToken)
    {
        if (!TryGetFamilyIdentity(out var familyId, out var error))
            return error!;

        try
        {
            var result = await _service.GetUnreadCountAsync(familyId, studentId, cancellationToken);
            return Ok(ApiResponse<ParentConductUnreadCountDto>.SuccessResponse(result));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("students/{studentId:int}")]
    public async Task<IActionResult> GetMonthReport(
        int studentId,
        [FromQuery] int month,
        [FromQuery] int year,
        CancellationToken cancellationToken)
    {
        if (!TryGetFamilyIdentity(out var familyId, out var error))
            return error!;

        if (month <= 0 || year <= 0)
        {
            var today = PakistanTime.Today;
            if (month <= 0) month = today.Month;
            if (year <= 0) year = today.Year;
        }

        try
        {
            var result = await _service.GetMonthReportAsync(
                familyId,
                studentId,
                month,
                year,
                cancellationToken);
            return Ok(ApiResponse<ParentConductMonthReportDto>.SuccessResponse(result));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("students/{studentId:int}/acknowledge-all")]
    public async Task<IActionResult> AcknowledgeAllForStudent(
        int studentId,
        CancellationToken cancellationToken)
    {
        if (!TryGetFamilyIdentity(out var familyId, out var error))
            return error!;

        try
        {
            var result = await _service.AcknowledgeAllForStudentAsync(familyId, studentId, cancellationToken);
            return Ok(ApiResponse<ParentConductAcknowledgeAllResultDto>.SuccessResponse(
                result,
                "All conduct notes marked as read."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("acknowledge")]
    public async Task<IActionResult> Acknowledge(
        [FromBody] ParentConductAcknowledgeRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetFamilyIdentity(out var familyId, out var error))
            return error!;

        try
        {
            await _service.AcknowledgeAsync(familyId, request, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Conduct notes acknowledged."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    private bool TryGetFamilyIdentity(out int familyId, out IActionResult? error)
    {
        familyId = 0;
        error = null;

        var authSource = User.FindFirst(AuthSourceClaims.ClaimType)?.Value;
        if (!string.IsNullOrWhiteSpace(authSource))
        {
            error = Unauthorized(ApiResponse<object>.FailureResponse("Family Portal sign-in is required."));
            return false;
        }

        if (!int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var familyDbId) || familyDbId <= 0)
        {
            error = Unauthorized(ApiResponse<object>.FailureResponse("Family Portal sign-in is required."));
            return false;
        }

        if (!int.TryParse(User.FindFirst("FamilyID")?.Value, out familyId) || familyId <= 0)
        {
            error = Unauthorized(ApiResponse<object>.FailureResponse("Family Portal sign-in is required."));
            return false;
        }

        return true;
    }
}
