using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class EmployeeService : IEmployeeService
{
    private readonly AppDbContext _context;

    public EmployeeService(AppDbContext context) => _context = context;

    public async Task<PagedResultDto<EmployeeListItemDto>> GetEmployeesAsync(
        EmployeeListFilterDto filter,
        CancellationToken cancellationToken = default)
    {
        var pageNumber = Math.Max(filter.PageNumber, 1);
        var pageSize = Math.Clamp(filter.PageSize, 1, 100);
        var query = _context.Employees.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            query = query.Where(x =>
                (x.EmployeeName != null && x.EmployeeName.Contains(term)) ||
                (x.Contact1 != null && x.Contact1.Contains(term)) ||
                (x.Thumb_ID != null && x.Thumb_ID.Contains(term)) ||
                x.ID.ToString().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(filter.Gender))
            query = query.Where(x => x.Gender == filter.Gender.Trim());
        if (filter.DesignationId.HasValue)
            query = query.Where(x => x.DesignationID == filter.DesignationId);
        if (filter.IsActive.HasValue)
            query = query.Where(x => x.IsActive == filter.IsActive);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(x => x.EmployeeName)
            .ThenBy(x => x.ID)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new EmployeeListItemDto
            {
                ID = x.ID,
                EmployeeName = x.EmployeeName ?? string.Empty,
                FatherName = x.FatherName,
                Thumb_ID = x.Thumb_ID,
                Gender = x.Gender,
                Contact1 = x.Contact1,
                Salary = x.Salary,
                Joining_Date = x.Joining_Date,
                DesignationID = x.DesignationID,
                DesignationName = x.Designation != null ? x.Designation.DesignationName : null,
                IsActive = x.IsActive != false,
            })
            .ToListAsync(cancellationToken);

        return new PagedResultDto<EmployeeListItemDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize),
        };
    }

    public async Task<EmployeeDetailDto> GetEmployeeAsync(int id, CancellationToken cancellationToken = default)
    {
        var employee = await AggregateQuery()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Employee not found.");
        return MapDetail(employee);
    }

    public async Task<EmployeeLookupDataDto> GetLookupDataAsync(CancellationToken cancellationToken = default)
    {
        var designations = await _context.Designations.AsNoTracking()
            .Where(x => x.IsActive != false && x.DesignationName != null)
            .OrderBy(x => x.DesignationName)
            .Select(x => new EmployeeLookupItemDto { ID = x.ID, Name = x.DesignationName! })
            .ToListAsync(cancellationToken);
        var localities = await _context.Localities.AsNoTracking()
            .Where(x => x.IsActive != false && x.Town != null)
            .OrderBy(x => x.Town)
            .Select(x => new EmployeeLookupItemDto { ID = x.ID, Name = x.Town! })
            .ToListAsync(cancellationToken);
        return new EmployeeLookupDataDto { Designations = designations, Localities = localities };
    }

    public async Task<EmployeeDetailDto> CreateEmployeeAsync(
        EmployeeUpsertDto request,
        CancellationToken cancellationToken = default)
    {
        await ValidateRequestAsync(request, null, cancellationToken);
        var employee = new Employee();
        ApplyEmployee(request, employee);
        ApplyChildren(request, employee);
        _context.Employees.Add(employee);

        // The parent and all child rows are persisted atomically through one SaveChanges call.
        await _context.SaveChangesAsync(cancellationToken);
        return await GetEmployeeAsync(employee.ID, cancellationToken);
    }

    public async Task<EmployeeDetailDto> UpdateEmployeeAsync(
        int id,
        EmployeeUpsertDto request,
        CancellationToken cancellationToken = default)
    {
        var employee = await AggregateQuery()
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Employee not found.");
        await ValidateRequestAsync(request, id, cancellationToken);

        ApplyEmployee(request, employee);
        _context.EmployeeQualifications.RemoveRange(employee.Qualifications);
        _context.EmployeeExperiences.RemoveRange(employee.Experiences);
        _context.EmployeeAssets.RemoveRange(employee.Assets);
        employee.Qualifications.Clear();
        employee.Experiences.Clear();
        employee.Assets.Clear();
        ApplyChildren(request, employee);

        await _context.SaveChangesAsync(cancellationToken);
        return await GetEmployeeAsync(id, cancellationToken);
    }

    public async Task SetEmployeeStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Employee not found.");

        employee.IsActive = isActive;
        employee.Leaving_Date = isActive
            ? null
            : PakistanTime.Today.ToDateTime(TimeOnly.MinValue);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<EmployeeByThumbDto> GetEmployeeByThumbIdAsync(
        string thumbId,
        CancellationToken cancellationToken = default)
    {
        var code = thumbId.Trim();
        if (code.Length == 0)
            throw new ArgumentException("Employee code is required.");

        var employee = await _context.Employees.AsNoTracking()
            .Include(x => x.Designation)
            .FirstOrDefaultAsync(x => x.Thumb_ID == code, cancellationToken)
            ?? throw new KeyNotFoundException($"Employee with code '{code}' was not found.");

        return new EmployeeByThumbDto
        {
            ID = employee.ID,
            Thumb_ID = employee.Thumb_ID ?? code,
            EmployeeName = employee.EmployeeName ?? string.Empty,
            DesignationName = employee.Designation?.DesignationName,
            IsFingerprintEnrolled = !string.IsNullOrWhiteSpace(employee.FingerprintTemplate),
            MustCheckinTime = DesignationTimeHelper.FormatTime(employee.Designation?.MustCheckinTime),
            LeavingTime = DesignationTimeHelper.FormatTime(employee.Designation?.LeavingTime),
        };
    }

    public async Task<IReadOnlyList<BiometricTemplateDto>> GetEnrolledFingerprintTemplatesAsync(
        CancellationToken cancellationToken = default)
    {
        return await _context.Employees.AsNoTracking()
            .Where(x => x.IsActive == true &&
                        x.Thumb_ID != null && x.Thumb_ID != "" &&
                        x.FingerprintTemplate != null && x.FingerprintTemplate != "")
            .OrderBy(x => x.EmployeeName)
            .Select(x => new BiometricTemplateDto
            {
                EmployeeCode = x.Thumb_ID!,
                EmployeeName = x.EmployeeName ?? string.Empty,
                Template = x.FingerprintTemplate!,
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<BiometricEnrollResponseDto> EnrollFingerprintAsync(
        BiometricEnrollRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var code = request.EmployeeCode.Trim();
        if (code.Length == 0)
            throw new ArgumentException("Employee code is required.");
        if (string.IsNullOrWhiteSpace(request.Template))
            throw new ArgumentException("Fingerprint template is required.");

        var employee = await _context.Employees
            .FirstOrDefaultAsync(x => x.Thumb_ID == code, cancellationToken)
            ?? throw new KeyNotFoundException($"Employee with code '{code}' was not found.");

        var enrolledAt = PakistanTime.Now;
        employee.FingerprintTemplate = request.Template.Trim();
        employee.FingerprintEnrolledAt = enrolledAt;
        await _context.SaveChangesAsync(cancellationToken);

        return new BiometricEnrollResponseDto
        {
            EmployeeId = employee.ID,
            EmployeeCode = employee.Thumb_ID ?? code,
            EmployeeName = employee.EmployeeName ?? string.Empty,
            EnrolledAt = enrolledAt,
        };
    }

    private IQueryable<Employee> AggregateQuery() => _context.Employees
        .Include(x => x.Designation)
        .Include(x => x.Locality)
        .Include(x => x.Qualifications)
        .Include(x => x.Experiences)
        .Include(x => x.Assets);

    private async Task ValidateRequestAsync(EmployeeUpsertDto request, int? employeeId, CancellationToken token)
    {
        request.EmployeeName = request.EmployeeName.Trim();
        request.Contact1 = request.Contact1.Trim();
        request.Password = request.Password.Trim();
        request.Thumb_ID = Clean(request.Thumb_ID);

        if (request.EmployeeName.Length == 0) throw new ArgumentException("Employee name is required.");
        if (request.Contact1.Length == 0) throw new ArgumentException("Contact 1 is required.");
        if (request.Salary is null) throw new ArgumentException("Salary is required.");
        if (request.DesignationID is null or <= 0) throw new ArgumentException("Designation is required.");
        if (request.Password.Length < 6) throw new ArgumentException("Password must be at least 6 characters.");
        if (!string.IsNullOrWhiteSpace(request.Email) &&
            !new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(request.Email.Trim()))
            throw new ArgumentException("Email address is not valid.");
        if (request.Leaving_Date.HasValue && request.Joining_Date.HasValue && request.Leaving_Date < request.Joining_Date)
            throw new ArgumentException("Leaving date cannot be before joining date.");
        if (request.Experiences.Any(x => x.FromDate.HasValue && x.ToDate.HasValue && x.ToDate < x.FromDate))
            throw new ArgumentException("Experience end date cannot be before its start date.");

        if (!await _context.Designations.AsNoTracking().AnyAsync(x => x.ID == request.DesignationID, token))
            throw new ArgumentException("Selected designation was not found.");
        if (request.LocalityID.HasValue &&
            !await _context.Localities.AsNoTracking().AnyAsync(x => x.ID == request.LocalityID, token))
            throw new ArgumentException("Selected locality was not found.");
        if (request.Thumb_ID is not null &&
            await _context.Employees.AsNoTracking()
                .AnyAsync(x => x.Thumb_ID == request.Thumb_ID && x.ID != employeeId, token))
            throw new InvalidOperationException("Biometric device ID is already assigned to another employee.");
    }

    private static void ApplyEmployee(EmployeeUpsertDto s, Employee t)
    {
        t.Thumb_ID = Clean(s.Thumb_ID);
        t.EmployeeName = s.EmployeeName.Trim();
        t.FatherName = Clean(s.FatherName);
        t.DoB = s.DoB;
        t.Gender = Clean(s.Gender);
        t.Religion = Clean(s.Religion);
        t.IsMarried = s.IsMarried ?? false;
        t.Blood_Group = Clean(s.Blood_Group);
        t.Permanent_Address = Clean(s.Permanent_Address);
        t.HomePhone = Clean(s.HomePhone);
        t.Contact1 = s.Contact1.Trim();
        t.Contact2 = Clean(s.Contact2);
        t.Contact3 = Clean(s.Contact3);
        t.Email = Clean(s.Email);
        t.CNIC = Clean(s.CNIC);
        t.IdentityMark = Clean(s.IdentityMark);
        t.Refered_By = Clean(s.Refered_By);
        t.LocalityID = s.LocalityID;
        t.Joining_Date = s.Joining_Date;
        t.Salary = s.Salary;
        t.ProfessionalDegree = Clean(s.ProfessionalDegree);
        t.IsTrained = s.IsTrained ?? false;
        t.VerifiedBy = Clean(s.VerifiedBy);
        t.ApprovedBy = Clean(s.ApprovedBy);
        t.Leaving_Date = s.Leaving_Date;
        t.IsActive = s.IsActive ?? true;
        t.BranchID = null;
        t.DesignationID = s.DesignationID;
        t.MaritalStatus = Clean(s.MaritalStatus);
        t.Password = s.Password.Trim();
        t.CanMarkStudentAttendance = s.CanMarkStudentAttendance;
        t.CanViewStudentAttendance = s.CanViewStudentAttendance;
        t.CanViewSubjectAllocation = s.CanViewSubjectAllocation;
        t.CanEditSubjectAllocation = s.CanEditSubjectAllocation;
        t.CanViewTimetable = s.CanViewTimetable;
        t.CanEditTimetable = s.CanEditTimetable;
        t.CanViewDatesheet = s.CanViewDatesheet;
        t.CanEditDatesheet = s.CanEditDatesheet;
        t.CanViewDiary = s.CanViewDiary;
        t.CanEditDiary = s.CanEditDiary;
        t.CanAccessLessonPlan = s.CanAccessLessonPlan;
        t.CanViewStudentExamDetail = s.CanViewStudentExamDetail;
        t.CanRecordStudentConduct = s.CanRecordStudentConduct;
        t.CanViewStudentConduct = s.CanViewStudentConduct;
    }

    private static void ApplyChildren(EmployeeUpsertDto s, Employee employee)
    {
        foreach (var x in s.Qualifications.Where(HasData))
            employee.Qualifications.Add(new EmployeeQualification
            {
                Degree = Clean(x.Degree), Board = Clean(x.Board), Grade = Clean(x.Grade),
                Marks = Clean(x.Marks), Year = x.Year, Remarks = Clean(x.Remarks),
            });
        foreach (var x in s.Experiences.Where(HasData))
            employee.Experiences.Add(new EmployeeExperience
            {
                InstituteName = Clean(x.InstituteName), Designation = Clean(x.Designation),
                FromDate = x.FromDate, ToDate = x.ToDate, DurationYears = x.DurationYears,
            });
        foreach (var x in s.Assets.Where(HasData))
            employee.Assets.Add(new EmployeeAsset
            {
                AssetName = Clean(x.AssetName), DateOfIssue = x.DateOfIssue,
                AssetWorth = x.AssetWorth, Remarks = Clean(x.Remarks),
            });
    }

    private static EmployeeDetailDto MapDetail(Employee x) => new()
    {
        ID = x.ID, Thumb_ID = x.Thumb_ID, EmployeeName = x.EmployeeName ?? "", FatherName = x.FatherName,
        DoB = x.DoB, Gender = x.Gender, Religion = x.Religion, IsMarried = x.IsMarried,
        Blood_Group = x.Blood_Group, Permanent_Address = x.Permanent_Address, HomePhone = x.HomePhone,
        Contact1 = x.Contact1 ?? "", Contact2 = x.Contact2, Contact3 = x.Contact3, Email = x.Email,
        CNIC = x.CNIC, IdentityMark = x.IdentityMark, Refered_By = x.Refered_By,
        LocalityID = x.LocalityID, LocalityName = x.Locality?.Town, Joining_Date = x.Joining_Date,
        Salary = x.Salary, ProfessionalDegree = x.ProfessionalDegree, IsTrained = x.IsTrained,
        VerifiedBy = x.VerifiedBy, ApprovedBy = x.ApprovedBy, Leaving_Date = x.Leaving_Date,
        IsActive = x.IsActive, DesignationID = x.DesignationID, DesignationName = x.Designation?.DesignationName,
        MaritalStatus = x.MaritalStatus, Password = x.Password ?? "",
        CanMarkStudentAttendance = x.CanMarkStudentAttendance,
        CanViewStudentAttendance = x.CanViewStudentAttendance,
        CanViewSubjectAllocation = x.CanViewSubjectAllocation,
        CanEditSubjectAllocation = x.CanEditSubjectAllocation,
        CanViewTimetable = x.CanViewTimetable,
        CanEditTimetable = x.CanEditTimetable,
        CanViewDatesheet = x.CanViewDatesheet,
        CanEditDatesheet = x.CanEditDatesheet,
        CanViewDiary = x.CanViewDiary,
        CanEditDiary = x.CanEditDiary,
        CanAccessLessonPlan = x.CanAccessLessonPlan,
        CanViewStudentExamDetail = x.CanViewStudentExamDetail,
        CanRecordStudentConduct = x.CanRecordStudentConduct,
        CanViewStudentConduct = x.CanViewStudentConduct,
        Qualifications = x.Qualifications.OrderBy(y => y.ID).Select(y => new EmployeeQualificationDto
        {
            ID = y.ID, Degree = y.Degree, Board = y.Board, Grade = y.Grade,
            Marks = y.Marks, Year = y.Year, Remarks = y.Remarks,
        }).ToList(),
        Experiences = x.Experiences.OrderBy(y => y.ID).Select(y => new EmployeeExperienceDto
        {
            ID = y.ID, InstituteName = y.InstituteName, Designation = y.Designation,
            FromDate = y.FromDate, ToDate = y.ToDate, DurationYears = y.DurationYears,
        }).ToList(),
        Assets = x.Assets.OrderBy(y => y.ID).Select(y => new EmployeeAssetDto
        {
            ID = y.ID, AssetName = y.AssetName, DateOfIssue = y.DateOfIssue,
            AssetWorth = y.AssetWorth, Remarks = y.Remarks,
        }).ToList(),
    };

    private static bool HasData(EmployeeQualificationDto x) =>
        !string.IsNullOrWhiteSpace(x.Degree) || !string.IsNullOrWhiteSpace(x.Board) ||
        !string.IsNullOrWhiteSpace(x.Grade) || !string.IsNullOrWhiteSpace(x.Marks) ||
        x.Year.HasValue || !string.IsNullOrWhiteSpace(x.Remarks);
    private static bool HasData(EmployeeExperienceDto x) =>
        !string.IsNullOrWhiteSpace(x.InstituteName) || !string.IsNullOrWhiteSpace(x.Designation) ||
        x.FromDate.HasValue || x.ToDate.HasValue || x.DurationYears.HasValue;
    private static bool HasData(EmployeeAssetDto x) =>
        !string.IsNullOrWhiteSpace(x.AssetName) || x.DateOfIssue.HasValue ||
        x.AssetWorth.HasValue || !string.IsNullOrWhiteSpace(x.Remarks);
    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
