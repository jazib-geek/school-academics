using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface ISubjectService
{
    Task<List<SubjectLookupDto>> GetSubjectsAsync();
}
