using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly ITokenService _tokenService;
    private readonly TenantContext _tenantContext;
    private readonly IConfiguration _configuration;
    private readonly ICampusProfileService _campusProfileService;
    private readonly IParentConductService _parentConductService;

    public AuthService(
        AppDbContext context,
        ITokenService tokenService,
        TenantContext tenantContext,
        IConfiguration configuration,
        ICampusProfileService campusProfileService,
        IParentConductService parentConductService)
    {
        _context = context;
        _tokenService = tokenService;
        _tenantContext = tenantContext;
        _configuration = configuration;
        _campusProfileService = campusProfileService;
        _parentConductService = parentConductService;
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
            _tenantContext.Campus);

        var conductInbox = family.FamilyID is int familyId && familyId > 0
            ? await _parentConductService.GetInboxAsync(family.ID, familyId)
            : new ParentConductInboxDto();

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
                    Gender = s.Gender,
                    DateOfBirth = s.Date_of_Brith,
                    Family_Code = s.Family_Code,
                    ClassCompositeID = s.ClassCompositeID,
                    IsActive = s.IsActive,
                    Fee = s.Fee,
                    TutionFee = s.TutionFee,
                    FeeConcession = s.FeeConcession,
                    ClassName = s.Section != null ? s.Section.ClassName : null,
                })
                .ToList(),

            ConductInbox = conductInbox,
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

        return await BuildCampusLoginResponseAsync(_context, user, _tenantContext.Campus);
    }

    public async Task<CampusLoginResponseDto> SwitchCampusAsync(
        int userId,
        SwitchCampusRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var targetCampus = (request.Campus ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(targetCampus))
            throw new ArgumentException("Campus is required.");

        var connectionString = _configuration.GetSection("CampusSettings:Campuses")[targetCampus];
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new ArgumentException("Invalid campus.");

        if (IsProductionEnvironment()
            && string.Equals(targetCampus, "local", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Invalid campus.");
        }

        var currentUser = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == userId && x.IsActive == true, cancellationToken)
            ?? throw new UnauthorizedAccessException("You must be signed in to switch campus.");

        if (!currentUser.IsSuperAdmin)
            throw new UnauthorizedAccessException("Only a super admin can switch campus without signing in again.");

        var username = (currentUser.Username ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(username))
            throw new UnauthorizedAccessException("Your account cannot switch campus.");

        if (string.Equals(targetCampus, _tenantContext.Campus, StringComparison.OrdinalIgnoreCase))
        {
            return await BuildCampusLoginResponseAsync(_context, currentUser, _tenantContext.Campus);
        }

        await using var targetContext = CreateCampusContext(connectionString);
        var targetUser = await targetContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.Username == username && x.IsActive == true,
                cancellationToken);

        if (targetUser is null)
            throw new InvalidOperationException("Your account was not found on that campus.");

        if (!targetUser.IsSuperAdmin)
            throw new UnauthorizedAccessException("Your account on that campus is not a super admin.");

        return await BuildCampusLoginResponseAsync(targetContext, targetUser, targetCampus);
    }

    public async Task<CampusLoginResponseDto> LoginAsAsync(
        int actorUserId,
        LoginAsCampusUserRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.UserId <= 0)
            throw new ArgumentException("User is required.");

        var actor = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == actorUserId && x.IsActive == true, cancellationToken)
            ?? throw new UnauthorizedAccessException("You must be signed in to use Login as.");

        if (!actor.IsSuperAdmin)
            throw new UnauthorizedAccessException("Only a super admin can use Login as.");

        if (request.UserId == actorUserId)
            return await BuildCampusLoginResponseAsync(_context, actor, _tenantContext.Campus);

        var targetUser = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == request.UserId && x.IsActive == true, cancellationToken)
            ?? throw new InvalidOperationException("That user was not found or is inactive.");

        return await BuildCampusLoginResponseAsync(_context, targetUser, _tenantContext.Campus);
    }

    public async Task ChangeCampusPasswordAsync(
        int userId,
        ChangeCampusPasswordDto request,
        CancellationToken cancellationToken = default)
    {
        var currentPassword = (request.CurrentPassword ?? string.Empty).Trim();
        var newPassword = (request.NewPassword ?? string.Empty).Trim();
        var confirmPassword = (request.ConfirmPassword ?? string.Empty).Trim();

        if (currentPassword.Length == 0)
            throw new ArgumentException("Current password is required.");
        if (newPassword.Length == 0)
            throw new ArgumentException("New password is required.");
        if (!string.Equals(newPassword, confirmPassword, StringComparison.Ordinal))
            throw new ArgumentException("New password and confirmation do not match.");
        if (string.Equals(currentPassword, newPassword, StringComparison.Ordinal))
            throw new ArgumentException("New password must be different from the current password.");

        var user = await _context.Users
            .FirstOrDefaultAsync(x => x.ID == userId, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        if (!string.Equals(user.Password ?? string.Empty, currentPassword, StringComparison.Ordinal))
            throw new UnauthorizedAccessException("Current password is incorrect.");

        user.Password = newPassword;
        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task<CampusLoginResponseDto> BuildCampusLoginResponseAsync(
        AppDbContext context,
        User user,
        string campus)
    {
        var token = _tokenService.GenerateToken(user.ID, null, campus);

        IReadOnlyList<string> granted;
        if (user.IsSuperAdmin)
        {
            granted = await context.Permissions
                .AsNoTracking()
                .Where(x => x.IsActive)
                .Select(x => x.Code)
                .ToListAsync();
        }
        else
        {
            var rightUsername = user.Username ?? string.Empty;
            granted = await context.UserRights
                .AsNoTracking()
                .Where(x => x.UserName == rightUsername && x.HasAccess == true && x.ModuleCode != null)
                .Select(x => x.ModuleCode!)
                .Distinct()
                .ToListAsync();
        }

        var fundTypes = await context.FundTypes
            .AsNoTracking()
            .OrderBy(x => x.ID)
            .Select(x => new FundTypeOptionDto
            {
                Id = x.ID,
                Name = x.FundTypeName ?? $"Fund {x.ID}"
            })
            .ToListAsync();

        var campusProfile = await _campusProfileService.GetFromContextAsync(context);

        return new CampusLoginResponseDto
        {
            ID = user.ID,
            Username = user.Username ?? string.Empty,
            RoleID = user.RoleID,
            Token = token,
            IsSuperAdmin = user.IsSuperAdmin,
            GrantedPermissionCodes = granted,
            FundTypes = fundTypes,
            CampusProfile = campusProfile
        };
    }

    private bool IsProductionEnvironment()
    {
        var environment = _configuration["ASPNETCORE_ENVIRONMENT"] ?? _configuration["DOTNET_ENVIRONMENT"];
        return string.Equals(environment, "Production", StringComparison.OrdinalIgnoreCase);
    }

    private static AppDbContext CreateCampusContext(string connectionString)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(connectionString)
            .Options;

        return new AppDbContext(options);
    }
}
