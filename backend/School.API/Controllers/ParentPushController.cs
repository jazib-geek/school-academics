using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using School.Application.Common;
using School.Application.Services;

namespace School.API.Controllers;

[ApiController, Authorize, Route("api/parent/push")]
public class ParentPushController(ParentPushService service, IOptions<ParentPushOptions> options) : ControllerBase
{
    public record RegisterRequest(Guid InstallationId, [Required, MaxLength(4096)] string Token);
    public record UnregisterRequest(Guid InstallationId);

    private bool FamilyIdentity(out int dbId, out int familyId)
    {
        dbId = familyId = 0;
        return string.IsNullOrWhiteSpace(User.FindFirst(AuthSourceClaims.ClaimType)?.Value)
            && !string.IsNullOrWhiteSpace(User.FindFirst("Campus")?.Value)
            && int.TryParse(User.FindFirst("FamilyDbId")?.Value, out dbId) && dbId > 0
            && int.TryParse(User.FindFirst("FamilyID")?.Value, out familyId) && familyId > 0;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken ct)
    {
        if (!FamilyIdentity(out var dbId, out var familyId)) return Forbid();
        if (!options.Value.Enabled) return StatusCode(503, ApiResponse<object>.FailureResponse("Notifications are not enabled yet."));
        try
        {
            await service.RegisterAsync(dbId, familyId, request.InstallationId, request.Token, ct);
            return Ok(ApiResponse<object>.SuccessResponse(new { registered = true }));
        }
        catch (ArgumentException ex) { return BadRequest(ApiResponse<object>.FailureResponse(ex.Message)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPost("unregister")]
    public async Task<IActionResult> Unregister(UnregisterRequest request, CancellationToken ct)
    {
        if (!FamilyIdentity(out var dbId, out _)) return Forbid();
        if (options.Value.Enabled) await service.UnregisterAsync(dbId, request.InstallationId, ct);
        return Ok(ApiResponse<object>.SuccessResponse(new { registered = false }));
    }
}
