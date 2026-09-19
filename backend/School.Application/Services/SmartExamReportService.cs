using System.Collections;
using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.Application.Services;

public class SmartExamReportService : ISmartExamReportService
{
    private static readonly CultureInfo Invariant = CultureInfo.InvariantCulture;

    private readonly AppDbContext _context;
    private readonly IExamService _examService;

    public SmartExamReportService(AppDbContext context, IExamService examService)
    {
        _context = context;
        _examService = examService;
    }

    public Task<List<SmartFeeReportCatalogItemDto>> GetCatalogAsync() => Task.FromResult(BuildCatalog());

    public Task<IReadOnlyList<ExamAwardListSubjectColumnDto>> GetClassSubjectsAsync(int sectionId) =>
        _examService.GetClassAwardListSubjectsAsync(sectionId);

    public async Task<ExamExecutiveSnapshotDto> GetExecutiveSnapshotAsync()
    {
        var activeStudentCount = await _context.Students.CountAsync(x => x.IsActive == true);
        var examTypeCount = await _context.ExamTypes.CountAsync(x => x.IsActive != false);
        var activeClassCount = await _context.Sections.CountAsync(x => x.IsActive != false);
        var classesWithMarks = await _context.Exams
            .AsNoTracking()
            .Where(x => x.ClassID != null && x.ObtainedMarks != null && x.ObtainedMarks != 0)
            .Select(x => x.ClassID)
            .Distinct()
            .CountAsync();

        return new ExamExecutiveSnapshotDto
        {
            GeneratedAt = PakistanTime.Now,
            ActiveStudentCount = activeStudentCount,
            ExamTypeCount = examTypeCount,
            ClassesWithMarks = classesWithMarks,
            ActiveClassCount = activeClassCount
        };
    }

    public async Task<SmartFeeReportResultDto> RunAsync(string reportId, Dictionary<string, object?> parameters)
    {
        var id = (reportId ?? string.Empty).Trim().ToLowerInvariant();
        var catalog = BuildCatalog().FirstOrDefault(x => x.Id == id)
            ?? throw new ArgumentException("That report was not found.");

        parameters ??= new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

        return id switch
        {
            "result-card" => await AcademicProgressAsync(catalog, parameters, junior: false, multiple: false),
            "result-card-multiple" => await AcademicProgressAsync(catalog, parameters, junior: false, multiple: true),
            "result-card-junior" => await AcademicProgressAsync(catalog, parameters, junior: true, multiple: false),
            "result-card-multiple-junior" => await AcademicProgressAsync(catalog, parameters, junior: true, multiple: true),
            "result-card-fancy" => await FancyCardAsync(catalog, parameters, multiple: false),
            "fancy-multiple" => await FancyCardAsync(catalog, parameters, multiple: true),
            "award-list-2col" => await AwardListAsync(catalog, parameters, "award-2col", requireExamType: true),
            "award-list-remarks" => await AwardListAsync(catalog, parameters, "award-remarks", requireExamType: true),
            "award-list-12col" => await AwardListAsync(catalog, parameters, "award-12col", requireExamType: false),
            "award-list-subjects" => await AwardListSubjectsAsync(catalog, parameters),
            "top-n" => await TopNAsync(catalog, parameters, junior: false),
            "top-n-junior" => await TopNAsync(catalog, parameters, junior: true),
            _ => throw new ArgumentException("That report was not found.")
        };
    }

    private static List<SmartFeeReportCatalogItemDto> BuildCatalog() =>
    [
        Item("result-card", "Result Card (Class 1 to 10)",
            "Year card with exam columns for one student.", "result-cards",
            "Print one senior result card.",
            P(StudentIdParam())),
        Item("result-card-multiple", "Result Card Multiple (Class 1 to 10)",
            "Year cards for every student in a class.", "result-cards",
            "Print the class set of senior cards.",
            P(ClassRequired())),
        Item("result-card-junior", "Result Card (Juniors)",
            "Year card with Drawing shown as a grade.", "result-cards",
            "Print one junior result card.",
            P(StudentIdParam())),
        Item("result-card-multiple-junior", "Result Card Multiple (Juniors)",
            "Junior year cards for every student in a class.", "result-cards",
            "Print the class set of junior cards.",
            P(ClassRequired())),
        Item("result-card-fancy", "Result Card Fancy",
            "Single-exam decorative card for one student.", "result-cards",
            "Print one fancy result card.",
            P(StudentIdParam(), ExamTypeParam(), DrawingModeParam())),
        Item("fancy-multiple", "Fancy Multiple",
            "Fancy cards for every student in a class.", "result-cards",
            "Print the class set of fancy cards.",
            P(ClassRequired(), ExamTypeParam(), DrawingModeParam())),
        Item("award-list-2col", "Award List 2 Col",
            "Two checking sheets side by side for a class.", "award-lists",
            "Blank checking sheet, two copies.",
            P(ClassRequired(), ExamTypeParam())),
        Item("award-list-remarks", "Award List (with Remarks)",
            "Class list with space for checking and remarks.", "award-lists",
            "Blank award sheet with remarks.",
            P(ClassRequired(), ExamTypeParam())),
        Item("award-list-12col", "Award List 12 Col",
            "Blank 12-column mark grid for a class.", "award-lists",
            "Blank award list for dates or tests.",
            P(ClassRequired())),
        Item("award-list-subjects", "Award List (Subjects)",
            "Blank sheet with a column for each class subject.", "award-lists",
            "Subject columns you can tick before printing.",
            P(ClassRequired())),
        Item("top-n", "Top N Positions",
            "Highest ranks in every class for one exam.", "positions",
            "Campus-wide position holders.",
            P(ExamTypeParam(), PositionsParam())),
        Item("top-n-junior", "Top N Positions (Junior)",
            "Highest ranks with Drawing treated as a grade.", "positions",
            "Junior position holders.",
            P(ExamTypeParam(), PositionsParam())),
    ];

