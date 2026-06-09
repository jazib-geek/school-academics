using Microsoft.EntityFrameworkCore;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.Application.Services;

public class StudentService : IStudentService
{
    private readonly AppDbContext _context;

    public StudentService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResultDto<StudentListItemDto>> GetStudentsAsync(StudentListFilterDto filter)
    {
        var pageNumber = filter.PageNumber < 1 ? 1 : filter.PageNumber;
        var pageSize = filter.PageSize switch
        {
            < 1 => 10,
            > 100 => 100,
            _ => filter.PageSize
        };

        var query = _context.Students
            .AsNoTracking()
            .Include(x => x.Section)
            .Include(x => x.Family)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            var lower = term.ToLower();
            query = query.Where(x =>
                (x.FullName != null && x.FullName.ToLower().Contains(lower)) ||
                x.Reg_Id.ToString().Contains(term));
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(filter.Name))
            {
                var nameFilter = filter.Name.Trim().ToLower();
                query = query.Where(x => x.FullName != null && x.FullName.ToLower().Contains(nameFilter));
            }

            if (filter.Reg_Id.HasValue)
            {
                query = query.Where(x => x.Reg_Id == filter.Reg_Id.Value);
            }
        }

        if (!string.IsNullOrWhiteSpace(filter.Class))
        {
            var classFilter = filter.Class.Trim().ToLower();
            query = query.Where(x => x.Section != null &&
                                     x.Section.ClassName != null &&
                                     x.Section.ClassName.ToLower().Contains(classFilter));
        }

        // Performance default: return only active students unless explicitly requested.
        var isActiveFilter = filter.IsActive ?? true;
        query = query.Where(x => x.IsActive == isActiveFilter);

        if (!string.IsNullOrWhiteSpace(filter.Gender))
        {
            var genderFilter = filter.Gender.Trim().ToLower();
            query = query.Where(x => x.Gender != null && x.Gender.ToLower() == genderFilter);
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderBy(x => x.Reg_Id)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new StudentListItemDto
            {
                Reg_Id = x.Reg_Id,
                FullName = x.FullName,
                ClassName = x.Section != null ? x.Section.ClassName : null,
                FamilyID = x.Family != null ? x.Family.FamilyID : null,
                FatherName = x.Family != null ? x.Family.FatherName : null,
                MotherName = x.Family != null ? x.Family.MotherName : null,
                FatherContact = x.Family != null ? x.Family.FatherMobileNo : null,
                Gender = x.Gender,
                IsActive = x.IsActive,
                RegDate = x.RegDate
            })
            .ToListAsync();

        var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResultDto<StudentListItemDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalPages = totalPages
        };
    }

    public async Task<IReadOnlyList<StudentFamilyMemberDto>> GetFamilyMembersAsync(int familyId)
    {
        return await _context.Students
            .AsNoTracking()
            .Include(x => x.Section)
            .Include(x => x.Family)
            .Where(x => x.Family != null && x.Family.FamilyID == familyId)
            .OrderBy(x => x.Reg_Id)
            .Select(x => new StudentFamilyMemberDto
            {
                Reg_Id = x.Reg_Id,
                StudentName = x.FullName,
                ClassName = x.Section != null ? x.Section.ClassName : null,
                FatherName = x.Family != null ? x.Family.FatherName : null,
                FatherContact = x.Family != null ? x.Family.FatherMobileNo : null,
                RegDate = x.RegDate != null ? x.RegDate : null
            })
            .ToListAsync();
    }
}
