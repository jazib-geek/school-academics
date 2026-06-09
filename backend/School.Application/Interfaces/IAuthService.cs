using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IAuthService
{
    Task<LoginResponseDto?> LoginAsync(LoginRequestDto request);
    Task<CampusLoginResponseDto?> CampusLoginAsync(CampusLoginRequestDto request);
}