    private async Task<SmartFeeReportResultDto> AcademicProgressAsync(
        SmartFeeReportCatalogItemDto cat,
        Dictionary<string, object?> p,
        bool junior,
        bool multiple)
    {
        var options = SeniorOrJunior(junior);
        List<AcademicProgressCardDto> cards;

        if (multiple)
        {
            var classId = RequireInt(p, "classCompositeId", "Please choose a class.");
            cards = (await _examService.GetAcademicProgressCardsForClassAsync(classId, options)).ToList();
            if (cards.Count == 0)
                throw new ArgumentException("No students were found in this class.");
        }
        else
        {
            var studentId = RequireInt(p, "studentId", "Please enter a student ID.");
            var card = await _examService.GetAcademicProgressCardAsync(studentId, options)
                ?? throw new ArgumentException("No student was found for that ID.");
            cards = [card];
        }

        return Result(cat, cards.Count, "academic-progress", new
        {
            cards,
            isJunior = junior
        });
    }

    private async Task<SmartFeeReportResultDto> FancyCardAsync(
        SmartFeeReportCatalogItemDto cat,
        Dictionary<string, object?> p,
        bool multiple)
    {
        var examTypeId = RequireInt(p, "examTypeId", "Please choose an exam type.");
        var drawingMode = (OptString(p, "drawingMode") ?? "G").Trim().ToUpperInvariant();
        var options = FancyOptions(drawingMode);

        List<StudentResultDto> cards;
        if (multiple)
        {
            var classId = RequireInt(p, "classCompositeId", "Please choose a class.");
            cards = (await _examService.GetStudentResultsForClassAsync(classId, examTypeId, options)).ToList();
            if (cards.Count == 0)
                throw new ArgumentException("No exam results were found for this class.");
        }
        else
        {
            var studentId = RequireInt(p, "studentId", "Please enter a student ID.");
            var card = await _examService.GetStudentResultAsync(studentId, examTypeId, options)
                ?? throw new ArgumentException("No exam result was found for this student.");
            cards = [card];
        }

        return Result(cat, cards.Count, "fancy-card", new
        {
            cards,
            drawingMode
        });
    }

    private async Task<SmartFeeReportResultDto> AwardListAsync(
        SmartFeeReportCatalogItemDto cat,
        Dictionary<string, object?> p,
        string layout,
        bool requireExamType)
    {
        var classId = RequireInt(p, "classCompositeId", "Please choose a class.");
        int? examTypeId = requireExamType
            ? RequireInt(p, "examTypeId", "Please choose an exam type.")
            : OptInt(p, "examTypeId");

        var roster = await _examService.GetAwardListRosterAsync(classId, examTypeId)
            ?? throw new ArgumentException("That class was not found.");

        if (roster.Students.Count == 0)
            throw new ArgumentException("No students were found in this class.");

        return Result(cat, roster.Students.Count, layout, roster);
    }

    private async Task<SmartFeeReportResultDto> AwardListSubjectsAsync(
        SmartFeeReportCatalogItemDto cat,
        Dictionary<string, object?> p)
    {
        var classId = RequireInt(p, "classCompositeId", "Please choose a class.");
        var roster = await _examService.GetAwardListRosterAsync(classId)
            ?? throw new ArgumentException("That class was not found.");

        if (roster.Students.Count == 0)
            throw new ArgumentException("No students were found in this class.");

        var classSubjects = await _examService.GetClassAwardListSubjectsAsync(classId);
        if (classSubjects.Count == 0)
            throw new ArgumentException("No subjects are set for this class.");

        var selectedIds = OptIntList(p, "subjectIds");
        var subjectIdsSent = p.TryGetValue("subjectIds", out var rawIds) && rawIds is not null
            && !(rawIds is JsonElement emptyEl && emptyEl.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined);

        if (subjectIdsSent && selectedIds.Count == 0)
            throw new ArgumentException("Please keep at least one subject on the sheet.");

        roster.Subjects = selectedIds.Count == 0
            ? classSubjects.ToList()
            : classSubjects.Where(x => selectedIds.Contains(x.SubjectId)).ToList();

        if (roster.Subjects.Count == 0)
            throw new ArgumentException("Please keep at least one subject on the sheet.");

        return Result(cat, roster.Students.Count, "award-subjects", roster);
    }

