using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Services;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/student/fee-increment")]
public class StudentFeeIncrementController(StudentFeeIncrementService service, TenantContext tenant, IMemoryCache cache) : ControllerBase
{
    private sealed class PreviewState
    {
        public required StudentFeeIncrementRequestDto Request { get; init; }
        public required List<StudentFeeIncrementRowDto> Rows { get; init; }
        public SemaphoreSlim Gate { get; } = new(1, 1);
        public int? AppliedCount { get; set; }
        public bool Attempted { get; set; }
    }

    private int UserId => int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var id) ? id : 0;
    private async Task<bool> CanAccess(CancellationToken ct) =>
        UserId > 0 && User.FindFirst("App") == null && User.FindFirst("AuthSource") == null &&
        string.IsNullOrEmpty(User.FindFirst("FamilyID")?.Value) &&
        !string.IsNullOrEmpty(User.FindFirst("Campus")?.Value) && await service.CanAccessAsync(UserId, ct);
    private string CacheKey(string id) => $"fee-increment:{tenant.Campus}:{UserId}:{id}";

    [HttpGet("students")]
    public async Task<IActionResult> Students([FromQuery] int? classCompositeId, CancellationToken ct,
        [FromQuery] string scope = "class", [FromQuery] string registrationDateMode = "all",
        [FromQuery] DateOnly? registrationDate = null, [FromQuery] bool includeRegistrationDate = false)
    {
        if (!await CanAccess(ct)) return Forbid();
        if (scope is not ("class" or "school") || (scope == "class" && classCompositeId is not > 0) ||
            (scope == "school" && classCompositeId.HasValue))
            return BadRequest(ApiResponse<object>.FailureResponse("Choose a valid scope and class."));
        try
        {
            return Ok(ApiResponse<object>.SuccessResponse(await service.GetRowsAsync(classCompositeId, ct,
                registrationDateMode, registrationDate, includeRegistrationDate)));
        }
        catch (ArgumentException ex) { return BadRequest(ApiResponse<object>.FailureResponse(ex.Message)); }
    }

    [HttpPost("preview")]
    public async Task<IActionResult> Preview(StudentFeeIncrementRequestDto request, CancellationToken ct)
    {
        if (!await CanAccess(ct)) return Forbid();
        try
        {
            var rows = await service.PreviewAsync(request, ct);
            var canApply = rows.All(x => x.Error == null);
            var previewId = Guid.NewGuid().ToString("N");
            var expiresAt = DateTimeOffset.UtcNow.AddMinutes(15);
            if (canApply) cache.Set(CacheKey(previewId), new PreviewState { Request = request, Rows = rows }, expiresAt);
            return Ok(ApiResponse<object>.SuccessResponse(new { previewId = canApply ? previewId : null, expiresAt, campus = tenant.Campus, rows, canApply }));
        }
        catch (ArgumentException ex) { return BadRequest(ApiResponse<object>.FailureResponse(ex.Message)); }
        catch (InvalidOperationException ex) { return Conflict(ApiResponse<object>.FailureResponse(ex.Message)); }
    }

    [HttpPost("apply")]
    public async Task<IActionResult> Apply(StudentFeeIncrementApplyDto request, CancellationToken ct)
    {
        if (!await CanAccess(ct)) return Forbid();
        if (!cache.TryGetValue<PreviewState>(CacheKey(request.PreviewId), out var state) || state == null)
            return Conflict(ApiResponse<object>.FailureResponse("Preview expired or unavailable. Create a fresh preview."));
        await state.Gate.WaitAsync(ct);
        try
        {
            if (state.AppliedCount.HasValue)
                return Ok(ApiResponse<object>.SuccessResponse(new { updatedCount = state.AppliedCount.Value }, "Fee increment already applied."));
            // Consume before attempting the transaction: an uncertain commit must never be retried as a new increment.
            if (state.Attempted) return Conflict(ApiResponse<object>.FailureResponse("This preview has already been submitted. Reload fees and create a fresh preview."));
            state.Attempted = true;
            state.AppliedCount = await service.ApplyAsync(state.Request, state.Rows, UserId, request.PreviewId, ct);
            return Ok(ApiResponse<object>.SuccessResponse(new { updatedCount = state.AppliedCount.Value }, "Fee increment applied."));
        }
        catch (ArgumentException ex) { return BadRequest(ApiResponse<object>.FailureResponse(ex.Message)); }
        catch (InvalidOperationException ex) { return Conflict(ApiResponse<object>.FailureResponse(ex.Message)); }
        finally { state.Gate.Release(); }
    }
}
