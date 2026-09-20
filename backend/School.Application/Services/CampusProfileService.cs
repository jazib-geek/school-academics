using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class CampusProfileService : ICampusProfileService
{
    private readonly AppDbContext _context;

    public CampusProfileService(AppDbContext context)
    {
        _context = context;
    }

    public Task<CampusProfileDto> GetAsync(CancellationToken cancellationToken = default)
        => GetFromContextAsync(_context, cancellationToken);

    public async Task<CampusProfileDto> GetFromContextAsync(
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var row = await EnsureRowAsync(context, cancellationToken);
        return Map(row);
    }

    public async Task<CampusProfileDto> UpdateAsync(
        UpdateCampusProfileDto request,
        CancellationToken cancellationToken = default)
    {
        ValidateFeeYears(request.FeeYear1, request.FeeYear2, request.FeeYear3);
        var session = NormalizeSessionBounds(
            request.SessionStartMonth,
            request.SessionStartYear,
            request.SessionEndMonth,
            request.SessionEndYear);

        var row = await EnsureRowAsync(_context, cancellationToken);
        row.SchoolName = TrimOrNull(request.SchoolName, 200);
        row.SchoolLogo = NormalizeSchoolLogo(request.SchoolLogo);
        row.CampusLabel = TrimOrNull(request.CampusLabel, 200);
        row.StreetAddress = TrimOrNull(request.StreetAddress, 300);
        row.Address = TrimOrNull(request.Address, 500);
        row.Phone1 = TrimOrNull(request.Phone1, 50);
        row.Phone2 = TrimOrNull(request.Phone2, 50);
        row.Landline = TrimOrNull(request.Landline, 50);
        row.Email = TrimOrNull(request.Email, 200);
        row.ShowPhone1OnInvoice = request.ShowPhone1OnInvoice;
        row.ShowPhone2OnInvoice = request.ShowPhone2OnInvoice;
        row.ShowLandlineOnInvoice = request.ShowLandlineOnInvoice;
        row.SessionStartMonth = session.StartMonth;
        row.SessionStartYear = session.StartYear;
        row.SessionEndMonth = session.EndMonth;
        row.SessionEndYear = session.EndYear;
        row.SessionLabel = session.Label;
        row.FeeYear1 = NormalizeYear(request.FeeYear1);
        row.FeeYear2 = NormalizeYear(request.FeeYear2);
        row.FeeYear3 = NormalizeYear(request.FeeYear3);
        row.ReceiptFooterNote = TrimOrNull(request.ReceiptFooterNote, 500);
        row.ShowAddressOnReceipts = request.ShowAddressOnReceipts;
        row.BiometricAttendanceType = BiometricAttendanceTypes.Normalize(request.BiometricAttendanceType);
        row.TeacherCheckInTime = ParseTimeOrDefault(
            request.TeacherCheckInTime,
            BiometricAttendanceTypes.DefaultTeacherCheckIn);
        row.TeacherCheckOutTime = ParseTimeOrDefault(
            request.TeacherCheckOutTime,
            BiometricAttendanceTypes.DefaultTeacherCheckOut);
        row.AdminEarlyMinutes = BiometricAttendanceTypes.ClampMinutes(
            request.AdminEarlyMinutes,
            BiometricAttendanceTypes.DefaultAdminEarlyMinutes);
        row.CoordinatorEarlyMinutes = BiometricAttendanceTypes.ClampMinutes(
            request.CoordinatorEarlyMinutes,
            BiometricAttendanceTypes.DefaultCoordinatorEarlyMinutes);
        row.FridayCheckOutTime = ParseTimeOrDefault(
            request.FridayCheckOutTime,
            BiometricAttendanceTypes.DefaultFridayCheckOut);

        await _context.SaveChangesAsync(cancellationToken);
        return Map(row);
    }

    private static async Task<CampusProfile> EnsureRowAsync(
        AppDbContext context,
        CancellationToken cancellationToken)
    {
        var row = await context.CampusProfiles
            .OrderBy(x => x.ID)
            .FirstOrDefaultAsync(cancellationToken);

        if (row != null)
            return row;

        var year = DateTime.Now.Year;
        row = CreateDefault(year);
        context.CampusProfiles.Add(row);
        await context.SaveChangesAsync(cancellationToken);
        return row;
    }

    internal static CampusProfile CreateDefault(int year) => new()
    {
        SchoolName = null,
        SchoolLogo = null,
        CampusLabel = null,
        StreetAddress = null,
        Address = null,
        Phone1 = null,
        Phone2 = null,
        Landline = null,
        Email = null,
        ShowPhone1OnInvoice = true,
        ShowPhone2OnInvoice = false,
        ShowLandlineOnInvoice = true,
        SessionStartMonth = 2,
        SessionStartYear = year,
        SessionEndMonth = 1,
        SessionEndYear = year + 1,
        SessionLabel = $"{year}-{year + 1}",
        FeeYear1 = year,
        FeeYear2 = year + 1,
        FeeYear3 = null,
        ReceiptFooterNote = null,
        ShowAddressOnReceipts = true,
        BiometricAttendanceType = BiometricAttendanceTypes.Default,
        TeacherCheckInTime = BiometricAttendanceTypes.DefaultTeacherCheckIn,
        TeacherCheckOutTime = BiometricAttendanceTypes.DefaultTeacherCheckOut,
        AdminEarlyMinutes = BiometricAttendanceTypes.DefaultAdminEarlyMinutes,
        CoordinatorEarlyMinutes = BiometricAttendanceTypes.DefaultCoordinatorEarlyMinutes,
        FridayCheckOutTime = BiometricAttendanceTypes.DefaultFridayCheckOut,
    };

    private static CampusProfileDto Map(CampusProfile row)
    {
        var session = CoalesceSession(row);
        return new CampusProfileDto
        {
            Id = row.ID,
            SchoolName = row.SchoolName,
            SchoolLogo = row.SchoolLogo,
            CampusLabel = row.CampusLabel,
            StreetAddress = row.StreetAddress,
            Address = row.Address,
            Phone1 = row.Phone1,
            Phone2 = row.Phone2,
            Landline = row.Landline,
            Email = row.Email,
            ShowPhone1OnInvoice = row.ShowPhone1OnInvoice,
            ShowPhone2OnInvoice = row.ShowPhone2OnInvoice,
            ShowLandlineOnInvoice = row.ShowLandlineOnInvoice,
            SessionLabel = session.Label ?? row.SessionLabel,
            SessionStartMonth = session.StartMonth,
            SessionStartYear = session.StartYear,
            SessionEndMonth = session.EndMonth,
            SessionEndYear = session.EndYear,
            FeeYear1 = row.FeeYear1,
            FeeYear2 = row.FeeYear2,
            FeeYear3 = row.FeeYear3,
            FeeYears = BuildFeeYears(row.FeeYear1, row.FeeYear2, row.FeeYear3),
            ReceiptFooterNote = row.ReceiptFooterNote,
            ShowAddressOnReceipts = row.ShowAddressOnReceipts,
            BiometricAttendanceType = BiometricAttendanceTypes.Normalize(row.BiometricAttendanceType),
            TeacherCheckInTime = FormatHhMm(row.TeacherCheckInTime),
            TeacherCheckOutTime = FormatHhMm(row.TeacherCheckOutTime),
            AdminEarlyMinutes = BiometricAttendanceTypes.ClampMinutes(
                row.AdminEarlyMinutes,
                BiometricAttendanceTypes.DefaultAdminEarlyMinutes),
            CoordinatorEarlyMinutes = BiometricAttendanceTypes.ClampMinutes(
                row.CoordinatorEarlyMinutes,
                BiometricAttendanceTypes.DefaultCoordinatorEarlyMinutes),
            FridayCheckOutTime = FormatHhMm(row.FridayCheckOutTime),
        };
    }

    /// <summary>
    /// Prefer explicit month/year columns; fall back to SessionLabel or Feb→Jan defaults.
    /// </summary>
    internal static (
        int? StartMonth,
        int? StartYear,
        int? EndMonth,
        int? EndYear,
        string? Label) CoalesceSession(CampusProfile row)
    {
        if (row.SessionStartMonth is >= 1 and <= 12
            && row.SessionStartYear is >= 2000 and <= 2100
            && row.SessionEndMonth is >= 1 and <= 12
            && row.SessionEndYear is >= 2000 and <= 2100)
        {
            var start = new DateTime(row.SessionStartYear.Value, row.SessionStartMonth.Value, 1);
            var end = new DateTime(row.SessionEndYear.Value, row.SessionEndMonth.Value, 1);
            if (end >= start)
            {
                return (
                    row.SessionStartMonth,
                    row.SessionStartYear,
                    row.SessionEndMonth,
                    row.SessionEndYear,
                    $"{row.SessionStartYear}-{row.SessionEndYear}");
            }
        }

        var fromLabel = TryParseSessionLabel(row.SessionLabel);
        if (fromLabel is not null)
        {
            return (2, fromLabel.Value.StartYear, 1, fromLabel.Value.EndYear, fromLabel.Value.Label);
        }

        var year = DateTime.Now.Year;
        return (2, year, 1, year + 1, $"{year}-{year + 1}");
    }

    private static (int StartYear, int EndYear, string Label)? TryParseSessionLabel(string? label)
    {
        if (string.IsNullOrWhiteSpace(label)) return null;
        var parts = label.Trim().Split(['-', '–', '/'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length != 2) return null;
        if (!int.TryParse(parts[0], out var start) || !int.TryParse(parts[1], out var end)) return null;
        if (start is < 2000 or > 2100 || end is < 2000 or > 2100) return null;
        if (end < start) return null;
        return (start, end, $"{start}-{end}");
    }

    private static (
        int? StartMonth,
        int? StartYear,
        int? EndMonth,
        int? EndYear,
        string? Label) NormalizeSessionBounds(
        int? startMonth,
        int? startYear,
        int? endMonth,
        int? endYear)
    {
        var hasAny = startMonth.HasValue || startYear.HasValue || endMonth.HasValue || endYear.HasValue;
        if (!hasAny)
            return (null, null, null, null, null);

        if (startMonth is null or < 1 or > 12
            || endMonth is null or < 1 or > 12
            || startYear is null or < 2000 or > 2100
            || endYear is null or < 2000 or > 2100)
        {
            throw new ArgumentException("Session start and end month/year are required and must be valid.");
        }

        var start = new DateTime(startYear.Value, startMonth.Value, 1);
        var end = new DateTime(endYear.Value, endMonth.Value, 1);
        if (end < start)
            throw new ArgumentException("Session end must be on or after the session start.");

        var months = ((end.Year - start.Year) * 12) + end.Month - start.Month + 1;
        if (months > 36)
            throw new ArgumentException("Session cannot span more than 36 months.");

        return (startMonth, startYear, endMonth, endYear, $"{startYear}-{endYear}");
    }

    private static IReadOnlyList<int> BuildFeeYears(int? y1, int? y2, int? y3)
        => new[] { y1, y2, y3 }
            .Where(y => y is >= 2000 and <= 2100)
            .Select(y => y!.Value)
            .Distinct()
            .OrderBy(y => y)
            .ToList();

    private static void ValidateFeeYears(int? y1, int? y2, int? y3)
    {
        foreach (var y in new[] { y1, y2, y3 })
        {
            if (y is null) continue;
            if (y is < 2000 or > 2100)
                throw new ArgumentException("Fee years must be between 2000 and 2100.");
        }
    }

    private static int? NormalizeYear(int? year)
        => year is >= 2000 and <= 2100 ? year : null;

    private static string FormatHhMm(TimeSpan value) =>
        $"{value.Hours:D2}:{value.Minutes:D2}";

    private static TimeSpan ParseTimeOrDefault(string? value, TimeSpan fallback)
        => EmployeeAttendanceCalculator.TryParseTimeOfDay(value, out var time) ? time : fallback;

    private const int MaxSchoolLogoLength = 4 * 1024 * 1024;

    private static string? NormalizeSchoolLogo(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        var trimmed = value.Trim();
        if (trimmed.Length > MaxSchoolLogoLength)
            throw new ArgumentException("School logo is too large.");
        return trimmed;
    }

    private static string? TrimOrNull(string? value, int maxLen)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        var trimmed = value.Trim();
        return trimmed.Length <= maxLen ? trimmed : trimmed[..maxLen];
    }
}
