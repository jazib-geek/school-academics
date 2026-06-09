using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IStudentService
{
    Task<PagedResultDto<StudentListItemDto>> GetStudentsAsync(StudentListFilterDto filter);

    Task<IReadOnlyList<StudentFamilyMemberDto>> GetFamilyMembersAsync(int familyId);
}
