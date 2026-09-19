using School.Application.Academics.DTOs;
using School.Application.DTOs;

namespace School.Application.Academics.Interfaces;

public interface IAcademicUserService
{
    Task<IReadOnlyList<PermissionGroupDto>> GetPermissionCatalogAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AcademicUserListItemDto>> GetUsersAsync(CancellationToken cancellationToken = default);
    Task<AcademicUserDto> GetUserAsync(int id, CancellationToken cancellationToken = default);
    Task<AcademicUserDto> CreateUserAsync(AcademicUserUpsertDto request, CancellationToken cancellationToken = default);
    Task<AcademicUserDto> UpdateUserAsync(int id, AcademicUserUpsertDto request, CancellationToken cancellationToken = default);
    Task SetUserStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default);
    Task ForceChangePasswordAsync(int id, ForceChangeAcademicPasswordDto request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<string>> GetGrantedPermissionCodesAsync(int userId, CancellationToken cancellationToken = default);
}
