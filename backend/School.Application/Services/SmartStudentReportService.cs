using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.Application.Services;

public class SmartStudentReportService : ISmartStudentReportService
{
    private static readonly CultureInfo Invariant = CultureInfo.InvariantCulture;
    private static readonly string[] BandOrder = ["Junior", "Primary", "High Girls", "High Boys", "Other"];

    private readonly AppDbContext _context;

    public SmartStudentReportService(AppDbContext context)
    {
        _context = context;
    }

    public Task<List<SmartFeeReportCatalogItemDto>> GetCatalogAsync() => Task.FromResult(BuildCatalog());

    public async Task<StudentExecutiveSnapshotDto> GetExecutiveSnapshotAsync()
    {
        var today = PakistanTime.Today.ToDateTime(TimeOnly.MinValue);
        var monthStart = new DateTime(today.Year, today.Month, 1);

        var activeStudentCount = await _context.Students.CountAsync(x => x.IsActive == true);
        var inactiveStudentCount = await _context.Students.CountAsync(x => x.IsActive == false);
        var struckOffMtd = await _context.Students.CountAsync(x =>
            x.IsActive == false &&
            x.Leave_Date != null &&
            x.Leave_Date.Value.Date >= monthStart &&
            x.Leave_Date.Value.Date <= today.Date);
        var admissionsMtd = await _context.Students.CountAsync(x =>
            x.IsActive == true &&
            x.RegDate != null &&
            x.RegDate.Value.Date >= monthStart &&
            x.RegDate.Value.Date <= today.Date);
        var activeFamilyCount = await _context.Students
            .Where(x => x.IsActive == true && x.Family_Code != null)
            .Select(x => x.Family_Code)
            .Distinct()
            .CountAsync();
        var activeClassCount = await _context.Sections.CountAsync(x => x.IsActive != false);

        return new StudentExecutiveSnapshotDto
        {
            GeneratedAt = PakistanTime.Now,
            ActiveStudentCount = activeStudentCount,
            InactiveStudentCount = inactiveStudentCount,
            StruckOffMtd = struckOffMtd,
            AdmissionsMtd = admissionsMtd,
            ActiveFamilyCount = activeFamilyCount,
            ActiveClassCount = activeClassCount
        };
    }

    public async Task<SmartFeeReportResultDto> RunAsync(string reportId, Dictionary<string, object?> parameters)
    {
        var id = (reportId ?? string.Empty).Trim().ToLowerInvariant();
        var catalog = BuildCatalog().FirstOrDefault(x => x.Id == id)
            ?? throw new ArgumentException($"Unknown report '{reportId}'.");

        parameters ??= new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

        return id switch
        {
            "admission-list-serial" => await AdmissionListAsync(catalog, parameters, sortByRegId: true),
            "admission-list-class" => await AdmissionListAsync(catalog, parameters, sortByRegId: false),
            "admission-count" => await AdmissionCountAsync(catalog, parameters),
            "family-list" => await FamilyListAsync(catalog, forPortal: false),
            "phone-list" => await PhoneListAsync(catalog, parameters),
            "deactivated" => await DeactivatedAsync(catalog, parameters),
            "strength" => await StrengthAsync(catalog, includeFee: false),
            "strength-with-fee" => await StrengthAsync(catalog, includeFee: true),
            "family-accounts" => await FamilyListAsync(catalog, forPortal: true),
            "locality" => await LocalityAsync(catalog),
            "family-message" => await FamilyMessageAsync(catalog, parameters),
            "age-list" => await AgeListAsync(catalog, parameters),
            "birthday-list" => await BirthdayListAsync(catalog, parameters),
            "student-profile" => await StudentProfileAsync(catalog, parameters),
            _ => throw new ArgumentException($"Unknown report '{reportId}'.")
        };
    }

    private static List<SmartFeeReportCatalogItemDto> BuildCatalog() =>
    [
        Item("admission-list-serial", "Admission List (Serial wise)", "Full active roster sorted by registration number.", "admission",
            "Who was admitted, in reg-number order?",
            P(ClassCompositeOpt(), DateFromOpt(), DateToOpt())),
        Item("admission-list-class", "Admission List (Class wise)", "Full active roster sorted by class and section.", "admission",
            "Same list, grouped for class follow-up.",
            P(ClassCompositeOpt(), DateFromOpt(), DateToOpt())),
        Item("admission-count", "Admission Count (By Class)", "New admissions, withdrawals, and net change by class in a date range.", "admission",
            "Quick class-wise admission totals.",
            P(DateFromOpt(required: true), DateToOpt(required: true))),
        Item("family-list", "Family List (Registered Families)", "All registered family records with contacts.", "family",
            "Family master list for office use.",
            P()),
        Item("phone-list", "Phone Numbers (Class wise)", "Father and mother contact numbers by class.", "family",
            "Call and SMS contact sheet.",
            P(ClassCompositeOpt())),
        Item("deactivated", "Deactivated (Struck off students)", "Students marked inactive / left.", "admission",
            "Left students for follow-up.",
            P(ClassCompositeOpt(), DateFromOpt(), DateToOpt())),
        Item("strength", "Student Strength (Without Fee)", "Male / female / total headcount by class.", "strength",
            "Campus strength snapshot.",
            P()),
        Item("strength-with-fee", "Student Strength (With Fee)", "Strength plus tuition fee totals by class.", "strength",
            "Strength with fee pressure.",
            P()),
        Item("family-accounts", "Family Accounts (For Portal)", "Family IDs and portal passwords.", "family",
            "Parent portal login sheet.",
            P()),
        Item("locality", "Locality Report (All Classes)", "Active localities with student counts.", "strength",
            "Where students live.",
            P()),
        Item("family-message", "Family Message (Family code wise)", "Active children for one family code.", "family",
            "Sibling slip for messaging.",
            P(Param("familyId", "Family ID", "int", true, null))),
        Item("age-list", "Age List", "Ages for students in a selected class.", "demographics",
            "Age check for a class.",
            P(Param("classCompositeId", "Class", "classComposite", true, "", "classes"))),
        Item("birthday-list", "Birthday List", "Students with birthdays in a date window.", "demographics",
            "Birthday follow-up list.",
            P(ClassCompositeOpt(), DateFromOpt(required: true), DateToOpt(required: true))),
        Item("student-profile", "Student Profile", "Single-student detail sheet.", "admission",
            "One student on one page.",
            P(Param("studentId", "Reg ID", "int", true, null))),
    ];

