using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/parent/leave")]
public class FamilyPortalLeaveController : ControllerBase
{
    private readonly IStudentLeaveApplicationService _service;

    public FamilyPortalLeaveController(IStudentLeaveApplicationService service)
    {
        _service = service;
    }

    [HttpGet("reasons")]
    public IActionResult GetReasons()
    {
        if (!TryGetFamilyIdentity(out _, out var error))
            return error!;

        var result = _service.GetReasonCatalog();
        return Ok(ApiResponse<IReadOnlyList<StudentLeaveReasonOptionDto>>.SuccessResponse(result));
    }

    [HttpGet("students/{studentId:int}")]
    public async Task<IActionResult> ListForStudent(
        int studentId,
        CancellationToken cancellationToken)
    {
        if (!TryGetFamilyIdentity(out var familyId, out var error))
            return error!;

        try
        {
            var result = await _service.ListForFamilyStudentAsync(familyId, studentId, cancellationToken);
            return Ok(ApiResponse<ParentLeaveApplicationListDto>.SuccessResponse(result));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("students/{studentId:int}")]
    public async Task<IActionResult> Submit(
        int studentId,
        [FromBody] ParentLeaveSubmitRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetFamilyIdentity(out var familyId, out var error))
            return error!;

        try
        {
            var result = await _service.SubmitForFamilyAsync(familyId, studentId, request, cancellationToken);
            return Ok(ApiResponse<ParentLeaveSubmitResultDto>.SuccessResponse(
                result,
                "Leave request submitted."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    private bool TryGetFamilyIdentity(out int familyId, out IActionResult? error)
    {
        familyId = 0;
        error = null;

        if (!string.IsNullOrWhiteSpace(User.FindFirst(AuthSourceClaims.ClaimType)?.Value))
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
