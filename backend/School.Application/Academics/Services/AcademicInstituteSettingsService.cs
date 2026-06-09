using School.Application.Academics.DTOs;
using School.Application.Academics.Interfaces;
using School.Infrastructure.Academics.Entities;
using School.Infrastructure.Academics.Repositories;

namespace School.Application.Academics.Services;

public class AcademicInstituteSettingsService : IAcademicInstituteSettingsService
{
    private readonly IInstituteSettingsRepository _repository;

    public AcademicInstituteSettingsService(IInstituteSettingsRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<InstituteSettingsDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var rows = await _repository.GetAllOrderedAsync(cancellationToken);
        return rows.Select(MapToDto).ToList();
    }

    public async Task<InstituteSettingsDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        return entity == null ? null : MapToDto(entity);
    }

    public async Task<InstituteSettingsDto> UpsertAsync(UpsertInstituteSettingsRequestDto request, CancellationToken cancellationToken = default)
    {
        var id = request.Id.GetValueOrDefault();

        InstituteSetting entity;
        if (id > 0)
        {
            entity = await _repository.GetTrackedByIdAsync(id, cancellationToken)
                ?? throw new InvalidOperationException("Institute settings not found.");
            entity.InstituteName = NormalizeNullable(request.InstituteName);
            entity.InstituteAddress = NormalizeNullable(request.InstituteAddress);
            entity.InstituteContact = NormalizeNullable(request.InstituteContact);
            entity.InstituteEmail = NormalizeNullable(request.InstituteEmail);
            entity.InstituteLogo = request.InstituteLogo;
            await _repository.UpdateAsync(entity, cancellationToken);
        }
        else
        {
            entity = new InstituteSetting
            {
                InstituteName = NormalizeNullable(request.InstituteName),
                InstituteAddress = NormalizeNullable(request.InstituteAddress),
                InstituteContact = NormalizeNullable(request.InstituteContact),
                InstituteEmail = NormalizeNullable(request.InstituteEmail),
                InstituteLogo = request.InstituteLogo,
            };
            await _repository.AddAsync(entity, cancellationToken);
        }

        var refreshed = await _repository.GetByIdAsync(entity.Id, cancellationToken);
        return MapToDto(refreshed ?? entity);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetTrackedByIdAsync(id, cancellationToken);
        if (entity == null)
        {
            return false;
        }

        await _repository.DeleteAsync(entity, cancellationToken);
        return true;
    }

    public static InstituteSettingsDto MapToDto(InstituteSetting entity)
    {
        return new InstituteSettingsDto
        {
            Id = entity.Id,
            InstituteName = entity.InstituteName,
            InstituteAddress = entity.InstituteAddress,
            InstituteContact = entity.InstituteContact,
            InstituteEmail = entity.InstituteEmail,
            InstituteLogo = entity.InstituteLogo,
        };
    }

    private static string? NormalizeNullable(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }
}