    private async Task<SmartFeeReportResultDto> AdmissionListAsync(
        SmartFeeReportCatalogItemDto cat,
        Dictionary<string, object?> p,
        bool sortByRegId)
    {
        var classId = OptInt(p, "classCompositeId");
        var from = OptDate(p, "dateFrom");
        var to = OptDate(p, "dateTo");

        var query = ActiveRosterQuery();
        if (classId is > 0)
            query = query.Where(x => x.ClassCompositeID == classId);
        if (from.HasValue)
            query = query.Where(x => x.RegDate != null && x.RegDate.Value.Date >= from.Value.Date);
        if (to.HasValue)
            query = query.Where(x => x.RegDate != null && x.RegDate.Value.Date <= to.Value.Date);

        var raw = await query.ToListAsync();
        raw = sortByRegId
            ? raw.OrderBy(x => x.RegId).ToList()
            : raw.OrderBy(x => x.ClassCompositeID ?? int.MaxValue).ThenBy(x => x.RegId).ToList();

        var annualByStudent = await LoadAnnualChargesAsync(raw.Select(x => x.RegId).ToList());

        var rows = new List<Dictionary<string, object?>>();
        var serial = 1;
        foreach (var item in raw)
        {
            var fee = item.Fee ?? 0;
            var concession = item.FeeConcession ?? 0;
            var tuitionFee = item.TutionFee ?? Math.Max(0, fee - (int)concession);
            annualByStudent.TryGetValue(item.RegId, out var ac);

            rows.Add(new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
            {
                ["serial"] = serial++,
                ["className"] = item.ClassName,
                ["doa"] = FormatDate(item.RegDate),
                ["regId"] = item.RegId,
                ["studentName"] = (item.FullName ?? "").ToUpperInvariant(),
                ["locality"] = item.LocalityName ?? "",
                ["fatherName"] = (item.FatherName ?? "").ToUpperInvariant(),
                ["fatherContact"] = item.FatherMobile ?? "",
                ["motherContact"] = item.MotherPhone ?? "",
                ["familyId"] = item.FamilyCode,
                ["tuitionFee"] = tuitionFee,
                ["ac"] = ac
            });
        }

        var subtitle = sortByRegId ? "By Reg ID" : "By Class/Section";
        var result = Result(cat, rows, AdmissionColumns(), null, 0,
            Extra(("sort", "Sort", subtitle, "text")));
        result.Layout = "admission-list";
        result.LayoutPayload = new { sortLabel = subtitle };
        return result;
    }

    private async Task<SmartFeeReportResultDto> AdmissionCountAsync(
        SmartFeeReportCatalogItemDto cat,
        Dictionary<string, object?> p)
    {
        var from = OptDate(p, "dateFrom") ?? throw new ArgumentException("dateFrom is required.");
        var to = OptDate(p, "dateTo") ?? throw new ArgumentException("dateTo is required.");

        var sections = await _context.Sections
            .AsNoTracking()
            .Where(x => x.IsActive != false)
            .OrderBy(x => x.ClassName)
            .Select(x => new { x.ID, x.ClassName, x.Class_ID })
            .ToListAsync();

        var admissions = await _context.Students
            .AsNoTracking()
            .Where(x =>
                x.RegDate != null &&
                x.RegDate.Value.Date >= from.Date &&
                x.RegDate.Value.Date <= to.Date)
            .GroupBy(x => x.ClassCompositeID)
            .Select(g => new { ClassCompositeID = g.Key, Count = g.Count() })
            .ToListAsync();

        // Withdrawals = deactivated students whose leave date falls in the selected tenure.
        var withdrawals = await _context.Students
            .AsNoTracking()
            .Where(x =>
                x.IsActive == false &&
                x.Leave_Date != null &&
                x.Leave_Date.Value.Date >= from.Date &&
                x.Leave_Date.Value.Date <= to.Date)
            .GroupBy(x => x.ClassCompositeID)
            .Select(g => new { ClassCompositeID = g.Key, Count = g.Count() })
            .ToListAsync();

        var admissionMap = admissions.ToDictionary(x => x.ClassCompositeID ?? 0, x => x.Count);
        var withdrawalMap = withdrawals.ToDictionary(x => x.ClassCompositeID ?? 0, x => x.Count);
        var rows = sections.Select(s =>
        {
            var newAdmissions = admissionMap.GetValueOrDefault(s.ID, 0);
            var withdrawal = withdrawalMap.GetValueOrDefault(s.ID, 0);
            return new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
            {
                ["className"] = s.ClassName ?? "",
                ["admissions"] = newAdmissions,
                ["withdrawal"] = withdrawal,
                ["netActive"] = newAdmissions - withdrawal
            };
        }).ToList();

        var totalAdmissions = rows.Sum(r => ToInt(r, "admissions"));
        var totalWithdrawal = rows.Sum(r => ToInt(r, "withdrawal"));
        var totalNet = rows.Sum(r => ToInt(r, "netActive"));

        return Result(cat, rows, Cols(
            ("serial", "Sr #", "number"),
            ("className", "Class Name", "text"),
            ("admissions", "New Admissions", "number"),
            ("withdrawal", "Withdrawal", "number"),
            ("netActive", "Net Active", "number")),
            null, 0,
            Extra(
                ("admissions", "New admissions", totalAdmissions.ToString(Invariant), "number"),
                ("withdrawal", "Withdrawal", totalWithdrawal.ToString(Invariant), "number"),
                ("netActive", "Net active", totalNet.ToString(Invariant), "number")));
    }

