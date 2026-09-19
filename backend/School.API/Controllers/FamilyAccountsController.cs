using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/campus/family-accounts")]
public class FamilyAccountsController : ControllerBase
{
    private readonly IFamilyAccountService _service;

    public FamilyAccountsController(IFamilyAccountService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var result = await _service.GetActiveFamilyAccountsAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<FamilyAccountDto>>.SuccessResponse(result));
    }

    [HttpPost("{familyId:int}/change-password")]
    public async Task<IActionResult> ChangePassword(
        int familyId,
        [FromBody] ChangeFamilyAccountPasswordDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _service.ChangePasswordAsync(familyId, request, cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Password updated."));
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
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }
}
