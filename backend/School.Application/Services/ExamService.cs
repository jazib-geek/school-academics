using Microsoft.EntityFrameworkCore;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.Application.Services;

public class ExamService : IExamService
{
    private readonly AppDbContext _context;

    public ExamService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<ExamTypeListItemDto>> GetExamTypesAsync()
    {
        return await _context.ExamTypes
            .AsNoTracking()
            .Where(x => x.IsActive != false)
            .OrderBy(x => x.Priority ?? int.MaxValue)
            .ThenBy(x => x.ID)
            .Select(x => new ExamTypeListItemDto
            {
                Id = x.ID,
                Name = x.ExamTypeName,
                Priority = x.Priority
            })
            .ToListAsync();
    }

    public async Task<StudentResultDto?> GetStudentResultAsync(
        int studentId,
        int examTypeId,
        ExamAggregationOptions? options = null)
    {
        options ??= ExamAggregationOptions.Default;

        var student = await _context.Students
            .AsNoTracking()
            .Include(x => x.Section)
            .Include(x => x.Family)
            .FirstOrDefaultAsync(x => x.Reg_Id == studentId);

        if (student == null)
            return null;

        var classId = student.ClassCompositeID;
        var specialSubjects = await GetSpecialSubjectIdsAsync();

        var examTypeName = await _context.ExamTypes
            .AsNoTracking()
            .Where(x => x.ID == examTypeId)
            .Select(x => x.ExamTypeName)
            .FirstOrDefaultAsync();

        var exams = await _context.Exams
            .AsNoTracking()
            .Include(x => x.Subject)
            .Where(x =>
                x.StudentID == studentId &&
                x.ExamTypeID == examTypeId &&
                x.ClassID == classId)
            .ToListAsync();

        if (exams.Count == 0)
            return null;

        var subjectDtos = exams
            .OrderBy(x => x.Subject?.SubjectName)
            .Select(x =>
            {
                var subjectId = x.SubjectID ?? 0;
                var usesGradeDisplay = IsGradingSubject(subjectId, specialSubjects);

                return new StudentSubjectResultDto
                {
                    SubjectId = subjectId,
                    SubjectName = x.Subject?.SubjectName ?? x.Subject?.ShortName ?? "Subject",
                    TotalMarks = x.TotalMarks ?? 0,
                    PassingMarks = x.PassingMarks ?? 0,
                    ObtainedMarks = x.ObtainedMarks ?? 0,
                    Percentage = usesGradeDisplay
                        ? 0
                        : CalculatePercentage(
                            x.ObtainedMarks == -1 ? 0 : x.ObtainedMarks,
                            x.TotalMarks),
                    UsesGradeDisplay = usesGradeDisplay,
                    SubjectGrade = usesGradeDisplay
                        ? GetSubjectGrade(x.ObtainedMarks, x.TotalMarks)
                        : null
                };
            })
            .ToList();

        var countedExams = exams
            .Where(x => !ShouldExcludeFromTotals(x.SubjectID, specialSubjects, options))
            .ToList();

        var totalMarks = countedExams.Sum(x => x.TotalMarks ?? 0);
        var totalObtained = countedExams
            .Where(x => x.ObtainedMarks != -1)
            .Sum(x => x.ObtainedMarks ?? 0);

        var percentage = CalculatePercentage(totalObtained, totalMarks);
        var grade = GetGrade(percentage);
        var remarks = GetRemarks(grade);
        var position = await CalculatePositionAsync(
            studentId,
            examTypeId,
            classId,
            specialSubjects,
            options);
        var attendanceRatio = exams
            .Select(x => x.AttendanceRatio)
            .FirstOrDefault(x => !string.IsNullOrWhiteSpace(x));

        return new StudentResultDto
        {
            StudentId = studentId,
            ExamTypeId = examTypeId,
            StudentName = student.FullName,
            FatherName = student.Family?.FatherName,
            ClassName = student.Section?.ClassName,
            ExamTypeName = examTypeName,
            AttendanceRatio = attendanceRatio,
            TotalMarks = totalMarks,
            TotalObtained = totalObtained,
            Percentage = percentage,
            Grade = grade,
            Remarks = remarks,
            Position = position,
            PositionDisplay = FormatPosition(position),
            Subjects = subjectDtos
        };
    }