    private async Task<SmartFeeReportResultDto> FamilyListAsync(SmartFeeReportCatalogItemDto cat, bool forPortal)
    {
        var families = await (
            from f in _context.StudentFamilyDetails.AsNoTracking()
            join occ in _context.Occupations.AsNoTracking() on f.FatherOccupationID equals occ.ID into occG
            from occ in occG.DefaultIfEmpty()
            join fq in _context.DegreeParameters.AsNoTracking() on f.FatherQualificationID equals fq.ID into fqG
            from fq in fqG.DefaultIfEmpty()
            join mq in _context.DegreeParameters.AsNoTracking() on f.MotherQualificationID equals mq.ID into mqG
            from mq in mqG.DefaultIfEmpty()
            select new
            {
                f.FamilyID,
                f.FatherName,
                f.FatherMobileNo,
                f.FatherCNIC,
                f.MotherName,
                f.MotherPhoneNo,
                f.Password,
                FatherOccupation = occ != null ? occ.OccupationName : null,
                FatherQualification = fq != null ? fq.DegreeTitle : null,
                MotherQualification = mq != null ? mq.DegreeTitle : null
            }).ToListAsync();

        var studentCounts = await _context.Students
            .AsNoTracking()
            .Where(x => x.Family_Code != null)
            .GroupBy(x => x.Family_Code)
            .Select(g => new { FamilyId = g.Key, Count = g.Count(), Active = g.Count(s => s.IsActive == true) })
            .ToListAsync();
        var countMap = studentCounts.ToDictionary(x => x.FamilyId ?? 0, x => x);

        var rows = families
            .Select(f =>
            {
                countMap.TryGetValue(f.FamilyID ?? 0, out var counts);
                return new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
                {
                    ["familyId"] = f.FamilyID,
                    ["fatherName"] = f.FatherName ?? "",
                    ["fatherContact"] = f.FatherMobileNo ?? "",
                    ["fatherCnic"] = f.FatherCNIC ?? "",
                    ["fatherOccupation"] = f.FatherOccupation ?? "",
                    ["fatherQualification"] = f.FatherQualification ?? "",
                    ["motherName"] = f.MotherName ?? "",
                    ["motherContact"] = f.MotherPhoneNo ?? "",
                    ["motherQualification"] = f.MotherQualification ?? "",
                    ["studentCount"] = counts?.Count ?? 0,
                    ["activeStudents"] = counts?.Active ?? 0,
                    ["password"] = f.Password ?? ""
                };
            })
            .OrderByDescending(r => ToInt(r, "studentCount"))
            .ThenBy(r => ToInt(r, "familyId"))
            .ToList();

        var columns = forPortal
            ? Cols(
                ("familyId", "Family ID", "number"),
                ("fatherName", "Father Name", "text"),
                ("fatherContact", "Father Contact", "text"),
                ("studentCount", "Students", "number"),
                ("password", "Password", "text"))
            : Cols(
                ("familyId", "Family ID", "number"),
                ("fatherName", "Father Name", "text"),
                ("fatherContact", "Father Contact", "text"),
                ("fatherOccupation", "Occupation", "text"),
                ("motherName", "Mother Name", "text"),
                ("motherContact", "Mother Contact", "text"),
                ("studentCount", "Students", "number"),
                ("password", "Password", "text"));

        return Result(cat, rows, columns, null, 0);
    }

    private async Task<SmartFeeReportResultDto> PhoneListAsync(
        SmartFeeReportCatalogItemDto cat,
        Dictionary<string, object?> p)
    {
        var classId = OptInt(p, "classCompositeId");
        var query = ActiveRosterQuery();
        if (classId is > 0)
            query = query.Where(x => x.ClassCompositeID == classId);

        var raw = await query
            .OrderBy(x => x.ClassCompositeID)
            .ThenBy(x => x.RegId)
            .ToListAsync();

        var classFiltered = classId is > 0;
        var rows = raw.Select((item, index) =>
        {
            var row = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
            {
                ["serial"] = index + 1,
                ["regId"] = item.RegId,
                ["studentName"] = (item.FullName ?? "").ToUpperInvariant(),
                ["fatherName"] = (item.FatherName ?? "").ToUpperInvariant(),
                ["fatherContact"] = item.FatherMobile ?? "",
                ["motherContact"] = item.MotherPhone ?? ""
            };
            if (!classFiltered)
                row["className"] = item.ClassName;
            return row;
        }).ToList();

        var columns = classFiltered
            ? Cols(
                ("serial", "#", "number"),
                ("regId", "Reg no.", "number"),
                ("studentName", "Name", "text"),
                ("fatherName", "Father Name", "text"),
                ("fatherContact", "Father Contact", "text"),
                ("motherContact", "Mother Contact", "text"))
            : Cols(
                ("serial", "#", "number"),
                ("regId", "Reg no.", "number"),
                ("studentName", "Name", "text"),
                ("className", "Class/Section", "text"),
                ("fatherName", "Father Name", "text"),
                ("fatherContact", "Father Contact", "text"),
                ("motherContact", "Mother Contact", "text"));

        var result = Result(cat, rows, columns, null, 0);
        result.Layout = "phone-list";
        result.LayoutPayload = new
        {
            classFiltered,
            classLabel = classFiltered
                ? (raw.FirstOrDefault()?.ClassName ?? "")
                : ""
        };
        return result;
    }

