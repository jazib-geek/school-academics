using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/employee/notifications")]
public class EmployeeNotificationsController : ControllerBase
{
    private readonly IEmployeeNotificationSink _sink;
    private readonly IEmployeeNotificationService _notificationService;
    private readonly TenantContext _tenantContext;

    public EmployeeNotificationsController(
        IEmployeeNotificationSink sink,
        IEmployeeNotificationService notificationService,
        TenantContext tenantContext)
    {
        _sink = sink;
        _notificationService = notificationService;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetRecent(CancellationToken cancellationToken)
    {
        if (!TryGetEmployeeId(out var employeeId))
        {
            return Unauthorized();
        }

        var items = await _notificationService.GetRecentForEmployeeAsync(employeeId, cancellationToken: cancellationToken);
        return Ok(items);
    }

    [HttpPost("mark-read")]
    public async Task<IActionResult> MarkAllRead(CancellationToken cancellationToken)
    {
        if (!TryGetEmployeeId(out var employeeId))
        {
            return Unauthorized();
        }

        await _notificationService.MarkAllReadAsync(employeeId, cancellationToken);
        return Ok(new { success = true });
    }

    [HttpGet("stream")]
    public async Task StreamNotifications(CancellationToken cancellationToken)
    {
        if (!TryGetEmployeeId(out var employeeId))
        {
            Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";
        Response.ContentType = "text/event-stream";

        var reader = _sink.Subscribe(_tenantContext.Campus, employeeId, cancellationToken);
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

    private bool TryGetEmployeeId(out int employeeId)
    {
        employeeId = 0;
        if (!string.Equals(
                User.FindFirst(AuthSourceClaims.ClaimType)?.Value,
                AuthSourceClaims.Employee,
                StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return int.TryParse(User.FindFirst("FamilyDbId")?.Value, out employeeId) && employeeId > 0;
    }
}
