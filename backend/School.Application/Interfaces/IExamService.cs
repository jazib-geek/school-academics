using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IExamService
{
    Task<IReadOnlyList<ExamTypeListItemDto>> GetExamTypesAsync();

    Task<ExamEntryMatrixDto?> LoadExamEntryMatrixAsync(
        int sectionId,
        int examTypeId);

    Task<ExamEntryMatrixDto?> AddMissingExamEntryStudentsAsync(
        int sectionId,
        int examTypeId);

    Task<ExamEntryCellDto?> UpdateExamEntryCellAsync(
        int examId,
        int? obtainedMarks);

    Task<ExamEntryMatrixDto?> UpdateExamEntrySubjectMarksAsync(
        UpdateExamEntrySubjectMarksRequestDto request);

    Task<ExamEntryMatrixDto?> UpdateExamEntryAttendanceAsync(
        UpdateExamEntryAttendanceRequestDto request);

    Task<IReadOnlyList<ExamEntrySubjectOptionDto>> GetAvailableExamEntrySubjectsAsync(
        int sectionId,
        int examTypeId);

    Task<ExamEntryMatrixDto?> AddExamEntrySubjectAsync(
        AddExamEntrySubjectRequestDto request);

    Task<ExamEntryMatrixDto?> DeleteExamEntrySubjectAsync(
        int sectionId,
        int examTypeId,
        int subjectId);

    Task<ExamSubjectComponentEntryDto?> LoadSubjectComponentEntryAsync(
        int sectionId,
        int examTypeId,
        int subjectId);

    Task<ExamSubjectComponentEntryDto?> AddSubjectComponentHeaderAsync(
        AddExamSubjectComponentHeaderRequestDto request);

    Task<ExamSubjectComponentEntryDto?> DeleteSubjectComponentHeaderAsync(
        int sectionId,
        int examTypeId,
        int subjectId,
        int headerId);

    Task<ExamSubjectComponentEntryDto?> SaveSubjectComponentMarksAsync(
        SaveExamSubjectComponentMarksRequestDto request);

    Task<StudentResultDto?> GetStudentResultAsync(
        int studentId,
        int examTypeId,
        ExamAggregationOptions? options = null);

    Task<IReadOnlyList<StudentResultDto>> GetStudentResultsForClassAsync(
        int sectionId,
        int examTypeId,
        ExamAggregationOptions? options = null);

    Task<AcademicProgressCardDto?> GetAcademicProgressCardAsync(
        int studentId,
        ExamAggregationOptions? options = null);

    Task<IReadOnlyList<AcademicProgressCardDto>> GetAcademicProgressCardsForClassAsync(
        int sectionId,
        ExamAggregationOptions? options = null);

    Task<ExamTopPositionsDto?> GetTopPositionsAsync(
        int examTypeId,
        int n,
        ExamAggregationOptions? options = null);

    Task<ExamAwardListRosterDto?> GetAwardListRosterAsync(
        int sectionId,
        int? examTypeId = null);

    Task<IReadOnlyList<ExamAwardListSubjectColumnDto>> GetClassAwardListSubjectsAsync(int sectionId);

    Task<ExamMarkSheetDto?> GetExamMarkSheetAsync(
        int sectionId,
        int examTypeId,
        ExamAggregationOptions? options = null,
        string sortBy = "position");

    Task<ExamTeacherAnalysisDto?> GetTeacherExamAnalysisAsync(
        int sectionId,
        int employeeId,
        int examTypeId,
        ExamAggregationOptions? options = null);

    Task<ExamTeacherPerformanceGridDto?> GetTeacherPerformanceGridAsync(
        int employeeId,
        ExamAggregationOptions? options = null);
}