    private async Task<SmartFeeReportResultDto> DeactivatedAsync(
        SmartFeeReportCatalogItemDto cat,
        Dictionary<string, object?> p)
    {
        var classId = OptInt(p, "classCompositeId");
        var from = OptDate(p, "dateFrom");
        var to = OptDate(p, "dateTo");

        var query =
            from s in _context.Students.AsNoTracking()
            where s.IsActive == false
            join sec in _context.Sections.AsNoTracking() on s.ClassCompositeID equals sec.ID into secG
            from sec in secG.DefaultIfEmpty()
            join fam in _context.StudentFamilyDetails.AsNoTracking() on s.Family_Code equals fam.FamilyID into famG
            from fam in famG.DefaultIfEmpty()
            select new RosterRow
            {
                RegId = s.Reg_Id,
                FullName = s.FullName,
                LeaveDate = s.Leave_Date,
                FamilyCode = s.Family_Code,
                ClassCompositeID = s.ClassCompositeID,
                ClassName = sec != null ? sec.ClassName ?? "" : "",
                FatherName = fam != null ? fam.FatherName : null,
                FatherMobile = fam != null ? fam.FatherMobileNo : null,
                MotherPhone = fam != null ? fam.MotherPhoneNo : null,
                LocalityName = null
            };

        if (classId is > 0)
            query = query.Where(x => x.ClassCompositeID == classId);
        if (from.HasValue)
            query = query.Where(x => x.LeaveDate != null && x.LeaveDate.Value.Date >= from.Value.Date);
        if (to.HasValue)
            query = query.Where(x => x.LeaveDate != null && x.LeaveDate.Value.Date <= to.Value.Date);

        var raw = await query.OrderByDescending(x => x.LeaveDate).ThenBy(x => x.RegId).ToListAsync();

        var regIds = raw.Select(x => x.RegId).Distinct().ToList();
        var deactivateLogs = regIds.Count == 0
            ? []
            : await _context.ActivityLogs
                .AsNoTracking()
                .Where(x =>
                    x.EntityType == ActivityLogEntityTypes.Student &&
                    x.ActivityType == ActivityLogTypes.StudentDeactivate &&
                    x.EntityId != null &&
                    regIds.Contains(x.EntityId.Value))
                .Select(x => new { x.EntityId, x.DetailsJson, x.OccurredAtPkt })
                .ToListAsync();

        var leaveDateByRegId = raw
            .GroupBy(x => x.RegId)
            .ToDictionary(g => g.Key, g => g.First().LeaveDate?.Date);

        var reasonByRegId = new Dictionary<int, string>();
        foreach (var group in deactivateLogs.GroupBy(x => x.EntityId!.Value))
        {
            leaveDateByRegId.TryGetValue(group.Key, out var leaveDate);
            var reason = group
                .OrderBy(x => leaveDate.HasValue
                    ? Math.Abs((x.OccurredAtPkt.Date - leaveDate.Value).TotalDays)
                    : 0)
                .ThenByDescending(x => x.OccurredAtPkt)
                .Select(x => ExtractActivityLogDescription(x.DetailsJson))
                .FirstOrDefault(x => !string.IsNullOrWhiteSpace(x));
            if (!string.IsNullOrWhiteSpace(reason))
                reasonByRegId[group.Key] = reason;
        }

        // Same outstanding formula as fee/fund defaulters: Payment − (Received + Discount).
        const int tuitionFundTypeId = 1;
        const int miscFundTypeId = 3;
        var outstandingBalances = regIds.Count == 0
            ? []
            : await _context.FeeAndFundCollections
                .AsNoTracking()
                .Where(x =>
                    x.StudentID != null &&
                    regIds.Contains(x.StudentID.Value) &&
                    (x.FundTypeID == tuitionFundTypeId || x.FundTypeID == miscFundTypeId))
                .GroupBy(x => new
                {
                    StudentId = x.StudentID!.Value,
                    FundTypeId = x.FundTypeID!.Value
                })
                .Select(g => new
                {
                    g.Key.StudentId,
                    g.Key.FundTypeId,
                    Outstanding = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
                })
                .ToListAsync();

        static decimal PosOutstanding(decimal value) => value > 0 ? value : 0m;

        var tfByRegId = outstandingBalances
            .Where(x => x.FundTypeId == tuitionFundTypeId)
            .ToDictionary(x => x.StudentId, x => PosOutstanding(x.Outstanding));
        var acByRegId = outstandingBalances
            .Where(x => x.FundTypeId == miscFundTypeId)
            .ToDictionary(x => x.StudentId, x => PosOutstanding(x.Outstanding));

        var rows = raw.Select((item, index) =>
        {
            reasonByRegId.TryGetValue(item.RegId, out var leftReason);
            tfByRegId.TryGetValue(item.RegId, out var tfOutstanding);
            acByRegId.TryGetValue(item.RegId, out var acOutstanding);
            return new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
            {
                ["serial"] = index + 1,
                ["regId"] = item.RegId,
                ["familyId"] = item.FamilyCode,
                ["studentName"] = (item.FullName ?? "").ToUpperInvariant(),
                ["className"] = item.ClassName,
                ["leaveDate"] = FormatDate(item.LeaveDate),
                ["fatherName"] = (item.FatherName ?? "").ToUpperInvariant(),
                ["contact"] = FormatMergedContacts(item.FatherMobile, item.MotherPhone),
                ["acOutstanding"] = acOutstanding,
                ["tfOutstanding"] = tfOutstanding,
                ["leftReason"] = leftReason ?? ""
            };
        }).ToList();

        var result = Result(cat, rows, Cols(
            ("serial", "#", "number"),
            ("regId", "Reg no.", "number"),
            ("familyId", "Family ID", "number"),
            ("studentName", "Name", "text"),
            ("className", "Class/Section", "text"),
            ("leaveDate", "Leave Date", "date"),
            ("fatherName", "Father", "text"),
            ("contact", "Contact", "text"),
            ("acOutstanding", "AC Balance", "money"),
            ("tfOutstanding", "TF Balance", "money"),
            ("leftReason", "Left Reason", "text")), null, 0);
        result.Layout = "deactivated";
        return result;
    }

