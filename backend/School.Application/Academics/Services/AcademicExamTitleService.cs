using School.Application.Academics.DTOs;
using School.Application.Academics.Interfaces;
using School.Infrastructure.Academics.Entities;
using School.Infrastructure.Academics.Repositories;

namespace School.Application.Academics.Services;

public class AcademicExamTitleService : IAcademicExamTitleService
{
    private readonly IExamTitleRepository _examTitleRepository;

    public AcademicExamTitleService(IExamTitleRepository examTitleRepository)
    {
        _examTitleRepository = examTitleRepository;
    }

    public async Task<List<ExamTitleDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var rows = await _examTitleRepository.GetAllOrderedAsync(cancellationToken);
        return rows.Select(MapToDto).ToList();
    }

    public async Task<ExamTitleDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var entity = await _examTitleRepository.GetByIdAsync(id, cancellationToken);
        return entity == null ? null : MapToDto(entity);
    }

    public async Task<ExamTitleDto> UpsertAsync(UpsertExamTitleRequestDto request, CancellationToken cancellationToken = default)
    {
        var title = request.Title.Trim();
        if (string.IsNullOrWhiteSpace(title))
        {
            throw new InvalidOperationException("Title is required.");
        }

        var examType = NormalizeNullable(request.ExamType);
        var id = request.Id.GetValueOrDefault();

        if (await _examTitleRepository.ExistsTitleAsync(title, id > 0 ? id : null, cancellationToken))
        {
            throw new InvalidOperationException("An exam title with this name already exists.");
        }

        ExamTitle entity;
        if (id > 0)
        {
            entity = await _examTitleRepository.GetTrackedByIdAsync(id, cancellationToken)
                ?? throw new InvalidOperationException("Exam title not found.");
            entity.Title = title;
            entity.ExamType = examType;
            await _examTitleRepository.UpdateAsync(entity, cancellationToken);
        }
        else
        {
            entity = new ExamTitle
            {
                Title = title,
                ExamType = examType
            };
            await _examTitleRepository.AddAsync(entity, cancellationToken);
        }

        var refreshed = await _examTitleRepository.GetByIdAsync(entity.Id, cancellationToken);
        return MapToDto(refreshed ?? entity);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var entity = await _examTitleRepository.GetTrackedByIdAsync(id, cancellationToken);
        if (entity == null)
        {
            return false;
        }

        if (await _examTitleRepository.IsReferencedByPaperAsync(id, cancellationToken))
        {
            throw new InvalidOperationException("Cannot delete this exam title because it is used by one or more question papers.");
        }

        await _examTitleRepository.DeleteAsync(entity, cancellationToken);
        return true;
    }

    private static ExamTitleDto MapToDto(ExamTitle entity)
    {
        return new ExamTitleDto
        {
            Id = entity.Id,
            Title = entity.Title,
            ExamType = entity.ExamType,
            CreatedOn = entity.CreatedOn
        };
    }

    private static string? NormalizeNullable(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }
}
