using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface ICampusUserService
{
    Task<IReadOnlyList<PermissionGroupDto>> GetPermissionCatalogAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CampusUserListItemDto>> GetUsersAsync(CancellationToken cancellationToken = default);
    Task<CampusUserDto> GetUserAsync(int id, CancellationToken cancellationToken = default);
    Task<CampusUserDto> CreateUserAsync(CampusUserUpsertDto request, int actorUserId, CancellationToken cancellationToken = default);
    Task<CampusUserDto> UpdateUserAsync(int id, CampusUserUpsertDto request, int actorUserId, CancellationToken cancellationToken = default);
    Task SetUserStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default);
    Task ForceChangePasswordAsync(int id, ForceChangeCampusPasswordDto request, CancellationToken cancellationToken = default);
}