    private async Task<SmartFeeReportResultDto> StrengthAsync(SmartFeeReportCatalogItemDto cat, bool includeFee)
    {
        var sections = await (
            from sec in _context.Sections.AsNoTracking()
            where sec.IsActive != false
            join cls in _context.Classes.AsNoTracking() on sec.Class_ID equals cls.Class_ID into clsG
            from cls in clsG.DefaultIfEmpty()
            orderby cls != null ? cls.sort_by ?? int.MaxValue : int.MaxValue, sec.ClassName
            select new
            {
                sec.ID,
                sec.ClassName,
                sec.Section_Gender,
                ClassId = sec.Class_ID,
                SortBy = cls != null ? cls.sort_by : null,
                ClassNameMaster = cls != null ? cls.Class_Name : null
            }).ToListAsync();

        var students = await _context.Students
            .AsNoTracking()
            .Where(x => x.IsActive == true)
            .Select(x => new
            {
                x.ClassCompositeID,
                x.Gender,
                x.TutionFee
            })
            .ToListAsync();

        var byClass = students
            .GroupBy(x => x.ClassCompositeID ?? 0)
            .ToDictionary(
                g => g.Key,
                g => new
                {
                    Male = g.Count(s => IsMale(s.Gender)),
                    Female = g.Count(s => IsFemale(s.Gender)),
                    Tuition = g.Sum(s => s.TutionFee ?? 0)
                });

        var rows = new List<Dictionary<string, object?>>();
        foreach (var sec in sections)
        {
            byClass.TryGetValue(sec.ID, out var stats);
            var male = stats?.Male ?? 0;
            var female = stats?.Female ?? 0;
            var band = ResolveBand(sec.SortBy, sec.Section_Gender, sec.ClassName, sec.ClassNameMaster);
            var row = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
            {
                ["band"] = band,
                ["bandOrder"] = Array.IndexOf(BandOrder, band),
                ["classId"] = sec.ID,
                ["className"] = sec.ClassName ?? "",
                ["male"] = male,
                ["female"] = female,
                ["total"] = male + female
            };
            if (includeFee)
                row["tuitionFee"] = stats?.Tuition ?? 0m;
            rows.Add(row);
        }

        rows = rows
            .OrderBy(r => ToInt(r, "bandOrder"))
            .ThenBy(r => ToInt(r, "classId"))
            .ToList();

        var columns = includeFee
            ? Cols(
                ("classId", "Class ID", "number"),
                ("className", "Class Name", "text"),
                ("male", "Male", "number"),
                ("female", "Female", "number"),
                ("total", "Total", "number"),
                ("tuitionFee", "Tution Fee", "money"))
            : Cols(
                ("classId", "Class ID", "number"),
                ("className", "Class Name", "text"),
                ("male", "Male", "number"),
                ("female", "Female", "number"),
                ("total", "Total", "number"));

        var result = Result(cat, rows, columns, "band", includeFee ? rows.Sum(r => ToDec(r, "tuitionFee")) : 0,
            Extra(
                ("male", "Male", rows.Sum(r => ToInt(r, "male")).ToString(Invariant), "number"),
                ("female", "Female", rows.Sum(r => ToInt(r, "female")).ToString(Invariant), "number"),
                ("total", "Total", rows.Sum(r => ToInt(r, "total")).ToString(Invariant), "number")));
        result.Layout = includeFee ? "strength-with-fee" : "strength";
        return result;
    }

    private async Task<SmartFeeReportResultDto> LocalityAsync(SmartFeeReportCatalogItemDto cat)
    {
        var localities = await _context.Localities
            .AsNoTracking()
            .Where(x => x.IsActive == true)
            .OrderBy(x => x.Town)
            .ToListAsync();

        var counts = await _context.Students
            .AsNoTracking()
            .Where(x => x.IsActive == true && x.LocalityID != null)
            .GroupBy(x => x.LocalityID)
            .Select(g => new { LocalityId = g.Key, Count = g.Count() })
            .ToListAsync();
        var countMap = counts.ToDictionary(x => x.LocalityId ?? 0, x => x.Count);

        var rows = localities.Select((loc, index) => new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
        {
            ["serial"] = index + 1,
            ["localityId"] = loc.ID,
            ["locality"] = loc.Town ?? "",
            ["studentCount"] = countMap.GetValueOrDefault(loc.ID, 0)
        }).ToList();

        return Result(cat, rows, Cols(
            ("serial", "#", "number"),
            ("locality", "Locality", "text"),
            ("studentCount", "Students", "number")), null, 0,
            Extra(("total", "Total students", rows.Sum(r => ToInt(r, "studentCount")).ToString(Invariant), "number")));
    }

    private async Task<SmartFeeReportResultDto> FamilyMessageAsync(
        SmartFeeReportCatalogItemDto cat,
        Dictionary<string, object?> p)
    {
        var familyId = OptInt(p, "familyId") ?? throw new ArgumentException("familyId is required.");

        var query = ActiveRosterQuery().Where(x => x.FamilyCode == familyId);
        var raw = await query
            .OrderBy(x => x.ClassId)
            .ThenBy(x => x.RegId)
            .ToListAsync();

        var rows = raw.Select((item, index) => new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
        {
            ["serial"] = index + 1,
            ["regId"] = item.RegId,
            ["studentName"] = (item.FullName ?? "").ToUpperInvariant(),
            ["className"] = item.ClassName,
            ["fatherName"] = (item.FatherName ?? "").ToUpperInvariant(),
            ["fatherContact"] = item.FatherMobile ?? "",
            ["familyId"] = familyId
        }).ToList();

        return Result(cat, rows, Cols(
            ("serial", "#", "number"),
            ("regId", "Reg no.", "number"),
            ("studentName", "Name", "text"),
            ("className", "Class/Section", "text"),
            ("fatherName", "Father", "text"),
            ("fatherContact", "Father Cont", "text"),
            ("familyId", "Family ID", "number")), null, 0);
    }

