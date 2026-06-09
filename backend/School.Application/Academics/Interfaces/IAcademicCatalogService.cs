using School.Application.Academics.DTOs;

namespace School.Application.Academics.Interfaces;

public interface IAcademicCatalogService
{
    Task<List<AcademicClassDto>> GetClassesAsync();
    Task<AcademicClassDto?> GetClassByIdAsync(int id);
    Task<AcademicClassDto> UpsertClassAsync(UpsertAcademicClassRequestDto request);
    Task<bool> DeleteClassAsync(int id);

    Task<List<AcademicSubjectDto>> GetSubjectsAsync();
    Task<AcademicSubjectDto?> GetSubjectByIdAsync(int id);
    Task<AcademicSubjectDto> UpsertSubjectAsync(UpsertAcademicSubjectRequestDto request);
    Task<bool> DeleteSubjectAsync(int id);

    Task<List<QuestionCatalogDto>> GetQuestionCatalogAsync(int? chapterId = null);
    Task<QuestionCatalogDto?> GetQuestionCatalogByIdAsync(int id);
    Task<QuestionCatalogDto> UpsertQuestionCatalogAsync(UpsertQuestionCatalogRequestDto request);
    Task<bool> DeleteQuestionCatalogAsync(int id);

    Task<List<ChapterDto>> GetChaptersAsync();
    Task<ChapterDto?> GetChapterByIdAsync(int id);
    Task<ChapterDto> UpsertChapterAsync(UpsertChapterRequestDto request);
    Task<bool> DeleteChapterAsync(int id);
}