    public async Task<ExamMarkSheetDto?> GetExamMarkSheetAsync(
        int sectionId,
        int examTypeId,
        ExamAggregationOptions? options = null,
        string sortBy = "position")
    {
        options ??= ExamAggregationOptions.Default;

        var section = await _context.Sections
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == sectionId);

        if (section == null)
            return null;

        var examTypeName = await _context.ExamTypes
            .AsNoTracking()
            .Where(x => x.ID == examTypeId)
            .Select(x => x.ExamTypeName)
            .FirstOrDefaultAsync();

        var specialSubjects = await GetSpecialSubjectIdsAsync();

        var allExams = await _context.Exams
            .AsNoTracking()
            .Include(x => x.Subject)
            .Where(x => x.ClassID == sectionId && x.ExamTypeID == examTypeId)
            .ToListAsync();

        if (allExams.Count == 0)
            return null;

        var students = await _context.Students
            .AsNoTracking()
            .Where(x => x.ClassCompositeID == sectionId && x.IsActive == true)
            .OrderBy(x => x.Reg_Id)
            .ToListAsync();

        var subjectColumns = allExams
            .GroupBy(x => x.SubjectID)
            .Select(g =>
            {
                var sample = g.First();
                var subjectId = g.Key ?? 0;
                return new ExamMarkSheetSubjectColumnDto
                {
                    SubjectId = subjectId,
                    SubjectName = sample.Subject?.SubjectName ?? sample.Subject?.ShortName ?? "Subject",
                    ShortName = sample.Subject?.ShortName ?? sample.Subject?.SubjectName ?? "Sub",
                    UsesGradeDisplay = IsGradingSubject(subjectId, specialSubjects),
                    TotalMarks = sample.TotalMarks ?? 0,
                    PassingMarks = sample.PassingMarks ?? 0,
                    MaxMarks = g.Max(x => x.MaxMarks ?? x.TotalMarks ?? 0)
                };
            })
            .OrderBy(x => x.SubjectName)
            .ToList();

        var grandTotalMarks = subjectColumns
            .Where(x => !ShouldExcludeFromTotals(x.SubjectId, specialSubjects, options))
            .Sum(x => x.TotalMarks);

        var examsByStudent = allExams
            .GroupBy(x => x.StudentID)
            .ToDictionary(g => g.Key ?? 0, g => g.ToList());

        var studentTotals = new List<(int StudentId, int TotalObtained, ExamMarkSheetStudentRowDto Row)>();

        foreach (var student in students)
        {
            examsByStudent.TryGetValue(student.Reg_Id, out var studentExams);
            studentExams ??= new List<Infrastructure.Entities.Exam>();

            var countedExams = studentExams
                .Where(x => !ShouldExcludeFromTotals(x.SubjectID, specialSubjects, options))
                .ToList();

            var totalMarks = countedExams.Sum(x => x.TotalMarks ?? 0);
            var totalObtained = countedExams
                .Where(x => x.ObtainedMarks > 0)
                .Sum(x => x.ObtainedMarks ?? 0);

            var percentage = CalculatePercentage(totalObtained, totalMarks);
            var grade = GetGrade(percentage);

            var examLookup = studentExams.ToDictionary(x => x.SubjectID ?? 0);
            var subjectCells = subjectColumns.Select(column =>
            {
                examLookup.TryGetValue(column.SubjectId, out var examRow);
                return BuildSubjectCell(examRow, column.SubjectId, specialSubjects);
            }).ToList();

            var row = new ExamMarkSheetStudentRowDto
            {
                RegId = student.Reg_Id,
                StudentName = student.FullName,
                AttendanceRatio = studentExams
                    .Select(x => x.AttendanceRatio)
                    .FirstOrDefault(x => !string.IsNullOrWhiteSpace(x)),
                SubjectCells = subjectCells,
                TotalObtained = totalObtained,
                TotalMarks = totalMarks,
                Percentage = percentage,
                Grade = grade,
                Remarks = GetRemarks(grade)
            };

            studentTotals.Add((student.Reg_Id, totalObtained, row));
        }

        var positions = CalculateClassPositions(
            studentTotals.Select(x => (x.StudentId, x.TotalObtained)).ToList());

