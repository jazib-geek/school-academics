using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IExamService
{
    Task<IReadOnlyList<ExamTypeListItemDto>> GetExamTypesAsync();

    Task<StudentResultDto?> GetStudentResultAsync(
        int studentId,
        int examTypeId,
        ExamAggregationOptions? options = null);

    Task<ExamMarkSheetDto?> GetExamMarkSheetAsync(
        int sectionId,
        int examTypeId,
        ExamAggregationOptions? options = null,
        string sortBy = "position");
}