    private async Task<SmartFeeReportResultDto> AgeListAsync(
        SmartFeeReportCatalogItemDto cat,
        Dictionary<string, object?> p)
    {
        var classCompositeId = OptInt(p, "classCompositeId")
            ?? throw new ArgumentException("Class is required.");
        var today = PakistanTime.Today;

        var className = await _context.Sections
            .AsNoTracking()
            .Where(x => x.ID == classCompositeId)
            .Select(x => x.ClassName)
            .FirstOrDefaultAsync() ?? $"Class {classCompositeId}";

        var students = await _context.Students
            .AsNoTracking()
            .Where(x =>
                x.IsActive == true &&
                x.ClassCompositeID == classCompositeId)
            .OrderBy(x => x.Reg_Id)
            .Select(x => new { x.Reg_Id, x.FullName, x.Date_of_Brith, x.Gender })
            .ToListAsync();

        var rows = students.Select((s, index) => new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
        {
            ["serial"] = index + 1,
            ["regId"] = s.Reg_Id,
            ["studentName"] = (s.FullName ?? "").ToUpperInvariant(),
            ["gender"] = s.Gender ?? "",
            ["dob"] = FormatDate(s.Date_of_Brith),
            ["age"] = CalculateAge(s.Date_of_Brith, today),
            ["className"] = className
        }).ToList();

        return Result(cat, rows, Cols(
            ("serial", "#", "number"),
            ("regId", "Reg no.", "number"),
            ("studentName", "Name", "text"),
            ("gender", "Gender", "text"),
            ("dob", "Date of Birth", "date"),
            ("age", "Age", "text"),
            ("className", "Class/Section", "text")), null, 0);
    }

    private async Task<SmartFeeReportResultDto> BirthdayListAsync(
        SmartFeeReportCatalogItemDto cat,
        Dictionary<string, object?> p)
    {
        var classId = OptInt(p, "classCompositeId");
        var from = OptDate(p, "dateFrom") ?? throw new ArgumentException("dateFrom is required.");
        var to = OptDate(p, "dateTo") ?? throw new ArgumentException("dateTo is required.");

        var query = ActiveRosterQuery()
            .Where(x =>
                x.DateOfBirth != null &&
                x.DateOfBirth.Value.Date >= from.Date &&
                x.DateOfBirth.Value.Date <= to.Date);
        if (classId is > 0)
            query = query.Where(x => x.ClassCompositeID == classId);

        var raw = await query
            .OrderBy(x => x.DateOfBirth)
            .ThenBy(x => x.RegId)
            .ToListAsync();

        var rows = raw.Select((item, index) => new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
        {
            ["serial"] = index + 1,
            ["regId"] = item.RegId,
            ["studentName"] = (item.FullName ?? "").ToUpperInvariant(),
            ["className"] = item.ClassName,
            ["dob"] = FormatDate(item.DateOfBirth),
            ["fatherContact"] = item.FatherMobile ?? ""
        }).ToList();

        return Result(cat, rows, Cols(
            ("serial", "#", "number"),
            ("regId", "Reg no.", "number"),
            ("studentName", "Name", "text"),
            ("className", "Class/Section", "text"),
            ("dob", "Date of Birth", "date"),
            ("fatherContact", "Father Cont", "text")), null, 0);
    }

