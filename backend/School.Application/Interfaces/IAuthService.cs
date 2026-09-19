using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IAuthService
{
    Task<LoginResponseDto?> LoginAsync(LoginRequestDto request);
    Task<CampusLoginResponseDto?> CampusLoginAsync(CampusLoginRequestDto request);
    Task<CampusLoginResponseDto> SwitchCampusAsync(int userId, SwitchCampusRequestDto request, CancellationToken cancellationToken = default);
    Task<CampusLoginResponseDto> LoginAsAsync(int actorUserId, LoginAsCampusUserRequestDto request, CancellationToken cancellationToken = default);
    Task ChangeCampusPasswordAsync(int userId, ChangeCampusPasswordDto request, CancellationToken cancellationToken = default);
}
