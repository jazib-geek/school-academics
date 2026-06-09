using School.Application.Academics.DTOs;

namespace School.Application.Academics.Interfaces;

public interface IAcademicExamMakerService
{
    Task<List<QuestionCatalogDto>> GetQuestionPoolAsync(
        int classId,
        int subjectId,
        List<int>? chapterIds = null,
        string? searchText = null,
        string? type = null,
        string? category = null,
        int take = 120);
    Task<List<QuestionChapterAvailabilityDto>> GetQuestionAvailabilityByChapterAsync(int classId, int subjectId);
    Task<ExamPaperDto> GeneratePaperAsync(GenerateExamPaperRequestDto request);
    Task<ExamPaperDto> CreatePaperFromSelectionAsync(CreateExamPaperFromSelectionRequestDto request);
    Task<ExamPaperDto> UpdatePaperFromSelectionAsync(int id, CreateExamPaperFromSelectionRequestDto request);
    Task<ExamPaperDto> RandomizePaperFromChaptersAsync(RandomizeExamPaperRequestDto request);
    Task<List<ExamPaperDto>> GetPapersAsync(int? classId = null, int? subjectId = null);
    Task<ExamPaperDto?> GetPaperByIdAsync(int id);
    Task<bool> DeletePaperAsync(int id);
}
