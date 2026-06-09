using School.Application.Academics.DTOs;

namespace School.Application.Academics.Interfaces;

public interface IAcademicAuthService
{
    Task<AcademicLoginResponseDto?> LoginAsync(AcademicLoginRequestDto request);
}
