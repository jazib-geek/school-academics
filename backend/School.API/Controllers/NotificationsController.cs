using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.Interfaces;
using System.Text.Json;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly ICampusNotificationSink _notificationSink;
    private readonly ICampusNotificationService _notificationService;
    private readonly TenantContext _tenantContext;

    public NotificationsController(
        ICampusNotificationSink notificationSink,
        ICampusNotificationService notificationService,
        TenantContext tenantContext)
    {
        _notificationSink = notificationSink;
        _notificationService = notificationService;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetRecent(CancellationToken cancellationToken)
    {
        if (!TryGetCampusUserId(out var userId))
        {
            return Unauthorized();
        }

        var items = await _notificationService.GetRecentForUserAsync(userId, cancellationToken: cancellationToken);
        return Ok(items);
    }

    [HttpPost("mark-read")]
    public async Task<IActionResult> MarkAllRead(CancellationToken cancellationToken)
    {
        if (!TryGetCampusUserId(out var userId))
        {
            return Unauthorized();
        }

        await _notificationService.MarkAllReadAsync(userId, cancellationToken);
        return Ok(new { success = true });
    }

    [HttpGet("stream")]
    public async Task StreamNotifications(CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";
        Response.ContentType = "text/event-stream";

        var reader = _notificationSink.Subscribe(_tenantContext.Campus, cancellationToken);
        await Response.WriteAsync(": connected\n\n", cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);

        await foreach (var notification in reader.ReadAllAsync(cancellationToken))
        {
            var payload = JsonSerializer.Serialize(notification, JsonSerializerOptions.Web);
            await Response.WriteAsync("event: notification\n", cancellationToken);
            await Response.WriteAsync($"data: {payload}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
    }

    private bool TryGetCampusUserId(out int userId)
    {
        userId = 0;
        return int.TryParse(User.FindFirst("FamilyDbId")?.Value, out userId) && userId > 0;
    }
}
