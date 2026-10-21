using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.API.Services;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.API.Controllers;

[ApiController]
[Authorize]
[Route("api/reminders")]
public class RemindersController : ControllerBase
{
    private const string AssignPermission = "assign_user_reminders";

    private readonly IUserReminderService _service;
    private readonly ICampusChatSink _sink;
    private readonly TenantContext _tenantContext;
    private readonly AppDbContext _context;

    public RemindersController(
        IUserReminderService service,
        ICampusChatSink sink,
        TenantContext tenantContext,
        AppDbContext context)
    {
        _service = service;
        _sink = sink;
        _tenantContext = tenantContext;
        _context = context;
    }

    [HttpGet]
    public Task<IActionResult> List([FromQuery] string? kind, CancellationToken cancellationToken) =>
        Run(userId => _service.ListMineAsync(userId, kind, cancellationToken));

    [HttpGet("due")]
    public Task<IActionResult> Due(CancellationToken cancellationToken) =>
        Run(userId => _service.GetDueAsync(userId, cancellationToken));

    [HttpGet("assigned-by-me")]
    public Task<IActionResult> AssignedByMe(CancellationToken cancellationToken) =>
        Run(userId => _service.ListAssignedByMeAsync(userId, cancellationToken));

    [HttpGet("assignable-users")]
    public async Task<IActionResult> AssignableUsers(CancellationToken cancellationToken)
    {
        if (!CampusUserAccess.TryGetCampusUserId(User, out var userId))
            return Unauthorized();
        if (!await CampusUserAccess.HasPermissionAsync(_context, userId, AssignPermission, cancellationToken))
            return Forbid();

        var result = await _service.GetAssignableUsersAsync(userId, cancellationToken);
        return Ok(ApiResponse<List<ReminderUserOptionDto>>.SuccessResponse(result));
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] SaveUserReminderRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!CampusUserAccess.TryGetCampusUserId(User, out var userId))
            return Unauthorized();

        var canAssign = await CanAssignAsync(userId, request.OwnerUserId, cancellationToken);
        return await Mutate(
            () => _service.CreateAsync(userId, canAssign, request, cancellationToken),
            dto => dto.IsAssigned ? "reminder-assigned" : "reminder-updated");
    }

    [HttpPost("{id:int}/update")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] SaveUserReminderRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!CampusUserAccess.TryGetCampusUserId(User, out var userId))
            return Unauthorized();

        var canAssign = await CanAssignAsync(userId, request.OwnerUserId, cancellationToken);
        return await Mutate(() => _service.UpdateAsync(userId, canAssign, id, request, cancellationToken));
    }

    [HttpPost("{id:int}/delete")]
    public Task<IActionResult> Delete(int id, CancellationToken cancellationToken) =>
        MutateCurrent(userId => _service.DeleteAsync(userId, id, cancellationToken), _ => "reminder-deleted");

    [HttpPost("{id:int}/done")]
    public Task<IActionResult> Done(int id, CancellationToken cancellationToken) =>
        MutateCurrent(userId => _service.SetStatusAsync(userId, id, UserReminderStatuses.Done, cancellationToken));

    [HttpPost("{id:int}/reopen")]
    public Task<IActionResult> Reopen(int id, CancellationToken cancellationToken) =>
        MutateCurrent(userId => _service.SetStatusAsync(userId, id, UserReminderStatuses.Pending, cancellationToken));

    [HttpPost("{id:int}/dismiss")]
    public Task<IActionResult> Dismiss(int id, CancellationToken cancellationToken) =>
        MutateCurrent(userId => _service.SetStatusAsync(userId, id, UserReminderStatuses.Dismissed, cancellationToken));

    [HttpPost("{id:int}/snooze")]
    public Task<IActionResult> Snooze(
        int id,
        [FromBody] SnoozeUserReminderRequestDto request,
        CancellationToken cancellationToken) =>
        MutateCurrent(userId => _service.SnoozeAsync(userId, id, request.Minutes, cancellationToken));

    [HttpPost("{id:int}/pin")]
    public Task<IActionResult> TogglePin(int id, CancellationToken cancellationToken) =>
        MutateCurrent(userId => _service.TogglePinAsync(userId, id, cancellationToken));

    private async Task<bool> CanAssignAsync(int userId, int? ownerUserId, CancellationToken cancellationToken) =>
        ownerUserId is > 0
        && ownerUserId != userId
        && await CampusUserAccess.HasPermissionAsync(_context, userId, AssignPermission, cancellationToken);

    private async Task<IActionResult> Run<T>(Func<int, Task<T>> action)
    {
        if (!CampusUserAccess.TryGetCampusUserId(User, out var userId))
            return Unauthorized();

        try
        {
            return Ok(ApiResponse<T>.SuccessResponse(await action(userId)));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    private async Task<IActionResult> MutateCurrent(
        Func<int, Task<UserReminderDto>> action,
        Func<UserReminderDto, string>? eventType = null)
    {
        if (!CampusUserAccess.TryGetCampusUserId(User, out var userId))
            return Unauthorized();

        return await Mutate(() => action(userId), eventType);
    }

    private async Task<IActionResult> Mutate(
        Func<Task<UserReminderDto>> action,
        Func<UserReminderDto, string>? eventType = null)
    {
        try
        {
            var dto = await action();
            var type = eventType?.Invoke(dto) ?? "reminder-updated";
            object data = type == "reminder-deleted" ? new UserReminderDeletedEventDto { Id = dto.Id } : dto;

            foreach (var target in new[] { dto.OwnerUserId, dto.CreatedByUserId }.Distinct())
            {
                var targetType = type == "reminder-assigned" && target != dto.OwnerUserId ? "reminder-updated" : type;
                _sink.Publish(_tenantContext.Campus, target, new CampusChatEventDto { Type = targetType, Data = data });
            }

            return Ok(ApiResponse<UserReminderDto>.SuccessResponse(dto));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }
}
