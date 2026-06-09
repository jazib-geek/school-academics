using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.Application.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly ITokenService _tokenService;
    private readonly TenantContext _tenantContext;

    public AuthService(AppDbContext context, ITokenService tokenService, TenantContext tenantContext)
    {
        _context = context;
        _tokenService = tokenService;
        _tenantContext = tenantContext;
    }

    public async Task<LoginResponseDto?> LoginAsync(LoginRequestDto request)
    {
        var family = await _context.StudentFamilyDetails
            .Include(f => f.Students.Where(s => s.IsActive == true))
                .ThenInclude(s => s.Section)
            .FirstOrDefaultAsync(x =>
                x.FamilyID == request.FamilyID &&
                x.Password == request.Password);

        if (family == null)
            return null;

        var token = _tokenService.GenerateToken(
    family.ID,
    family.FamilyID,
    _tenantContext.Campus
);


        return new LoginResponseDto
        {
            ID = family.ID,
            Token = token,
            FamilyID = family.FamilyID,
            FatherName = family.FatherName,
            MotherName = family.MotherName,
            FatherContact = family.FatherMobileNo,
            FatherCNIC = family.FatherCNIC,
            MotherContact = family.MotherPhoneNo,
            MotherCNIC = family.MotherCNIC,
            HomeAddress = family.Students.FirstOrDefault(s => s.IsActive == true)?.Home_Address,

            Students = family.Students
                .Where(s => s.IsActive == true)
                .Select(s => new StudentDto
                {
                    RegId = s.Reg_Id,
                    FullName = s.FullName,
                    DateOfBirth = s.Date_of_Brith,
                    Family_Code = s.Family_Code,
                    ClassCompositeID = s.ClassCompositeID,
                    IsActive = s.IsActive,
                    Fee = s.Fee,
                    TutionFee = s.TutionFee,
                    FeeConcession = s.FeeConcession,
                    ClassName = s.Section != null ? s.Section.ClassName : null,
                })
                .ToList()
        };
    }

    public async Task<CampusLoginResponseDto?> CampusLoginAsync(CampusLoginRequestDto request)
    {
        var username = request.Username?.Trim();

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return null;
        }

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.Username == username &&
                x.Password == request.Password &&
                x.IsActive == true);

        if (user == null)
        {
            return null;
        }

        var token = _tokenService.GenerateToken(user.ID, null, _tenantContext.Campus);

        return new CampusLoginResponseDto
        {
            ID = user.ID,
            Username = user.Username ?? string.Empty,
            RoleID = user.RoleID,
            Token = token
        };
    }

}
