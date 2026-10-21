using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.API.Services;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/chat")]
public class ChatController : ControllerBase
{
    private static readonly TimeSpan HeartbeatInterval = TimeSpan.FromSeconds(25);

    private readonly IChatService _chatService;
    private readonly ICampusChatSink _sink;
    private readonly TenantContext _tenantContext;

    public ChatController(IChatService chatService, ICampusChatSink sink, TenantContext tenantContext)
    {
        _chatService = chatService;
        _sink = sink;
        _tenantContext = tenantContext;
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(CancellationToken cancellationToken)
    {
        if (!CampusUserAccess.TryGetCampusUserId(User, out var userId))
            return Unauthorized();

        var online = _sink.GetOnlineUserIds(_tenantContext.Campus);
        var result = await _chatService.GetUsersAsync(userId, online, cancellationToken);
        return Ok(ApiResponse<List<ChatUserDto>>.SuccessResponse(result));
    }

    [HttpGet("conversation/{otherUserId:int}")]
    public async Task<IActionResult> GetConversation(
        int otherUserId,
        [FromQuery] long? afterId,
        CancellationToken cancellationToken)
    {
        if (!CampusUserAccess.TryGetCampusUserId(User, out var userId))
            return Unauthorized();

        var result = await _chatService.GetConversationAsync(userId, otherUserId, afterId, cancellationToken);
        return Ok(ApiResponse<List<ChatMessageDto>>.SuccessResponse(result));
    }

    [HttpPost("send")]
    public async Task<IActionResult> Send(
        [FromBody] SendChatMessageRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!CampusUserAccess.TryGetCampusUserId(User, out var userId))
            return Unauthorized();

        try
        {
            var message = await _chatService.SendAsync(_tenantContext.Campus, userId, request, cancellationToken);
            var evt = new CampusChatEventDto { Type = "chat-message", Data = message };
            _sink.Publish(_tenantContext.Campus, message.RecipientUserId, evt);
            _sink.Publish(_tenantContext.Campus, userId, evt);
            return Ok(ApiResponse<ChatMessageDto>.SuccessResponse(message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("conversation/{otherUserId:int}/read")]
    public async Task<IActionResult> MarkRead(int otherUserId, CancellationToken cancellationToken)
    {
        if (!CampusUserAccess.TryGetCampusUserId(User, out var userId))
            return Unauthorized();

        var read = await _chatService.MarkReadAsync(userId, otherUserId, cancellationToken);
        if (read is not null)
        {
            _sink.Publish(_tenantContext.Campus, otherUserId, new CampusChatEventDto { Type = "chat-read", Data = read });
            _sink.Publish(_tenantContext.Campus, userId, new CampusChatEventDto
            {
                Type = "chat-read-self",
                Data = new { OtherUserId = otherUserId, read.UpToId },
            });
        }

        return Ok(ApiResponse<object>.SuccessResponse(new { success = true }));
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount(CancellationToken cancellationToken)
    {
        if (!CampusUserAccess.TryGetCampusUserId(User, out var userId))
            return Unauthorized();

        var count = await _chatService.GetUnreadCountAsync(userId, cancellationToken);
        return Ok(ApiResponse<int>.SuccessResponse(count));
    }

    [HttpGet("stream")]
    public async Task Stream(CancellationToken cancellationToken)
    {
        if (!CampusUserAccess.TryGetCampusUserId(User, out var userId))
        {
            Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";
        Response.Headers["X-Accel-Buffering"] = "no";
        Response.ContentType = "text/event-stream";

        var reader = _sink.Subscribe(_tenantContext.Campus, userId, cancellationToken);

        try
        {
            await Response.WriteAsync(": connected\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);

            Task<bool>? waitTask = null;
            while (!cancellationToken.IsCancellationRequested)
            {
                waitTask ??= reader.WaitToReadAsync(cancellationToken).AsTask();
                var finished = await Task.WhenAny(waitTask, Task.Delay(HeartbeatInterval, cancellationToken));
                if (finished != waitTask)
                {
                    await Response.WriteAsync(": ping\n\n", cancellationToken);
                    await Response.Body.FlushAsync(cancellationToken);
                    continue;
                }

                if (!await waitTask)
                    break;
                waitTask = null;

                while (reader.TryRead(out var evt))
                {
                    var payload = JsonSerializer.Serialize(evt.Data, JsonSerializerOptions.Web);
                    await Response.WriteAsync($"event: {evt.Type}\n", cancellationToken);
                    await Response.WriteAsync($"data: {payload}\n\n", cancellationToken);
                }

                await Response.Body.FlushAsync(cancellationToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Client disconnected.
        }
    }
}