    private async Task<SmartFeeReportResultDto> StudentProfileAsync(
        SmartFeeReportCatalogItemDto cat,
        Dictionary<string, object?> p)
    {
        var studentId = OptInt(p, "studentId") ?? throw new ArgumentException("studentId is required.");

        var row = await ActiveRosterQuery()
            .Where(x => x.RegId == studentId)
            .FirstOrDefaultAsync();

        if (row is null)
        {
            var inactive = await (
                from s in _context.Students.AsNoTracking()
                where s.Reg_Id == studentId
                join sec in _context.Sections.AsNoTracking() on s.ClassCompositeID equals sec.ID into secG
                from sec in secG.DefaultIfEmpty()
                join fam in _context.StudentFamilyDetails.AsNoTracking() on s.Family_Code equals fam.FamilyID into famG
                from fam in famG.DefaultIfEmpty()
                join loc in _context.Localities.AsNoTracking() on s.LocalityID equals loc.ID into locG
                from loc in locG.DefaultIfEmpty()
                select new RosterRow
                {
                    RegId = s.Reg_Id,
                    FullName = s.FullName,
                    RegDate = s.RegDate,
                    DateOfBirth = s.Date_of_Brith,
                    Gender = s.Gender,
                    FamilyCode = s.Family_Code,
                    Fee = s.Fee,
                    FeeConcession = s.FeeConcession,
                    TutionFee = s.TutionFee,
                    IsActive = s.IsActive,
                    ClassName = sec != null ? sec.ClassName ?? "" : "",
                    FatherName = fam != null ? fam.FatherName : null,
                    FatherMobile = fam != null ? fam.FatherMobileNo : null,
                    MotherPhone = fam != null ? fam.MotherPhoneNo : null,
                    LocalityName = loc != null ? loc.Town : null
                }).FirstOrDefaultAsync();

            row = inactive ?? throw new ArgumentException($"Student {studentId} was not found.");
        }

        var rows = new List<Dictionary<string, object?>>
        {
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["field"] = "Reg ID",
                ["value"] = row.RegId
            },
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["field"] = "Name",
                ["value"] = row.FullName ?? ""
            },
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["field"] = "Class/Section",
                ["value"] = row.ClassName
            },
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["field"] = "Date of Admission",
                ["value"] = FormatDate(row.RegDate)
            },
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["field"] = "Date of Birth",
                ["value"] = FormatDate(row.DateOfBirth)
            },
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["field"] = "Gender",
                ["value"] = row.Gender ?? ""
            },
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["field"] = "Locality",
                ["value"] = row.LocalityName ?? ""
            },
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["field"] = "Father",
                ["value"] = row.FatherName ?? ""
            },
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["field"] = "Father Contact",
                ["value"] = row.FatherMobile ?? ""
            },
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["field"] = "Mother Contact",
                ["value"] = row.MotherPhone ?? ""
            },
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["field"] = "Family ID",
                ["value"] = row.FamilyCode
            },
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["field"] = "Fee",
                ["value"] = row.Fee
            },
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["field"] = "Concession",
                ["value"] = row.FeeConcession
            },
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["field"] = "Actual Fee",
                ["value"] = row.TutionFee
            },
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["field"] = "Status",
                ["value"] = row.IsActive == true ? "Active" : "Inactive"
            }
        };

        return Result(cat, rows, Cols(
            ("field", "Field", "text"),
            ("value", "Value", "text")), null, 0);
    }

    private IQueryable<RosterRow> ActiveRosterQuery() =>
        from s in _context.Students.AsNoTracking()
        where s.IsActive == true
        join sec in _context.Sections.AsNoTracking() on s.ClassCompositeID equals sec.ID into secG
        from sec in secG.DefaultIfEmpty()
        join fam in _context.StudentFamilyDetails.AsNoTracking() on s.Family_Code equals fam.FamilyID into famG
        from fam in famG.DefaultIfEmpty()
        join loc in _context.Localities.AsNoTracking() on s.LocalityID equals loc.ID into locG
        from loc in locG.DefaultIfEmpty()
        select new RosterRow
        {
            RegId = s.Reg_Id,
            FullName = s.FullName,
            RegDate = s.RegDate,
            LeaveDate = s.Leave_Date,
            DateOfBirth = s.Date_of_Brith,
            Gender = s.Gender,
            FamilyCode = s.Family_Code,
            ClassCompositeID = s.ClassCompositeID,
            ClassId = s.Class_ID,
            SectionId = s.Section_ID,
            Fee = s.Fee,
            FeeConcession = s.FeeConcession,
            TutionFee = s.TutionFee,
            Password = s.Password,
            SmsContact = s.SMS_Contact,
            IsActive = s.IsActive,
            ClassName = sec != null ? sec.ClassName ?? "" : "",
            FatherName = fam != null ? fam.FatherName : null,
            FatherMobile = fam != null ? fam.FatherMobileNo : null,
            MotherPhone = fam != null ? fam.MotherPhoneNo : null,
            LocalityName = loc != null ? loc.Town : null
        };

    private async Task<Dictionary<int, decimal>> LoadAnnualChargesAsync(List<int> studentIds)
    {
        if (studentIds.Count == 0) return new Dictionary<int, decimal>();

        var year = PakistanTime.Today.Year;
        var annualTypeIds = await _context.FundTypes
            .AsNoTracking()
            .Where(x => x.FundTypeName != null &&
                        (x.FundTypeName.Contains("Annual") || x.FundTypeName.Contains("AC")))
            .Select(x => x.ID)
            .ToListAsync();

        if (annualTypeIds.Count == 0)
        {
            // Common legacy annual fund type ids when name matching fails.
            annualTypeIds = [2, 3, 4, 5];
        }

        var charges = await _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x =>
                x.StudentID != null &&
                studentIds.Contains(x.StudentID.Value) &&
                x.FundTypeID != null &&
                annualTypeIds.Contains(x.FundTypeID.Value) &&
                x.FundTypeID != 1 &&
                (x.Year == null || x.Year == year) &&
                (x.Payment ?? 0) > 0)
            .GroupBy(x => x.StudentID!.Value)
            .Select(g => new { StudentId = g.Key, Amount = g.Sum(x => x.Payment ?? 0) })
            .ToListAsync();

        return charges.ToDictionary(x => x.StudentId, x => x.Amount);
    }

    private static string ResolveBand(int? sortBy, string? sectionGender, string? className, string? masterName)
    {
        var name = $"{className} {masterName}".ToLowerInvariant();
        var gender = (sectionGender ?? "").Trim().ToLowerInvariant();
        var isHigh =
            name.Contains("six") || name.Contains("seven") || name.Contains("eight") ||
            name.Contains("nine") || name.Contains("ten") || name.Contains("matric") ||
            name.Contains("hifz") || name.Contains("high") ||
            (sortBy is >= 9);

        if (isHigh)
        {
            if (gender.StartsWith("f") || name.Contains("girl"))
                return "High Girls";
            if (gender.StartsWith("m") || name.Contains("boy") || name.Contains("blue"))
                return "High Boys";
            return name.Contains("girl") ? "High Girls" : "High Boys";
        }

        if (sortBy is >= 5 and <= 8 ||
            name.Contains("one") || name.Contains("two") || name.Contains("three") ||
            name.Contains("four") || name.Contains("five") || name.Contains("primary"))
            return "Primary";

        if (sortBy is null or <= 4 ||
            name.Contains("play") || name.Contains("nursery") || name.Contains("prep") ||
            name.Contains("kg") || name.Contains("junior"))
            return "Junior";

        return "Other";
    }

    private static bool IsMale(string? gender)
    {
        var g = (gender ?? "").Trim().ToLowerInvariant();
        return g.StartsWith("m") || g == "boy" || g == "b";
    }

    private static bool IsFemale(string? gender)
    {
        var g = (gender ?? "").Trim().ToLowerInvariant();
        return g.StartsWith("f") || g == "girl" || g == "g";
    }

    private static string CalculateAge(DateTime? dob, DateOnly today)
    {
        if (dob is null) return "—";
        var birth = DateOnly.FromDateTime(dob.Value);
        var years = today.Year - birth.Year;
        if (birth > today.AddYears(-years)) years--;
        var months = today.Month - birth.Month;
        if (months < 0)
        {
            years--;
            months += 12;
        }
        if (today.Day < birth.Day) months = Math.Max(0, months - 1);
        return $"{years}y {months}m";
    }

    private static string FormatDate(DateTime? value)
    {
        if (value is null) return "";
        return value.Value.ToString("dd/MM/yyyy", Invariant);
    }

    private static string FormatMergedContacts(string? fatherMobile, string? motherPhone)
    {
        var father = string.IsNullOrWhiteSpace(fatherMobile) ? "-" : fatherMobile.Trim();
        var mother = string.IsNullOrWhiteSpace(motherPhone) ? "-" : motherPhone.Trim();
        if (father == "-" && mother == "-") return "-";
        return $"{father} / {mother}";
    }

    private static string? ExtractActivityLogDescription(string? detailsJson)
    {
        if (string.IsNullOrWhiteSpace(detailsJson))
            return null;

        try
        {
            using var document = JsonDocument.Parse(detailsJson);
            if (document.RootElement.TryGetProperty("description", out var descriptionElement) &&
                descriptionElement.ValueKind == JsonValueKind.String)
            {
                var value = descriptionElement.GetString()?.Trim();
                return string.IsNullOrWhiteSpace(value) ? null : value;
            }
        }
        catch (JsonException)
        {
            return null;
        }

        return null;
    }

    private static List<SmartFeeReportColumnDto> AdmissionColumns() => Cols(
        ("serial", "#", "number"),
        ("className", "Class/Section", "text"),
        ("doa", "DOA", "date"),
        ("regId", "Reg no.", "number"),
        ("studentName", "Name", "text"),
        ("locality", "Locality", "text"),
        ("fatherName", "Father", "text"),
        ("fatherContact", "Father Cont", "text"),
        ("motherContact", "Mother Cont", "text"),
        ("familyId", "Family ID", "number"),
        ("tuitionFee", "TuitionFee", "money"),
        ("ac", "AC", "money"));

    private static SmartFeeReportCatalogItemDto Item(
        string id, string title, string description, string category, string blurb,
        List<SmartFeeReportParamDefDto> parameters) => new()
    {
        Id = id,
        Title = title,
        Description = description,
        Category = category,
        DirectorBlurb = blurb,
        IsPreset = false,
        Parameters = parameters
    };

    private static List<SmartFeeReportParamDefDto> P(params SmartFeeReportParamDefDto[] items) => [.. items];

    private static SmartFeeReportParamDefDto Param(
        string key, string label, string type, bool required, object? defaultValue,
        string? optionsSource = null, List<SmartFeeReportOptionDto>? options = null) => new()
    {
        Key = key,
        Label = label,
        Type = type,
        Required = required,
        DefaultValue = defaultValue,
        OptionsSource = optionsSource,
        Options = options
    };

    private static SmartFeeReportParamDefDto ClassCompositeOpt() =>
        Param("classCompositeId", "Class", "classComposite", false, "", "classes");

    private static SmartFeeReportParamDefDto DateFromOpt(bool required = false) =>
        Param("dateFrom", "From", "date", required, null);

    private static SmartFeeReportParamDefDto DateToOpt(bool required = false) =>
        Param("dateTo", "To", "date", required, null);

    private static List<SmartFeeReportColumnDto> Cols(params (string Key, string Label, string Format)[] cols) =>
        cols.Select(c => new SmartFeeReportColumnDto { Key = c.Key, Label = c.Label, Format = c.Format }).ToList();

    private static SmartFeeReportKpiDto[] Extra(params (string Key, string Label, string Value, string Format)[] kpis) =>
        kpis.Select(k => new SmartFeeReportKpiDto { Key = k.Key, Label = k.Label, Value = k.Value, Format = k.Format }).ToArray();

    private static SmartFeeReportResultDto Result(
        SmartFeeReportCatalogItemDto cat,
        List<Dictionary<string, object?>> rows,
        List<SmartFeeReportColumnDto> columns,
        string? groupBy,
        decimal totalAmount,
        params SmartFeeReportKpiDto[] extras) => new()
    {
        ReportId = cat.Id,
        Title = cat.Title,
        Category = cat.Category,
        GeneratedAt = PakistanTime.Now,
        TotalRecords = rows.Count(r => !string.Equals(Convert.ToString(r.GetValueOrDefault("__type")), "total", StringComparison.OrdinalIgnoreCase)),
        TotalAmount = totalAmount,
        Columns = columns,
        Rows = rows,
        GroupByKey = groupBy,
        ExtraKpis = extras.ToList()
    };

    private static int? OptInt(Dictionary<string, object?> p, string key)
    {
        if (!p.TryGetValue(key, out var raw) || raw is null) return null;
        if (raw is JsonElement je)
        {
            if (je.ValueKind == JsonValueKind.Number && je.TryGetInt32(out var n)) return n;
            if (je.ValueKind == JsonValueKind.String && int.TryParse(je.GetString(), out n)) return n;
            return null;
        }
        return int.TryParse(Convert.ToString(raw, Invariant), NumberStyles.Integer, Invariant, out var v) ? v : null;
    }

    private static DateTime? OptDate(Dictionary<string, object?> p, string key)
    {
        if (!p.TryGetValue(key, out var raw) || raw is null) return null;
        var text = raw is JsonElement je
            ? (je.ValueKind == JsonValueKind.String ? je.GetString() : je.ToString())
            : Convert.ToString(raw, Invariant);
        if (string.IsNullOrWhiteSpace(text)) return null;
        return DateTime.TryParse(text, Invariant, DateTimeStyles.AssumeLocal, out var dt) ? dt.Date : null;
    }

    private static int ToInt(Dictionary<string, object?> row, string key)
    {
        if (!row.TryGetValue(key, out var v) || v is null) return 0;
        return int.TryParse(Convert.ToString(v, Invariant), NumberStyles.Integer, Invariant, out var n) ? n : 0;
    }

    private static decimal ToDec(Dictionary<string, object?> row, string key)
    {
        if (!row.TryGetValue(key, out var v) || v is null) return 0;
        return decimal.TryParse(Convert.ToString(v, Invariant), NumberStyles.Number, Invariant, out var d) ? d : 0;
    }

    private sealed class RosterRow
    {
        public int RegId { get; set; }
        public string? FullName { get; set; }
        public DateTime? RegDate { get; set; }
        public DateTime? LeaveDate { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public int? FamilyCode { get; set; }
        public int? ClassCompositeID { get; set; }
        public int? ClassId { get; set; }
        public int? SectionId { get; set; }
        public int? Fee { get; set; }
        public decimal? FeeConcession { get; set; }
        public decimal? TutionFee { get; set; }
        public string? Password { get; set; }
        public string? SmsContact { get; set; }
        public bool? IsActive { get; set; }
        public string ClassName { get; set; } = "";
        public string? FatherName { get; set; }
        public string? FatherMobile { get; set; }
        public string? MotherPhone { get; set; }
        public string? LocalityName { get; set; }
    }
}
