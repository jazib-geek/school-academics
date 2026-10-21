using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IUserReminderService
{
    Task<List<UserReminderDto>> ListMineAsync(int userId, string? kind, CancellationToken cancellationToken = default);

    Task<List<UserReminderDto>> GetDueAsync(int userId, CancellationToken cancellationToken = default);

    Task<List<UserReminderDto>> ListAssignedByMeAsync(int userId, CancellationToken cancellationToken = default);

    Task<List<ReminderUserOptionDto>> GetAssignableUsersAsync(int userId, CancellationToken cancellationToken = default);

    Task<UserReminderDto> CreateAsync(
        int userId,
        bool canAssign,
        SaveUserReminderRequestDto request,
        CancellationToken cancellationToken = default);

    Task<UserReminderDto> UpdateAsync(
        int userId,
        bool canAssign,
        int id,
        SaveUserReminderRequestDto request,
        CancellationToken cancellationToken = default);

    Task<UserReminderDto> DeleteAsync(int userId, int id, CancellationToken cancellationToken = default);

    Task<UserReminderDto> SetStatusAsync(int userId, int id, string status, CancellationToken cancellationToken = default);

    Task<UserReminderDto> SnoozeAsync(int userId, int id, int minutes, CancellationToken cancellationToken = default);

    Task<UserReminderDto> TogglePinAsync(int userId, int id, CancellationToken cancellationToken = default);
}