        foreach (var item in studentTotals)
        {
            var position = positions.GetValueOrDefault(item.StudentId, 0);
            item.Row.Position = position;
            item.Row.PositionDisplay = FormatPosition(position);
        }

        var sortedRows = sortBy.Equals("regId", StringComparison.OrdinalIgnoreCase)
            ? studentTotals.OrderBy(x => x.StudentId).Select(x => x.Row).ToList()
            : studentTotals
                .OrderByDescending(x => x.TotalObtained)
                .ThenBy(x => x.StudentId)
                .Select(x => x.Row)
                .ToList();

        for (var i = 0; i < sortedRows.Count; i++)
            sortedRows[i].Serial = i + 1;

        var subjectAverages = subjectColumns
            .Select(column => new ExamMarkSheetSubjectAverageDto
            {
                SubjectId = column.SubjectId,
                Percentage = CalculateSubjectClassAverage(allExams, column.SubjectId, column.TotalMarks)
            })
            .ToList();

        return new ExamMarkSheetDto
        {
            SectionId = sectionId,
            ClassName = section.ClassName,
            ExamTypeId = examTypeId,
            ExamTypeName = examTypeName,
            Strength = students.Count,
            GrandTotalMarks = grandTotalMarks,
            Subjects = subjectColumns,
            Students = sortedRows,
            SubjectAverages = subjectAverages
        };
    }

    private static ExamMarkSheetSubjectCellDto BuildSubjectCell(
        Infrastructure.Entities.Exam? examRow,
        int subjectId,
        (int? DrawingId, int? StempId) specialSubjects)
    {
        if (examRow == null)
        {
            return new ExamMarkSheetSubjectCellDto
            {
                SubjectId = subjectId,
                ObtainedMarks = 0,
                UsesGradeDisplay = IsGradingSubject(subjectId, specialSubjects),
                DisplayValue = IsGradingSubject(subjectId, specialSubjects) ? "-" : "0"
            };
        }

        var usesGradeDisplay = IsGradingSubject(subjectId, specialSubjects);
        var obtained = examRow.ObtainedMarks;

        return new ExamMarkSheetSubjectCellDto
        {
            SubjectId = subjectId,
            ObtainedMarks = obtained,
            UsesGradeDisplay = usesGradeDisplay,
            DisplayValue = FormatMarkSheetCellValue(obtained, usesGradeDisplay, examRow.TotalMarks)
        };
    }

    private static string FormatMarkSheetCellValue(int? obtainedMarks, bool usesGradeDisplay, int? totalMarks)
    {
        if (obtainedMarks == -1)
            return "A";

        if (usesGradeDisplay)
            return GetSubjectGrade(obtainedMarks, totalMarks);

        return (obtainedMarks ?? 0).ToString();
    }

    private static int CalculateSubjectClassAverage(
        List<Infrastructure.Entities.Exam> allExams,
        int subjectId,
        int totalMarks)
    {
        if (totalMarks <= 0)
            return 0;

        var rows = allExams
            .Where(x => x.SubjectID == subjectId && x.ObtainedMarks != -1)
            .ToList();

        if (rows.Count == 0)
            return 0;

        var averageObtained = (double)rows.Sum(x => x.ObtainedMarks ?? 0) / rows.Count;
        var percentage = averageObtained / totalMarks * 100;
        return (int)Math.Round(percentage, MidpointRounding.AwayFromZero);
    }

    private static Dictionary<int, int> CalculateClassPositions(List<(int StudentId, int Total)> studentTotals)
    {
        var distinctTotals = studentTotals
            .Select(x => x.Total)
            .Distinct()
            .OrderByDescending(x => x)
            .ToList();

        var positions = new Dictionary<int, int>();

        foreach (var (studentId, total) in studentTotals)
            positions[studentId] = total == 0 ? 0 : distinctTotals.IndexOf(total) + 1;

        return positions;
    }

    private async Task<(int? DrawingId, int? StempId)> GetSpecialSubjectIdsAsync()
    {
        var subjects = await _context.SubjectMasters
            .AsNoTracking()
            .Where(s => s.SubjectName != null &&
                        (s.SubjectName.ToLower() == "drawing" ||
                         s.SubjectName.ToLower() == "stemp"))
            .Select(s => new { s.ID, s.SubjectName })
            .ToListAsync();

        int? drawingId = subjects
            .FirstOrDefault(s => s.SubjectName!.Equals("Drawing", StringComparison.OrdinalIgnoreCase))
            ?.ID;
        int? stempId = subjects
            .FirstOrDefault(s => s.SubjectName!.Equals("Stemp", StringComparison.OrdinalIgnoreCase))
            ?.ID;

        return (drawingId, stempId);
    }

    private static bool IsGradingSubject(int subjectId, (int? DrawingId, int? StempId) specialSubjects) =>
        (specialSubjects.DrawingId.HasValue && subjectId == specialSubjects.DrawingId.Value) ||
        (specialSubjects.StempId.HasValue && subjectId == specialSubjects.StempId.Value);

    private static bool ShouldExcludeFromTotals(
        int? subjectId,
        (int? DrawingId, int? StempId) specialSubjects,
        ExamAggregationOptions options)
    {
        if (!subjectId.HasValue)
            return false;

        if (!options.IncludeStempInTotals &&
            specialSubjects.StempId.HasValue &&
            subjectId == specialSubjects.StempId)
            return true;

        if (!options.IncludeDrawingInTotals &&
            specialSubjects.DrawingId.HasValue &&
            subjectId == specialSubjects.DrawingId)
            return true;

        return false;
    }

    private async Task<int> CalculatePositionAsync(
        int studentId,
        int examTypeId,
        int? classId,
        (int? DrawingId, int? StempId) specialSubjects,
        ExamAggregationOptions options)
    {
        var studentIds = await _context.Students
            .AsNoTracking()
            .Where(s => s.ClassCompositeID == classId && s.IsActive == true)
            .Select(s => s.Reg_Id)
            .ToListAsync();

        var totals = new List<(int StudentId, int Total)>();

        foreach (var id in studentIds)
        {
            var rows = await _context.Exams
                .AsNoTracking()
                .Where(e =>
                    e.StudentID == id &&
                    e.ExamTypeID == examTypeId &&
                    e.ClassID == classId &&
                    e.ObtainedMarks > 0)
                .ToListAsync();

            var total = rows
                .Where(e => !ShouldExcludeFromTotals(e.SubjectID, specialSubjects, options))
                .Sum(e => e.ObtainedMarks ?? 0);

            totals.Add((id, total));
        }

        var currentStudentTotal = totals
            .FirstOrDefault(x => x.StudentId == studentId)
            .Total;

        if (currentStudentTotal == 0)
            return 0;

        var distinctTotals = totals
            .Select(x => x.Total)
            .Distinct()
            .OrderByDescending(x => x)
            .ToList();

        return distinctTotals.IndexOf(currentStudentTotal) + 1;
    }

    private static int CalculatePercentage(int? obtained, int? total)
    {
        if (total > 0)
            return (int)(((double)(obtained ?? 0) / total.Value) * 100);

        return 0;
    }

    private static string GetSubjectGrade(int? obtainedMarks, int? totalMarks)
    {
        if (obtainedMarks is null or 0 or -1 || totalMarks is null or 0)
            return "-";

        return GetGrade(CalculatePercentage(obtainedMarks, totalMarks));
    }

    private static string GetGrade(int percentage)
    {
        if (percentage == 0)
            return "-";

        if (percentage > 89) return "A++";
        if (percentage >= 80) return "A+";
        if (percentage >= 70) return "A";
        if (percentage >= 60) return "B";
        if (percentage >= 50) return "C";
        if (percentage >= 40) return "D";
        if (percentage > 0) return "E";
        return "F";
    }

    private static string GetRemarks(string grade)
    {
        return grade switch
        {
            "A++" => "Outstanding",
            "A+" => "Excellent",
            "A" => "Very Good",
            "B" => "Good",
            "C" => "Fair",
            "D" => "Satisfactory",
            "E" => "Needs Improvement",
            "F" => "Fail",
            _ => "-"
        };
    }

    private static string FormatPosition(int position)
    {
        if (position == 0)
            return "-";

        return position switch
        {
            11 or 12 or 13 => $"{position}th",
            _ when position % 10 == 1 => $"{position}st",
            _ when position % 10 == 2 => $"{position}nd",
            _ when position % 10 == 3 => $"{position}rd",
            _ => $"{position}th"
        };
    }
}