    private async Task<SmartFeeReportResultDto> TopNAsync(
        SmartFeeReportCatalogItemDto cat,
        Dictionary<string, object?> p,
        bool junior)
    {
        var examTypeId = RequireInt(p, "examTypeId", "Please choose an exam type.");
        var n = OptInt(p, "n") ?? 3;
        if (n <= 0)
            n = 3;

        var report = await _examService.GetTopPositionsAsync(examTypeId, n, SeniorOrJunior(junior))
            ?? throw new ArgumentException("That exam type was not found.");

        var count = report.Classes.Sum(x => x.Students.Count);
        if (count == 0)
            throw new ArgumentException("No position holders were found for this exam.");

        return Result(cat, count, "top-n", report);
    }

    private static ExamAggregationOptions SeniorOrJunior(bool junior) => new()
    {
        IncludeDrawingInTotals = !junior,
        IncludeStempInTotals = false
    };

    private static ExamAggregationOptions FancyOptions(string drawingMode) => new()
    {
        IncludeDrawingInTotals = drawingMode == "M",
        IncludeStempInTotals = false
    };

    private static SmartFeeReportResultDto Result(
        SmartFeeReportCatalogItemDto cat,
        int totalRecords,
        string layout,
        object layoutPayload) => new()
    {
        ReportId = cat.Id,
        Title = cat.Title,
        Category = cat.Category,
        GeneratedAt = PakistanTime.Now,
        TotalRecords = totalRecords,
        Layout = layout,
        LayoutPayload = layoutPayload
    };

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

    private static SmartFeeReportParamDefDto StudentIdParam() =>
        Param("studentId", "Student ID", "int", true, null);

    private static SmartFeeReportParamDefDto ClassRequired() =>
        Param("classCompositeId", "Class", "classComposite", true, "", "classes");

    private static SmartFeeReportParamDefDto ExamTypeParam() =>
        Param("examTypeId", "Exam type", "select", true, "", "examTypes");

    private static SmartFeeReportParamDefDto DrawingModeParam() =>
        Param("drawingMode", "Drawing", "select", true, "G", null,
        [
            new SmartFeeReportOptionDto { Value = "G", Label = "Drawing as Grade" },
            new SmartFeeReportOptionDto { Value = "M", Label = "Drawing as Marks" }
        ]);

    private static SmartFeeReportParamDefDto PositionsParam() =>
        Param("n", "Positions", "int", true, 3);

    private static int RequireInt(Dictionary<string, object?> p, string key, string message)
    {
        var value = OptInt(p, key);
        if (value is null or <= 0)
            throw new ArgumentException(message);
        return value.Value;
    }

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

    private static string? OptString(Dictionary<string, object?> p, string key)
    {
        if (!p.TryGetValue(key, out var raw) || raw is null) return null;
        if (raw is JsonElement je)
            return je.ValueKind == JsonValueKind.String ? je.GetString() : je.ToString();
        return Convert.ToString(raw, Invariant);
    }

    private static List<int> OptIntList(Dictionary<string, object?> p, string key)
    {
        if (!p.TryGetValue(key, out var raw) || raw is null)
            return [];

        if (raw is JsonElement je)
        {
            if (je.ValueKind == JsonValueKind.Array)
            {
                var ids = new List<int>();
                foreach (var item in je.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.Number && item.TryGetInt32(out var n) && n > 0)
                        ids.Add(n);
                    else if (item.ValueKind == JsonValueKind.String && int.TryParse(item.GetString(), out n) && n > 0)
                        ids.Add(n);
                }
                return ids;
            }

            if (je.ValueKind == JsonValueKind.String)
                return ParseIdList(je.GetString());
        }

        if (raw is IEnumerable enumerable and not string)
        {
            var ids = new List<int>();
            foreach (var item in enumerable)
            {
                if (item is JsonElement nested)
                {
                    if (nested.ValueKind == JsonValueKind.Number && nested.TryGetInt32(out var n) && n > 0)
                        ids.Add(n);
                    else if (nested.ValueKind == JsonValueKind.String && int.TryParse(nested.GetString(), out n) && n > 0)
                        ids.Add(n);
                }
                else if (int.TryParse(Convert.ToString(item, Invariant), NumberStyles.Integer, Invariant, out var parsed) && parsed > 0)
                {
                    ids.Add(parsed);
                }
            }
            return ids;
        }

        return ParseIdList(Convert.ToString(raw, Invariant));
    }

    private static List<int> ParseIdList(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return [];

        return text
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(part => int.TryParse(part, NumberStyles.Integer, Invariant, out var n) ? n : 0)
            .Where(n => n > 0)
            .ToList();
    }
}
