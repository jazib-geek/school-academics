using Microsoft.EntityFrameworkCore;
using School.Application.Academics.DTOs;
using School.Application.Academics.Interfaces;
using School.Application.Interfaces;
using School.Infrastructure.Academics.Data;
using School.Infrastructure.Academics.Repositories;

namespace School.Application.Academics.Services;

public class AcademicAuthService : IAcademicAuthService
{
    private readonly AcademicContext _academicContext;
    private readonly ITokenService _tokenService;
    private readonly IInstituteSettingsRepository _instituteSettingsRepository;

    public AcademicAuthService(
        AcademicContext academicContext,
        ITokenService tokenService,
        IInstituteSettingsRepository instituteSettingsRepository)
    {
        _academicContext = academicContext;
        _tokenService = tokenService;
        _instituteSettingsRepository = instituteSettingsRepository;
    }

    public async Task<AcademicLoginResponseDto?> LoginAsync(AcademicLoginRequestDto request)
    {
        var userName = request.UserName?.Trim();
        if (string.IsNullOrWhiteSpace(userName) || string.IsNullOrWhiteSpace(request.Password))
        {
            return null;
        }

        var user = await _academicContext.AcademicUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserName == userName && x.Password == request.Password);

        if (user == null)
        {
            return null;
        }

        var instituteRow = await _instituteSettingsRepository.GetFirstAsync();
        InstituteSettingsDto? instituteSettings = instituteRow == null
            ? null
            : AcademicInstituteSettingsService.MapToDto(instituteRow);

        return new AcademicLoginResponseDto
        {
            Id = user.Id,
            UserName = user.UserName,
            Token = _tokenService.GenerateAcademicToken(user.Id, user.UserName),
            InstituteSettings = instituteSettings,
        };
    }
}
