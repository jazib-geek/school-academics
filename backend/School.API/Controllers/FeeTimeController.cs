using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Services;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/fee-time")]
public class FeeTimeController(FeeTimeService service) : ControllerBase
{
    private int UserId => int.TryParse(User.FindFirst("FamilyDbId")?.Value, out var id) ? id : 0;
    private async Task<bool> CanAccess(CancellationToken ct) =>
        UserId > 0 && User.FindFirst("App") == null && User.FindFirst("AuthSource") == null &&
        string.IsNullOrEmpty(User.FindFirst("FamilyID")?.Value) &&
        !string.IsNullOrEmpty(User.FindFirst("Campus")?.Value) && await service.CanAccessAsync(UserId, ct);

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        if (!await CanAccess(ct)) return Forbid();
        return Ok(ApiResponse<object>.SuccessResponse(await service.ListAsync(ct)));
    }

    [HttpGet("students/search")]
    public async Task<IActionResult> Search([FromQuery] string? term, CancellationToken ct, [FromQuery] string mode = "reg")
    {
        if (!await CanAccess(ct)) return Forbid();
        if (mode is not ("reg" or "name"))
            return BadRequest(ApiResponse<object>.FailureResponse("Choose registration number or name search."));
        var value = term?.Trim() ?? "";
        if (value.Length > 150)
            return BadRequest(ApiResponse<object>.FailureResponse("Search must be 150 characters or fewer."));
        return Ok(ApiResponse<object>.SuccessResponse(await service.SearchAsync(value, mode, ct)));
    }

    [HttpGet("students/{regId:int:min(1)}")]
    public async Task<IActionResult> Student(int regId, CancellationToken ct)
    {
        if (!await CanAccess(ct)) return Forbid();
        var row = await service.GetAsync(regId, ct);
        return row == null
            ? NotFound(ApiResponse<object>.FailureResponse("Student not found."))
            : Ok(ApiResponse<object>.SuccessResponse(row));
    }

    [HttpPut("students/{regId:int:min(1)}")]
    public async Task<IActionResult> Save(int regId, FeeTimeSaveDto request, CancellationToken ct)
    {
        if (!await CanAccess(ct)) return Forbid();
        var value = request.FeeTime.Trim();
        if (value.Length == 0)
            return BadRequest(ApiResponse<object>.FailureResponse("Enter a fee time. Use Remove to clear an existing fee time."));
        var row = await service.SetAsync(regId, value, UserId, ct);
        return row == null
            ? NotFound(ApiResponse<object>.FailureResponse("Student not found."))
            : Ok(ApiResponse<object>.SuccessResponse(row, "Fee time saved."));
    }

    [HttpDelete("students/{regId:int:min(1)}")]
    public async Task<IActionResult> Remove(int regId, CancellationToken ct)
    {
        if (!await CanAccess(ct)) return Forbid();
        var row = await service.SetAsync(regId, null, UserId, ct);
        return row == null
            ? NotFound(ApiResponse<object>.FailureResponse("Student not found."))
            : Ok(ApiResponse<object>.SuccessResponse(row, "Fee time removed."));
    }
}
