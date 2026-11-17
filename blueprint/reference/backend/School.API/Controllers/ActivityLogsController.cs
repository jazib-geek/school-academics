using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/campus/activity-logs")]
public class ActivityLogsController : ControllerBase
{
    private readonly IActivityLogService _activityLogService;

    public ActivityLogsController(IActivityLogService activityLogService)
    {
        _activityLogService = activityLogService;
    }

    [HttpGet]
    public async Task<IActionResult> GetActivityLogs(
        [FromQuery] ActivityLogFilterDto filter,
        CancellationToken cancellationToken)
    {
        var result = await _activityLogService.GetAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResultDto<ActivityLogDto>>.SuccessResponse(result));
    }

    [HttpGet("lookups")]
    public async Task<IActionResult> GetLookups(CancellationToken cancellationToken)
    {
        var result = await _activityLogService.GetLookupsAsync(cancellationToken);
        return Ok(ApiResponse<ActivityLogLookupDto>.SuccessResponse(result));
    }
}
