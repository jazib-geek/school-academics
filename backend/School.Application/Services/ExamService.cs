using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

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

    public async Task<ExamEntryMatrixDto?> LoadExamEntryMatrixAsync(
        int sectionId,
        int examTypeId)
    {
        if (!await ExamEntryScopeExistsAsync(sectionId, examTypeId))
            return null;

        var wasInitialized = await InitializeExamEntryMatrixIfEmptyAsync(sectionId, examTypeId);
        return await BuildExamEntryMatrixAsync(sectionId, examTypeId, wasInitialized);
    }

    public async Task<ExamEntryMatrixDto?> AddMissingExamEntryStudentsAsync(
        int sectionId,
        int examTypeId)
    {
        if (!await ExamEntryScopeExistsAsync(sectionId, examTypeId))
            return null;

        var subjectConfigRows = await _context.Exams
            .AsNoTracking()
            .Where(x =>
                x.ClassID == sectionId &&
                x.ExamTypeID == examTypeId &&
                x.SubjectID != null)
            .ToListAsync();

        var subjectConfigs = subjectConfigRows
            .GroupBy(x => x.SubjectID!.Value)
            .Select(g => new
            {
                SubjectId = g.Key,
                TotalMarks = g.Select(x => x.TotalMarks ?? 0).Where(x => x > 0).DefaultIfEmpty(0).Max(),
                PassingMarks = g.Select(x => x.PassingMarks ?? 0).Where(x => x >= 0).DefaultIfEmpty(0).Max(),
                MaxMarks = g.Select(x => x.MaxMarks ?? 0).Where(x => x > 0).DefaultIfEmpty(0).Max()
            })
            .ToList();

        if (subjectConfigs.Count == 0)
            return await BuildExamEntryMatrixAsync(sectionId, examTypeId);

        var existingStudentIds = await _context.Exams
            .AsNoTracking()
            .Where(x => x.ClassID == sectionId && x.ExamTypeID == examTypeId && x.StudentID != null)
            .Select(x => x.StudentID!.Value)
            .Distinct()
            .ToListAsync();

        var missingStudents = await _context.Students
            .AsNoTracking()
            .Where(x =>
                x.ClassCompositeID == sectionId &&
                x.IsActive == true &&
                !existingStudentIds.Contains(x.Reg_Id))
            .Select(x => new { x.Reg_Id, x.ClassCompositeID })
            .ToListAsync();

        foreach (var student in missingStudents)
        {
            foreach (var subject in subjectConfigs)
            {
                _context.Exams.Add(new Infrastructure.Entities.Exam
                {
                    ExamTypeID = examTypeId,
                    StudentID = student.Reg_Id,
                    SubjectID = subject.SubjectId,
                    ClassID = student.ClassCompositeID,
                    TotalMarks = subject.TotalMarks,
                    PassingMarks = subject.PassingMarks,
                    MaxMarks = subject.MaxMarks,
                    ObtainedMarks = 0,
                    AttendanceRatio = "-/-"
                });
            }
        }

        if (missingStudents.Count > 0)
            await _context.SaveChangesAsync();

        return await BuildExamEntryMatrixAsync(sectionId, examTypeId);
    }

    public async Task<ExamEntryCellDto?> UpdateExamEntryCellAsync(
        int examId,
        int? obtainedMarks)
    {
        var exam = await _context.Exams.FirstOrDefaultAsync(x => x.ID == examId);

        if (exam == null)
            return null;

        if (obtainedMarks < -1)
            throw new ArgumentException("Obtained marks cannot be less than -1.");

        if (obtainedMarks > (exam.TotalMarks ?? 0))
            throw new ArgumentException("Obtained marks cannot exceed total marks.");

        exam.ObtainedMarks = obtainedMarks ?? 0;
        await _context.SaveChangesAsync();

        return new ExamEntryCellDto
        {
            ExamId = exam.ID,
            SubjectId = exam.SubjectID ?? 0,
            ObtainedMarks = exam.ObtainedMarks,
            DisplayValue = FormatMarkSheetCellValue(exam.ObtainedMarks, false, exam.TotalMarks)
        };
    }

    public async Task<ExamEntryMatrixDto?> UpdateExamEntrySubjectMarksAsync(
        UpdateExamEntrySubjectMarksRequestDto request)
    {
        if (!await ExamEntryScopeExistsAsync(request.SectionId, request.ExamTypeId))
            return null;

        var rows = await _context.Exams
            .Where(x =>
                x.ClassID == request.SectionId &&
                x.ExamTypeID == request.ExamTypeId &&
                x.SubjectID == request.SubjectId)
            .ToListAsync();

        if (rows.Count == 0)
            return null;

        var totalMarks = request.TotalMarks ?? rows.Select(x => x.TotalMarks ?? 0).DefaultIfEmpty(0).Max();
        var passingMarks = request.PassingMarks ?? rows.Select(x => x.PassingMarks ?? 0).DefaultIfEmpty(0).Max();

        if (totalMarks < 0 || passingMarks < 0)
            throw new ArgumentException("Total and passing marks cannot be negative.");

        if (totalMarks > 0 && passingMarks > totalMarks)
            throw new ArgumentException("Passing marks cannot exceed total marks.");

        foreach (var row in rows)
        {
            if (request.TotalMarks.HasValue)
                row.TotalMarks = request.TotalMarks.Value;

            if (request.PassingMarks.HasValue)
                row.PassingMarks = request.PassingMarks.Value;

            if (row.ObtainedMarks > row.TotalMarks)
                row.ObtainedMarks = row.TotalMarks;
        }

        await _context.SaveChangesAsync();

        return await BuildExamEntryMatrixAsync(request.SectionId, request.ExamTypeId);
    }

    public async Task<ExamEntryMatrixDto?> UpdateExamEntryAttendanceAsync(
        UpdateExamEntryAttendanceRequestDto request)
    {
        if (!await ExamEntryScopeExistsAsync(request.SectionId, request.ExamTypeId))
            return null;

        var ratio = request.AttendanceRatio.Trim();

        if (!IsValidAttendanceRatio(ratio))
            throw new ArgumentException("Attendance must use NN/NN format.");

        var rows = await _context.Exams
            .Where(x =>
                x.ClassID == request.SectionId &&
                x.ExamTypeID == request.ExamTypeId &&
                x.StudentID == request.StudentId)
            .ToListAsync();

        if (rows.Count == 0)
            return null;

        foreach (var row in rows)
            row.AttendanceRatio = ratio;

        await _context.SaveChangesAsync();

        return await BuildExamEntryMatrixAsync(request.SectionId, request.ExamTypeId);
    }

    public async Task<IReadOnlyList<ExamEntrySubjectOptionDto>> GetAvailableExamEntrySubjectsAsync(
        int sectionId,
        int examTypeId)
    {
        var existingSubjectIds = await _context.Exams
            .AsNoTracking()
            .Where(x =>
                x.ClassID == sectionId &&
                x.ExamTypeID == examTypeId &&
                x.SubjectID != null)
            .Select(x => x.SubjectID!.Value)
            .Distinct()
            .ToListAsync();

        return await _context.SubjectMasters
            .AsNoTracking()
            .Where(x =>
                x.SubjectName != null &&
                x.SubjectName != "" &&
                !existingSubjectIds.Contains(x.ID))
            .OrderBy(x => x.SubjectName)
            .Select(x => new ExamEntrySubjectOptionDto
            {
                SubjectId = x.ID,
                SubjectName = x.SubjectName,
                ShortName = x.ShortName
            })
            .ToListAsync();
    }

    public async Task<ExamEntryMatrixDto?> AddExamEntrySubjectAsync(
        AddExamEntrySubjectRequestDto request)
    {
        if (!await ExamEntryScopeExistsAsync(request.SectionId, request.ExamTypeId))
            return null;

        if (request.TotalMarks < 0 || request.PassingMarks < 0)
            throw new ArgumentException("Total and passing marks cannot be negative.");

        if (request.TotalMarks > 0 && request.PassingMarks > request.TotalMarks)
            throw new ArgumentException("Passing marks cannot exceed total marks.");

        var subjectExists = await _context.SubjectMasters
            .AsNoTracking()
            .AnyAsync(x => x.ID == request.SubjectId);

        if (!subjectExists)
            return null;

        var alreadyExists = await _context.Exams
            .AsNoTracking()
            .AnyAsync(x =>
                x.ClassID == request.SectionId &&
                x.ExamTypeID == request.ExamTypeId &&
                x.SubjectID == request.SubjectId);

        if (alreadyExists)
            throw new InvalidOperationException("This subject is already in the exam.");

        var examStudentIds = await _context.Exams
            .AsNoTracking()
            .Where(x =>
                x.ClassID == request.SectionId &&
                x.ExamTypeID == request.ExamTypeId &&
                x.StudentID != null)
            .Select(x => x.StudentID!.Value)
            .Distinct()
            .ToListAsync();

        var students = await _context.Students
            .AsNoTracking()
            .Where(x => examStudentIds.Contains(x.Reg_Id))
            .Select(x => new { x.Reg_Id, x.ClassCompositeID })
            .ToListAsync();

        foreach (var student in students)
        {
            _context.Exams.Add(new Infrastructure.Entities.Exam
            {
                ExamTypeID = request.ExamTypeId,
                StudentID = student.Reg_Id,
                SubjectID = request.SubjectId,
                ClassID = request.SectionId,
                TotalMarks = request.TotalMarks,
                PassingMarks = request.PassingMarks,
                MaxMarks = 0,
                ObtainedMarks = 0,
                AttendanceRatio = "-/-"
            });
        }

        if (students.Count > 0)
            await _context.SaveChangesAsync();

        return await BuildExamEntryMatrixAsync(request.SectionId, request.ExamTypeId);
    }

    public async Task<ExamEntryMatrixDto?> DeleteExamEntrySubjectAsync(
        int sectionId,
        int examTypeId,
        int subjectId)
    {
        if (!await ExamEntryScopeExistsAsync(sectionId, examTypeId))
            return null;

        var rows = await _context.Exams
            .Where(x =>
                x.ClassID == sectionId &&
                x.ExamTypeID == examTypeId &&
                x.SubjectID == subjectId)
            .ToListAsync();

        if (rows.Count == 0)
            return null;

        _context.Exams.RemoveRange(rows);
        await _context.SaveChangesAsync();

        return await BuildExamEntryMatrixAsync(sectionId, examTypeId);
    }

    public async Task<ExamSubjectComponentEntryDto?> LoadSubjectComponentEntryAsync(
        int sectionId,
        int examTypeId,
        int subjectId)
    {
        var matrix = await LoadExamEntryMatrixAsync(sectionId, examTypeId);
        if (matrix == null)
            return null;

        return await BuildSubjectComponentEntryAsync(sectionId, examTypeId, subjectId, matrix.MissingStudentCount);
    }

    public async Task<ExamSubjectComponentEntryDto?> AddSubjectComponentHeaderAsync(
        AddExamSubjectComponentHeaderRequestDto request)
    {
        var matrix = await LoadExamEntryMatrixAsync(request.SectionId, request.ExamTypeId);
        if (matrix == null)
            return null;

        var headerName = request.HeaderName.Trim();
        if (string.IsNullOrWhiteSpace(headerName))
            throw new ArgumentException("Header name is required.");

        if (!request.MaxMarks.HasValue || request.MaxMarks.Value <= 0)
            throw new ArgumentException("Header max marks are required and must be greater than zero.");

        var subjectExists = await _context.Exams
            .AsNoTracking()
            .AnyAsync(x =>
                x.ClassID == request.SectionId &&
                x.ExamTypeID == request.ExamTypeId &&
                x.SubjectID == request.SubjectId);

        if (!subjectExists)
            return null;

        var duplicate = await _context.ExamSubjectComponentHeaders
            .AnyAsync(x =>
                x.ClassID == request.SectionId &&
                x.ExamTypeID == request.ExamTypeId &&
                x.SubjectID == request.SubjectId &&
                x.IsActive &&
                x.HeaderName == headerName);

        if (duplicate)
            throw new InvalidOperationException("This header already exists for the selected class, exam, and subject.");

        var subjectTotalMarks = await _context.Exams
            .AsNoTracking()
            .Where(x =>
                x.ClassID == request.SectionId &&
                x.ExamTypeID == request.ExamTypeId &&
                x.SubjectID == request.SubjectId &&
                x.TotalMarks > 0)
            .MaxAsync(x => x.TotalMarks) ?? 0;

        if (subjectTotalMarks <= 0)
            throw new InvalidOperationException("Enter total marks for this subject on Exam Entry before using detailed subject entry.");

        var activeHeaderMaxTotal = await _context.ExamSubjectComponentHeaders
            .AsNoTracking()
            .Where(x =>
                x.ClassID == request.SectionId &&
                x.ExamTypeID == request.ExamTypeId &&
                x.SubjectID == request.SubjectId &&
                x.IsActive)
            .SumAsync(x => x.MaxMarks ?? 0);

        if (activeHeaderMaxTotal + request.MaxMarks.Value > subjectTotalMarks)
            throw new ArgumentException($"Header max total cannot exceed subject total marks ({subjectTotalMarks}).");

        var nextSortOrder = (await _context.ExamSubjectComponentHeaders
            .Where(x =>
                x.ClassID == request.SectionId &&
                x.ExamTypeID == request.ExamTypeId &&
                x.SubjectID == request.SubjectId &&
                x.IsActive)
            .Select(x => (int?)x.SortOrder)
            .MaxAsync() ?? 0) + 1;

        _context.ExamSubjectComponentHeaders.Add(new ExamSubjectComponentHeader
        {
            ClassID = request.SectionId,
            ExamTypeID = request.ExamTypeId,
            SubjectID = request.SubjectId,
            HeaderName = headerName,
            MaxMarks = request.MaxMarks,
            SortOrder = nextSortOrder,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return await BuildSubjectComponentEntryAsync(request.SectionId, request.ExamTypeId, request.SubjectId, matrix.MissingStudentCount);
    }

    public async Task<ExamSubjectComponentEntryDto?> DeleteSubjectComponentHeaderAsync(
        int sectionId,
        int examTypeId,
        int subjectId,
        int headerId)
    {
        var header = await _context.ExamSubjectComponentHeaders
            .FirstOrDefaultAsync(x =>
                x.ID == headerId &&
                x.ClassID == sectionId &&
                x.ExamTypeID == examTypeId &&
                x.SubjectID == subjectId &&
                x.IsActive);

        if (header == null)
            return null;

        header.IsActive = false;
        header.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await RecalculateSubjectComponentTotalsAsync(sectionId, examTypeId, subjectId);

        return await LoadSubjectComponentEntryAsync(sectionId, examTypeId, subjectId);
    }

    public async Task<ExamSubjectComponentEntryDto?> SaveSubjectComponentMarksAsync(
        SaveExamSubjectComponentMarksRequestDto request)
    {
        var matrix = await LoadExamEntryMatrixAsync(request.SectionId, request.ExamTypeId);
        if (matrix == null)
            return null;

        var headers = await _context.ExamSubjectComponentHeaders
            .Where(x =>
                x.ClassID == request.SectionId &&
                x.ExamTypeID == request.ExamTypeId &&
                x.SubjectID == request.SubjectId &&
                x.IsActive)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.ID)
            .ToListAsync();

        if (headers.Count == 0)
            throw new InvalidOperationException("Add at least one header before saving component marks.");

        if (headers.Any(x => !x.MaxMarks.HasValue || x.MaxMarks.Value <= 0))
            throw new InvalidOperationException("Every active header must have max marks greater than zero.");

        var headerIds = headers.Select(x => x.ID).ToHashSet();
        var examIds = request.Students.Select(x => x.ExamId).Distinct().ToList();
        var exams = await _context.Exams
            .Where(x =>
                x.ClassID == request.SectionId &&
                x.ExamTypeID == request.ExamTypeId &&
                x.SubjectID == request.SubjectId &&
                examIds.Contains(x.ID))
            .ToListAsync();

        var examById = exams.ToDictionary(x => x.ID);
        if (examById.Count != examIds.Count)
            throw new ArgumentException("One or more exam rows were not found.");

        var subjectTotalMarks = exams
            .Select(x => x.TotalMarks ?? 0)
            .Where(x => x > 0)
            .DefaultIfEmpty(0)
            .Max();

        if (subjectTotalMarks <= 0)
            throw new InvalidOperationException("Enter total marks for this subject on Exam Entry before using detailed subject entry.");

        var headerMaxTotal = headers.Sum(x => x.MaxMarks ?? 0);
        if (headerMaxTotal != subjectTotalMarks)
            throw new InvalidOperationException($"Header max total ({headerMaxTotal}) must equal subject total marks ({subjectTotalMarks}) before saving.");

        var existingMarks = await _context.ExamSubjectComponentMarks
            .Where(x => examIds.Contains(x.ExamID) && headerIds.Contains(x.HeaderID))
            .ToListAsync();

        var markByKey = existingMarks.ToDictionary(x => (x.ExamID, x.HeaderID));

        foreach (var student in request.Students)
        {
            if (!examById.TryGetValue(student.ExamId, out var exam))
                continue;

            if (exam.StudentID != student.StudentId)
                throw new ArgumentException("A submitted student does not match its exam row.");

            var cellsByHeader = student.Cells
                .GroupBy(x => x.HeaderId)
                .ToDictionary(g => g.Key, g => g.Last().Marks);

            foreach (var headerId in cellsByHeader.Keys)
            {
                if (!headerIds.Contains(headerId))
                    throw new ArgumentException("A submitted header does not belong to the selected subject.");
            }

            foreach (var header in headers)
            {
                var marks = cellsByHeader.GetValueOrDefault(header.ID, 0);
                if (marks < 0)
                    throw new ArgumentException("Component marks cannot be negative.");

                if (header.MaxMarks.HasValue && marks > header.MaxMarks.Value)
                    throw new ArgumentException($"{header.HeaderName} marks cannot exceed {header.MaxMarks.Value}.");

                if (!markByKey.TryGetValue((student.ExamId, header.ID), out var mark))
                {
                    mark = new ExamSubjectComponentMark
                    {
                        ExamID = student.ExamId,
                        HeaderID = header.ID,
                        CreatedAtUtc = DateTime.UtcNow
                    };
                    _context.ExamSubjectComponentMarks.Add(mark);
                    markByKey[(student.ExamId, header.ID)] = mark;
                }

                mark.Marks = marks;
                mark.UpdatedAtUtc = DateTime.UtcNow;
            }

            var total = headers.Sum(header => cellsByHeader.GetValueOrDefault(header.ID, 0));
            if (total > (exam.TotalMarks ?? 0))
                throw new ArgumentException($"Student {student.StudentId} component total cannot exceed subject total marks.");

            if (total != decimal.Truncate(total))
                throw new ArgumentException($"Student {student.StudentId} component total must be a whole number to save into obtained marks.");

            if (total > 0 || !exam.ObtainedMarks.HasValue || exam.ObtainedMarks.Value == 0)
                exam.ObtainedMarks = (int)total;
        }

        await _context.SaveChangesAsync();

        return await BuildSubjectComponentEntryAsync(request.SectionId, request.ExamTypeId, request.SubjectId, matrix.MissingStudentCount);
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
                var usesGradeDisplay = IsGradingSubject(subjectId, specialSubjects, options);

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
            Gender = student.Gender,
            Address = student.Home_Address ?? student.Family?.HomeAddress,
            ExamTypeName = examTypeName,
            AttendanceRatio = attendanceRatio,
            LongRemarks = GetLongRemarks(grade, student.Gender),
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

    public async Task<IReadOnlyList<StudentResultDto>> GetStudentResultsForClassAsync(
        int sectionId,
        int examTypeId,
        ExamAggregationOptions? options = null)
    {
        options ??= ExamAggregationOptions.Default;

        var sheet = await GetExamMarkSheetAsync(sectionId, examTypeId, options, "regId");
        if (sheet == null)
            return [];

        var studentIds = sheet.Students.Select(x => x.RegId).ToList();
        var students = await _context.Students
            .AsNoTracking()
            .Include(x => x.Family)
            .Include(x => x.Section)
            .Where(x => studentIds.Contains(x.Reg_Id))
            .ToListAsync();

        var studentLookup = students.ToDictionary(x => x.Reg_Id);
        var results = new List<StudentResultDto>();

        foreach (var row in sheet.Students)
        {
            studentLookup.TryGetValue(row.RegId, out var student);
            var subjects = sheet.Subjects
                .Select(column =>
                {
                    var cell = row.SubjectCells.FirstOrDefault(c => c.SubjectId == column.SubjectId);
                    return new StudentSubjectResultDto
                    {
                        SubjectId = column.SubjectId,
                        SubjectName = column.SubjectName,
                        TotalMarks = column.TotalMarks,
                        PassingMarks = column.PassingMarks,
                        ObtainedMarks = cell?.ObtainedMarks ?? 0,
                        Percentage = column.UsesGradeDisplay
                            ? 0
                            : CalculatePercentage(
                                cell?.ObtainedMarks == -1 ? 0 : cell?.ObtainedMarks,
                                column.TotalMarks),
                        UsesGradeDisplay = column.UsesGradeDisplay,
                        SubjectGrade = column.UsesGradeDisplay
                            ? GetSubjectGrade(cell?.ObtainedMarks, column.TotalMarks)
                            : null
                    };
                })
                .Where(x => x.TotalMarks > 0)
                .ToList();

            results.Add(new StudentResultDto
            {
                StudentId = row.RegId,
                ExamTypeId = examTypeId,
                StudentName = student?.FullName ?? row.StudentName,
                FatherName = student?.Family?.FatherName,
                ClassName = student?.Section?.ClassName ?? sheet.ClassName,
                Gender = student?.Gender,
                Address = student?.Home_Address ?? student?.Family?.HomeAddress,
                ExamTypeName = sheet.ExamTypeName,
                AttendanceRatio = row.AttendanceRatio,
                LongRemarks = GetLongRemarks(row.Grade, student?.Gender),
                TotalMarks = row.TotalMarks,
                TotalObtained = row.TotalObtained,
                Percentage = row.Percentage,
                Grade = row.Grade,
                Remarks = row.Remarks,
                Position = row.Position,
                PositionDisplay = row.PositionDisplay,
                Subjects = subjects
            });
        }

        return results;
    }

    public async Task<AcademicProgressCardDto?> GetAcademicProgressCardAsync(
        int studentId,
        ExamAggregationOptions? options = null)
    {
        options ??= ExamAggregationOptions.Default;

        var student = await _context.Students
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Reg_Id == studentId);

        if (student?.ClassCompositeID is not > 0)
            return null;

        var cards = await BuildAcademicProgressCardsAsync(
            student.ClassCompositeID.Value,
            options,
            [studentId]);

        return cards.FirstOrDefault();
    }

    public async Task<IReadOnlyList<AcademicProgressCardDto>> GetAcademicProgressCardsForClassAsync(
        int sectionId,
        ExamAggregationOptions? options = null)
    {
        options ??= ExamAggregationOptions.Default;
        return await BuildAcademicProgressCardsAsync(sectionId, options, null);
    }

    public async Task<ExamTopPositionsDto?> GetTopPositionsAsync(
        int examTypeId,
        int n,
        ExamAggregationOptions? options = null)
    {
        options ??= ExamAggregationOptions.Default;
        if (n <= 0)
            n = 3;

        var examTypeName = await _context.ExamTypes
            .AsNoTracking()
            .Where(x => x.ID == examTypeId)
            .Select(x => x.ExamTypeName)
            .FirstOrDefaultAsync();

        if (examTypeName == null)
            return null;

        var specialSubjects = await GetSpecialSubjectIdsAsync();

        var allExams = await _context.Exams
            .AsNoTracking()
            .Include(x => x.Subject)
            .Where(x => x.ExamTypeID == examTypeId)
            .ToListAsync();

        var students = await _context.Students
            .AsNoTracking()
            .Include(x => x.Family)
            .Include(x => x.Section)
            .Where(x => x.IsActive == true)
            .ToListAsync();

        var sections = await _context.Sections
            .AsNoTracking()
            .Where(x => x.IsActive != false)
            .OrderBy(x => x.Class_ID ?? int.MaxValue)
            .ThenBy(x => x.ClassName)
            .ToListAsync();

        var examsByClass = allExams
            .Where(x => x.ClassID.HasValue)
            .GroupBy(x => x.ClassID!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

        var studentsByClass = students
            .Where(x => x.ClassCompositeID.HasValue)
            .GroupBy(x => x.ClassCompositeID!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

        var groups = new List<ExamTopPositionsClassGroupDto>();

        foreach (var section in sections)
        {
            if (!examsByClass.TryGetValue(section.ID, out var classExams) || classExams.Count == 0)
                continue;

            if (!studentsByClass.TryGetValue(section.ID, out var classStudents) || classStudents.Count == 0)
                continue;

            var subjectColumns = classExams
                .GroupBy(x => x.SubjectID)
                .Select(g =>
                {
                    var subjectId = g.Key ?? 0;
                    return new
                    {
                        SubjectId = subjectId,
                        TotalMarks = GetConfiguredMarks(g.Select(x => x.TotalMarks)),
                        Exclude = ShouldExcludeFromTotals(subjectId, specialSubjects, options)
                    };
                })
                .ToList();

            var examsByStudent = classExams
                .GroupBy(x => x.StudentID)
                .ToDictionary(g => g.Key ?? 0, g => g.ToList());

            var studentTotals = new List<(int StudentId, int TotalObtained, int TotalMarks, int Percentage, ExamTopPositionsStudentDto Row)>();

            foreach (var student in classStudents)
            {
                examsByStudent.TryGetValue(student.Reg_Id, out var studentExams);
                studentExams ??= [];

                var countedExams = studentExams
                    .Where(x => !ShouldExcludeFromTotals(x.SubjectID, specialSubjects, options))
                    .ToList();

                var countedSubjectIds = countedExams
                    .Select(x => x.SubjectID ?? 0)
                    .ToHashSet();

                var totalMarks = subjectColumns
                    .Where(x => countedSubjectIds.Contains(x.SubjectId) && !x.Exclude)
                    .Sum(x => x.TotalMarks);

                var totalObtained = countedExams
                    .Where(x => x.ObtainedMarks > 0)
                    .Sum(x => x.ObtainedMarks ?? 0);

                var percentage = CalculatePercentage(totalObtained, totalMarks);

                studentTotals.Add((
                    student.Reg_Id,
                    totalObtained,
                    totalMarks,
                    percentage,
                    new ExamTopPositionsStudentDto
                    {
                        StudentId = student.Reg_Id,
                        StudentName = student.FullName,
                        FatherName = student.Family?.FatherName,
                        TotalObtained = totalObtained,
                        TotalMarks = totalMarks,
                        Percentage = percentage
                    }));
            }

            var positions = CalculateClassPositions(
                studentTotals.Select(x => (x.StudentId, x.TotalObtained)).ToList());

            var ranked = new List<ExamTopPositionsStudentDto>();
            foreach (var item in studentTotals)
            {
                var position = positions.GetValueOrDefault(item.StudentId, 0);
                if (position <= 0 || position > n || item.Percentage <= 0)
                    continue;

                item.Row.Position = position;
                item.Row.PositionDisplay = FormatPosition(position);
                ranked.Add(item.Row);
            }

            if (ranked.Count == 0)
                continue;

            groups.Add(new ExamTopPositionsClassGroupDto
            {
                SectionId = section.ID,
                ClassCode = section.Class_ID,
                ClassName = section.ClassName,
                Branch = string.IsNullOrWhiteSpace(section.Branch) ? null : section.Branch,
                Students = ranked
                    .OrderBy(x => x.Position)
                    .ThenBy(x => x.StudentId)
                    .ToList()
            });
        }

        return new ExamTopPositionsDto
        {
            ExamTypeId = examTypeId,
            ExamTypeName = examTypeName,
            N = n,
            GeneratedAt = PakistanTime.Now,
            IsJunior = !options.IncludeDrawingInTotals,
            Classes = groups
        };
    }

    public async Task<ExamAwardListRosterDto?> GetAwardListRosterAsync(
        int sectionId,
        int? examTypeId = null)
    {
        var section = await _context.Sections
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == sectionId);

        if (section == null)
            return null;

        string? examTypeName = null;
        if (examTypeId is > 0)
        {
            examTypeName = await _context.ExamTypes
                .AsNoTracking()
                .Where(x => x.ID == examTypeId.Value)
                .Select(x => x.ExamTypeName)
                .FirstOrDefaultAsync();
        }

        var students = await _context.Students
            .AsNoTracking()
            .Where(x => x.ClassCompositeID == sectionId && x.IsActive == true)
            .OrderBy(x => x.Reg_Id)
            .Select(x => new { x.Reg_Id, x.FullName })
            .ToListAsync();

        var roster = students
            .Select((x, index) => new ExamAwardListStudentDto
            {
                Serial = index + 1,
                RegId = x.Reg_Id,
                StudentName = x.FullName
            })
            .ToList();

        return new ExamAwardListRosterDto
        {
            SectionId = sectionId,
            ClassName = section.ClassName,
            ExamTypeId = examTypeId,
            ExamTypeName = examTypeName,
            SessionYear = PakistanTime.Today.Year,
            Students = roster
        };
    }

    public async Task<IReadOnlyList<ExamAwardListSubjectColumnDto>> GetClassAwardListSubjectsAsync(int sectionId)
    {
        var rows = await _context.SubjectClasswises
            .AsNoTracking()
            .Include(x => x.Subject)
            .Where(x => x.ClassID == sectionId && x.SubjectID != null)
            .OrderBy(x => x.ID)
            .ToListAsync();

        return rows
            .GroupBy(x => x.SubjectID!.Value)
            .Select(g =>
            {
                var subject = g.First().Subject;
                var name = subject?.SubjectName ?? subject?.ShortName ?? "Subject";
                return new ExamAwardListSubjectColumnDto
                {
                    SubjectId = g.Key,
                    SubjectName = name,
                    ShortName = string.IsNullOrWhiteSpace(subject?.ShortName) ? name : subject!.ShortName
                };
            })
            .ToList();
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
                var totalMarks = GetConfiguredMarks(g.Select(x => x.TotalMarks));
                return new ExamMarkSheetSubjectColumnDto
                {
                    SubjectId = subjectId,
                    SubjectName = sample.Subject?.SubjectName ?? sample.Subject?.ShortName ?? "Subject",
                    ShortName = sample.Subject?.ShortName ?? sample.Subject?.SubjectName ?? "Sub",
                    UsesGradeDisplay = IsGradingSubject(subjectId, specialSubjects, options),
                    TotalMarks = totalMarks,
                    PassingMarks = GetConfiguredMarks(g.Select(x => x.PassingMarks)),
                    MaxMarks = GetColumnMaxMarks(g)
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

            var countedSubjectIds = countedExams
                .Select(x => x.SubjectID ?? 0)
                .ToHashSet();

            var totalMarks = subjectColumns
                .Where(x => countedSubjectIds.Contains(x.SubjectId))
                .Where(x => !ShouldExcludeFromTotals(x.SubjectId, specialSubjects, options))
                .Sum(x => x.TotalMarks);

            var totalObtained = countedExams
                .Where(x => x.ObtainedMarks > 0)
                .Sum(x => x.ObtainedMarks ?? 0);

            var percentage = CalculatePercentage(totalObtained, totalMarks);
            var grade = GetGrade(percentage);

            var examLookup = studentExams.ToDictionary(x => x.SubjectID ?? 0);
            var subjectCells = subjectColumns.Select(column =>
            {
                examLookup.TryGetValue(column.SubjectId, out var examRow);
                return BuildSubjectCell(examRow, column.SubjectId, column.TotalMarks, specialSubjects, options);
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

    public async Task<ExamTeacherAnalysisDto?> GetTeacherExamAnalysisAsync(
        int sectionId,
        int employeeId,
        int examTypeId,
        ExamAggregationOptions? options = null)
    {
        options ??= ExamAggregationOptions.Default;

        var section = await _context.Sections
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == sectionId);

        if (section == null)
            return null;

        var employee = await _context.Employees
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == employeeId && x.IsActive != false);

        if (employee == null)
            return null;

        var examTypeName = await _context.ExamTypes
            .AsNoTracking()
            .Where(x => x.ID == examTypeId)
            .Select(x => x.ExamTypeName)
            .FirstOrDefaultAsync();

        var assignments = await _context.EmployeeClasses
            .AsNoTracking()
            .Include(x => x.Subject)
            .Where(x =>
                x.EmpID == employeeId &&
                x.ClassID == sectionId &&
                x.SubjectID != null)
            .GroupBy(x => x.SubjectID)
            .Select(g => g
                .OrderBy(x => x.ID)
                .First())
            .ToListAsync();

        if (assignments.Count == 0)
            return null;

        var subjectIds = assignments
            .Select(x => x.SubjectID!.Value)
            .ToHashSet();

        var specialSubjects = await GetSpecialSubjectIdsAsync();

        var allExams = await _context.Exams
            .AsNoTracking()
            .Include(x => x.Subject)
            .Where(x =>
                x.ClassID == sectionId &&
                x.ExamTypeID == examTypeId &&
                x.SubjectID != null &&
                subjectIds.Contains(x.SubjectID.Value))
            .ToListAsync();

        var studentLookup = await _context.Students
            .AsNoTracking()
            .Where(x => x.ClassCompositeID == sectionId && x.IsActive == true)
            .ToDictionaryAsync(x => x.Reg_Id, x => x.FullName ?? $"Student {x.Reg_Id}");

        var subjectRows = assignments
            .OrderBy(x => x.Subject?.SubjectName ?? x.Subject?.ShortName ?? string.Empty)
            .Select(assignment =>
            {
                var subjectId = assignment.SubjectID!.Value;
                var subjectExams = allExams
                    .Where(x => x.SubjectID == subjectId)
                    .ToList();

                var totalMarks = GetConfiguredMarks(subjectExams.Select(x => x.TotalMarks));
                var validRows = subjectExams
                    .Where(x => x.ObtainedMarks != -1 && x.ObtainedMarks.HasValue)
                    .ToList();

                var maxRow = validRows
                    .OrderByDescending(x => x.ObtainedMarks ?? 0)
                    .ThenBy(x => x.StudentID ?? int.MaxValue)
                    .FirstOrDefault();

                var minRow = validRows
                    .OrderBy(x => x.ObtainedMarks ?? 0)
                    .ThenBy(x => x.StudentID ?? int.MaxValue)
                    .FirstOrDefault();

                return new ExamTeacherAnalysisSubjectRowDto
                {
                    SubjectId = subjectId,
                    SubjectName = assignment.Subject?.SubjectName ?? assignment.Subject?.ShortName ?? "Subject",
                    ShortName = assignment.Subject?.ShortName ?? assignment.Subject?.SubjectName ?? "Sub",
                    UsesGradeDisplay = IsGradingSubject(subjectId, specialSubjects, options),
                    Percentage = CalculateSubjectClassAverage(allExams, subjectId, totalMarks),
                    Max = BuildExtremumDto(maxRow, studentLookup),
                    Min = BuildExtremumDto(minRow, studentLookup)
                };
            })
            .ToList();

        return new ExamTeacherAnalysisDto
        {
            SectionId = sectionId,
            ClassName = section.ClassName,
            EmployeeId = employeeId,
            EmployeeName = employee.EmployeeName,
            ExamTypeId = examTypeId,
            ExamTypeName = examTypeName,
            Subjects = subjectRows
        };
    }

    public async Task<ExamTeacherPerformanceGridDto?> GetTeacherPerformanceGridAsync(
        int employeeId,
        ExamAggregationOptions? options = null)
    {
        options ??= ExamAggregationOptions.Default;

        var employee = await _context.Employees
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == employeeId && x.IsActive != false);

        if (employee == null)
            return null;

        var assignments = await _context.EmployeeClasses
            .AsNoTracking()
            .Include(x => x.Section)
            .Include(x => x.Subject)
            .Where(x =>
                x.EmpID == employeeId &&
                x.ClassID != null &&
                x.SubjectID != null)
            .GroupBy(x => new { ClassId = x.ClassID!.Value, SubjectId = x.SubjectID!.Value })
            .Select(g => g
                .OrderBy(x => x.ID)
                .First())
            .ToListAsync();

        if (assignments.Count == 0)
            return null;

        var columns = assignments
            .OrderBy(x => x.Section?.ClassName ?? string.Empty)
            .ThenBy(x => x.Subject?.SubjectName ?? x.Subject?.ShortName ?? string.Empty)
            .Select(x =>
            {
                var classId = x.ClassID!.Value;
                var subjectId = x.SubjectID!.Value;

                return new ExamTeacherPerformanceColumnDto
                {
                    Key = BuildPerformanceColumnKey(classId, subjectId),
                    ClassId = classId,
                    ClassName = FormatClassName(x.Section?.ClassName, x.Section?.SectionName),
                    SubjectId = subjectId,
                    SubjectName = x.Subject?.SubjectName ?? x.Subject?.ShortName ?? "Subject"
                };
            })
            .ToList();

        var classIds = columns.Select(x => x.ClassId).ToHashSet();
        var subjectIds = columns.Select(x => x.SubjectId).ToHashSet();

        var examTypes = await _context.ExamTypes
            .AsNoTracking()
            .Where(x => x.IsActive != false)
            .OrderBy(x => x.Priority ?? int.MaxValue)
            .ThenBy(x => x.ID)
            .Take(5)
            .Select(x => new { x.ID, x.ExamTypeName })
            .ToListAsync();

        var examTypeIds = examTypes.Select(x => x.ID).ToHashSet();

        var allExams = await _context.Exams
            .AsNoTracking()
            .Where(x =>
                x.ClassID != null &&
                x.SubjectID != null &&
                x.ExamTypeID != null &&
                classIds.Contains(x.ClassID.Value) &&
                subjectIds.Contains(x.SubjectID.Value) &&
                examTypeIds.Contains(x.ExamTypeID.Value))
            .ToListAsync();

        var rows = examTypes
            .Select(examType => new ExamTeacherPerformanceRowDto
            {
                ExamTypeId = examType.ID,
                ExamTypeName = examType.ExamTypeName,
                Cells = columns
                    .Select(column =>
                    {
                        var cellExams = allExams
                            .Where(x =>
                                x.ExamTypeID == examType.ID &&
                                x.ClassID == column.ClassId &&
                                x.SubjectID == column.SubjectId)
                            .ToList();

                        var totalMarks = GetConfiguredMarks(cellExams.Select(x => x.TotalMarks));
                        var percentage = cellExams.Count == 0 || totalMarks <= 0
                            ? (int?)null
                            : CalculateSubjectClassAverage(cellExams, column.SubjectId, totalMarks);

                        return new ExamTeacherPerformanceCellDto
                        {
                            ColumnKey = column.Key,
                            Percentage = percentage
                        };
                    })
                    .ToList()
            })
            .ToList();

        return new ExamTeacherPerformanceGridDto
        {
            EmployeeId = employeeId,
            EmployeeName = employee.EmployeeName,
            Columns = columns,
            Rows = rows
        };
    }

    private async Task<bool> ExamEntryScopeExistsAsync(int sectionId, int examTypeId)
    {
        var sectionExists = await _context.Sections
            .AsNoTracking()
            .AnyAsync(x => x.ID == sectionId);

        if (!sectionExists)
            return false;

        return await _context.ExamTypes
            .AsNoTracking()
            .AnyAsync(x => x.ID == examTypeId);
    }

    private async Task<bool> InitializeExamEntryMatrixIfEmptyAsync(int sectionId, int examTypeId)
    {
        var hasRows = await _context.Exams
            .AsNoTracking()
            .AnyAsync(x => x.ClassID == sectionId && x.ExamTypeID == examTypeId);

        if (hasRows)
            return false;

        var subjectIds = await _context.SubjectClasswises
            .AsNoTracking()
            .Where(x => x.ClassID == sectionId && x.SubjectID != null)
            .OrderBy(x => x.ID)
            .Select(x => x.SubjectID!.Value)
            .Distinct()
            .ToListAsync();

        var students = await _context.Students
            .AsNoTracking()
            .Where(x => x.ClassCompositeID == sectionId && x.IsActive == true)
            .OrderBy(x => x.Reg_Id)
            .Select(x => new { x.Reg_Id, x.ClassCompositeID })
            .ToListAsync();

        if (subjectIds.Count == 0 || students.Count == 0)
            return false;

        foreach (var student in students)
        {
            foreach (var subjectId in subjectIds)
            {
                _context.Exams.Add(new Infrastructure.Entities.Exam
                {
                    ExamTypeID = examTypeId,
                    SubjectID = subjectId,
                    TotalMarks = 0,
                    PassingMarks = 0,
                    ObtainedMarks = 0,
                    MaxMarks = 0,
                    StudentID = student.Reg_Id,
                    ClassID = student.ClassCompositeID,
                    AttendanceRatio = "-/-"
                });
            }
        }

        await _context.SaveChangesAsync();
        return true;
    }

    private async Task<ExamEntryMatrixDto?> BuildExamEntryMatrixAsync(
        int sectionId,
        int examTypeId,
        bool wasInitialized = false)
    {
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

        if (examTypeName == null)
            return null;

        var allExams = await _context.Exams
            .AsNoTracking()
            .Include(x => x.Subject)
            .Where(x => x.ClassID == sectionId && x.ExamTypeID == examTypeId)
            .ToListAsync();

        var subjectColumns = allExams
            .Where(x => x.SubjectID != null)
            .GroupBy(x => x.SubjectID!.Value)
            .Select(g =>
            {
                var sample = g.First();
                return new ExamEntrySubjectColumnDto
                {
                    SubjectId = g.Key,
                    SubjectName = sample.Subject?.SubjectName ?? sample.Subject?.ShortName ?? "Subject",
                    ShortName = sample.Subject?.ShortName ?? sample.Subject?.SubjectName ?? "Sub",
                    TotalMarks = GetConfiguredMarks(g.Select(x => x.TotalMarks)),
                    PassingMarks = GetConfiguredMarks(g.Select(x => x.PassingMarks))
                };
            })
            .OrderBy(x => x.SubjectName)
            .ToList();

        var examStudentIds = allExams
            .Where(x => x.StudentID != null)
            .Select(x => x.StudentID!.Value)
            .Distinct()
            .ToList();

        var studentLookup = await _context.Students
            .AsNoTracking()
            .Where(x => examStudentIds.Contains(x.Reg_Id))
            .ToDictionaryAsync(x => x.Reg_Id);

        var activeStudents = await _context.Students
            .AsNoTracking()
            .Where(x => x.ClassCompositeID == sectionId && x.IsActive == true)
            .OrderBy(x => x.Reg_Id)
            .Select(x => new { x.Reg_Id, x.FullName })
            .ToListAsync();

        var examStudentIdSet = examStudentIds.ToHashSet();
        var missingStudents = activeStudents
            .Where(x => !examStudentIdSet.Contains(x.Reg_Id))
            .Select(x => new ExamEntryMissingStudentDto
            {
                RegId = x.Reg_Id,
                StudentName = x.FullName
            })
            .ToList();

        var rows = new List<ExamEntryStudentRowDto>();
        var examsByStudent = allExams
            .Where(x => x.StudentID != null)
            .GroupBy(x => x.StudentID!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

        var serial = 1;
        foreach (var studentId in examStudentIds.OrderBy(x => x))
        {
            examsByStudent.TryGetValue(studentId, out var studentExams);
            studentExams ??= new List<Infrastructure.Entities.Exam>();
            studentLookup.TryGetValue(studentId, out var student);

            var examLookup = studentExams
                .Where(x => x.SubjectID != null)
                .GroupBy(x => x.SubjectID!.Value)
                .ToDictionary(g => g.Key, g => g.First());

            var cells = subjectColumns
                .Select(subject =>
                {
                    examLookup.TryGetValue(subject.SubjectId, out var exam);
                    return new ExamEntryCellDto
                    {
                        ExamId = exam?.ID ?? 0,
                        SubjectId = subject.SubjectId,
                        ObtainedMarks = exam?.ObtainedMarks,
                        DisplayValue = FormatMarkSheetCellValue(exam?.ObtainedMarks, false, subject.TotalMarks)
                    };
                })
                .ToList();

            rows.Add(new ExamEntryStudentRowDto
            {
                Serial = serial++,
                RegId = studentId,
                StudentName = student?.FullName ?? $"Student {studentId}",
                AttendanceRatio = studentExams
                    .Select(x => x.AttendanceRatio)
                    .FirstOrDefault(x => !string.IsNullOrWhiteSpace(x)),
                TotalObtained = studentExams
                    .Where(x => x.ObtainedMarks > 0)
                    .Sum(x => x.ObtainedMarks ?? 0),
                Cells = cells
            });
        }

        return new ExamEntryMatrixDto
        {
            SectionId = sectionId,
            ClassName = section.ClassName,
            ExamTypeId = examTypeId,
            ExamTypeName = examTypeName,
            WasInitialized = wasInitialized,
            MissingStudentCount = missingStudents.Count,
            MissingStudents = missingStudents,
            GrandTotalMarks = subjectColumns.Sum(x => x.TotalMarks),
            Subjects = subjectColumns,
            Students = rows
        };
    }

    private async Task<ExamSubjectComponentEntryDto?> BuildSubjectComponentEntryAsync(
        int sectionId,
        int examTypeId,
        int subjectId,
        int missingStudentCount = 0)
    {
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

        if (examTypeName == null)
            return null;

        var subject = await _context.SubjectMasters
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == subjectId);

        if (subject == null)
            return null;

        var exams = await _context.Exams
            .AsNoTracking()
            .Include(x => x.Student)
            .Where(x =>
                x.ClassID == sectionId &&
                x.ExamTypeID == examTypeId &&
                x.SubjectID == subjectId &&
                x.StudentID != null)
            .OrderBy(x => x.StudentID)
            .ToListAsync();

        if (exams.Count == 0)
            return null;

        var headers = await _context.ExamSubjectComponentHeaders
            .AsNoTracking()
            .Where(x =>
                x.ClassID == sectionId &&
                x.ExamTypeID == examTypeId &&
                x.SubjectID == subjectId &&
                x.IsActive)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.ID)
            .Select(x => new ExamSubjectComponentHeaderDto
            {
                HeaderId = x.ID,
                HeaderName = x.HeaderName,
                MaxMarks = x.MaxMarks,
                SortOrder = x.SortOrder
            })
            .ToListAsync();

        var examIds = exams.Select(x => x.ID).ToList();
        var headerIds = headers.Select(x => x.HeaderId).ToList();
        var marks = await _context.ExamSubjectComponentMarks
            .AsNoTracking()
            .Where(x => examIds.Contains(x.ExamID) && headerIds.Contains(x.HeaderID))
            .ToListAsync();

        var markLookup = marks.ToDictionary(x => (x.ExamID, x.HeaderID), x => x.Marks);
        var totalMarks = GetConfiguredMarks(exams.Select(x => x.TotalMarks));
        var passingMarks = GetConfiguredMarks(exams.Select(x => x.PassingMarks));

        var serial = 1;
        var rows = exams.Select(exam =>
        {
            var cells = headers
                .Select(header => new ExamSubjectComponentCellDto
                {
                    HeaderId = header.HeaderId,
                    Marks = markLookup.GetValueOrDefault((exam.ID, header.HeaderId), 0)
                })
                .ToList();

            return new ExamSubjectComponentStudentRowDto
            {
                ExamId = exam.ID,
                Serial = serial++,
                RegId = exam.StudentID ?? 0,
                StudentName = exam.Student?.FullName ?? $"Student {exam.StudentID}",
                ExistingObtainedMarks = exam.ObtainedMarks ?? 0,
                ComponentTotal = cells.Sum(x => x.Marks),
                Cells = cells
            };
        }).ToList();

        return new ExamSubjectComponentEntryDto
        {
            SectionId = sectionId,
            ClassName = section.ClassName,
            ExamTypeId = examTypeId,
            ExamTypeName = examTypeName,
            SubjectId = subjectId,
            SubjectName = subject.SubjectName,
            SubjectShortName = subject.ShortName,
            TotalMarks = totalMarks,
            PassingMarks = passingMarks,
            MissingStudentCount = missingStudentCount,
            Headers = headers,
            Students = rows
        };
    }

    private async Task RecalculateSubjectComponentTotalsAsync(
        int sectionId,
        int examTypeId,
        int subjectId)
    {
        var headers = await _context.ExamSubjectComponentHeaders
            .AsNoTracking()
            .Where(x =>
                x.ClassID == sectionId &&
                x.ExamTypeID == examTypeId &&
                x.SubjectID == subjectId &&
                x.IsActive)
            .Select(x => x.ID)
            .ToListAsync();

        var exams = await _context.Exams
            .Where(x =>
                x.ClassID == sectionId &&
                x.ExamTypeID == examTypeId &&
                x.SubjectID == subjectId)
            .ToListAsync();

        var examIds = exams.Select(x => x.ID).ToList();
        var marks = await _context.ExamSubjectComponentMarks
            .AsNoTracking()
            .Where(x => examIds.Contains(x.ExamID) && headers.Contains(x.HeaderID))
            .ToListAsync();

        var totals = marks
            .GroupBy(x => x.ExamID)
            .ToDictionary(x => x.Key, x => x.Sum(mark => mark.Marks));

        foreach (var exam in exams)
        {
            var total = totals.GetValueOrDefault(exam.ID, 0);
            if (total == decimal.Truncate(total) &&
                (total > 0 || !exam.ObtainedMarks.HasValue || exam.ObtainedMarks.Value == 0))
            {
                exam.ObtainedMarks = (int)total;
            }
        }

        await _context.SaveChangesAsync();
    }

    private static bool IsValidAttendanceRatio(string ratio)
    {
        if (string.IsNullOrWhiteSpace(ratio))
            return false;

        var parts = ratio.Split('/');

        if (parts.Length != 2)
            return false;

        return int.TryParse(parts[0], out var present) &&
               int.TryParse(parts[1], out var total) &&
               present >= 0 &&
               total >= 0 &&
               present <= total;
    }

    private static ExamMarkSheetSubjectCellDto BuildSubjectCell(
        Infrastructure.Entities.Exam? examRow,
        int subjectId,
        int totalMarks,
        (int? DrawingId, int? StempId) specialSubjects,
        ExamAggregationOptions options)
    {
        var usesGradeDisplay = IsGradingSubject(subjectId, specialSubjects, options);

        if (examRow == null)
        {
            return new ExamMarkSheetSubjectCellDto
            {
                SubjectId = subjectId,
                ObtainedMarks = 0,
                UsesGradeDisplay = usesGradeDisplay,
                DisplayValue = usesGradeDisplay ? "-" : "0"
            };
        }

        var obtained = examRow.ObtainedMarks;

        return new ExamMarkSheetSubjectCellDto
        {
            SubjectId = subjectId,
            ObtainedMarks = obtained,
            UsesGradeDisplay = usesGradeDisplay,
            DisplayValue = FormatMarkSheetCellValue(obtained, usesGradeDisplay, totalMarks)
        };
    }

    private static ExamTeacherAnalysisExtremumDto? BuildExtremumDto(
        Infrastructure.Entities.Exam? examRow,
        IReadOnlyDictionary<int, string> studentLookup)
    {
        if (examRow?.ObtainedMarks is null || !examRow.StudentID.HasValue)
            return null;

        var studentId = examRow.StudentID.Value;

        return new ExamTeacherAnalysisExtremumDto
        {
            ObtainedMarks = examRow.ObtainedMarks.Value,
            StudentId = studentId,
            StudentName = studentLookup.GetValueOrDefault(studentId, $"Student {studentId}")
        };
    }

    private static string BuildPerformanceColumnKey(int classId, int subjectId) => $"{classId}:{subjectId}";

    private static string FormatClassName(string? className, string? sectionName)
    {
        var normalizedClassName = className?.Trim();
        var normalizedSectionName = sectionName?.Trim();

        if (string.IsNullOrWhiteSpace(normalizedSectionName))
            return normalizedClassName ?? string.Empty;

        if (string.IsNullOrWhiteSpace(normalizedClassName))
            return normalizedSectionName;

        if (string.Equals(normalizedClassName, normalizedSectionName, StringComparison.OrdinalIgnoreCase))
            return normalizedClassName;

        return $"{normalizedClassName}-{normalizedSectionName}";
    }

    private static int GetConfiguredMarks(IEnumerable<int?> values)
    {
        return values
            .Select(x => x ?? 0)
            .Where(x => x > 0)
            .DefaultIfEmpty(0)
            .Max();
    }

    private static int GetColumnMaxMarks(IEnumerable<Infrastructure.Entities.Exam> rows)
    {
        var rowList = rows.ToList();
        var configuredMax = GetConfiguredMarks(rowList.Select(x => x.MaxMarks));

        if (configuredMax > 0)
            return configuredMax;

        return rowList
            .Where(x => x.ObtainedMarks != -1)
            .Select(x => x.ObtainedMarks ?? 0)
            .Where(x => x > 0)
            .DefaultIfEmpty(0)
            .Max();
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

    private static bool IsGradingSubject(
        int subjectId,
        (int? DrawingId, int? StempId) specialSubjects,
        ExamAggregationOptions options)
    {
        if (specialSubjects.DrawingId.HasValue && subjectId == specialSubjects.DrawingId.Value)
            return !options.IncludeDrawingInTotals;

        if (specialSubjects.StempId.HasValue && subjectId == specialSubjects.StempId.Value)
            return !options.IncludeStempInTotals;

        return false;
    }

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

    private async Task<List<AcademicProgressCardDto>> BuildAcademicProgressCardsAsync(
        int sectionId,
        ExamAggregationOptions options,
        IReadOnlyList<int>? studentIds)
    {
        var examTypes = (await GetExamTypesAsync()).Take(5).ToList();

        var section = await _context.Sections
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == sectionId);

        if (section == null)
            return [];

        var specialSubjects = await GetSpecialSubjectIdsAsync();
        var examTypeIds = examTypes.Select(x => x.Id).ToList();
        var sessionLabel = $"{PakistanTime.Today.Year}-{PakistanTime.Today.Year + 1}";
        var isJunior = !options.IncludeDrawingInTotals;

        var studentQuery = _context.Students
            .AsNoTracking()
            .Include(x => x.Family)
            .Include(x => x.Section)
            .Where(x => x.ClassCompositeID == sectionId);

        if (studentIds is { Count: > 0 })
        {
            studentQuery = studentQuery.Where(x => studentIds.Contains(x.Reg_Id));
        }
        else
        {
            studentQuery = studentQuery.Where(x => x.IsActive == true);
        }

        var cardStudents = await studentQuery
            .OrderBy(x => x.Reg_Id)
            .ToListAsync();

        if (cardStudents.Count == 0)
            return [];

        var classmates = await _context.Students
            .AsNoTracking()
            .Where(x => x.ClassCompositeID == sectionId && x.IsActive == true)
            .Select(x => x.Reg_Id)
            .ToListAsync();

        var classExams = await _context.Exams
            .AsNoTracking()
            .Include(x => x.Subject)
            .Where(x => x.ClassID == sectionId && examTypeIds.Contains(x.ExamTypeID ?? 0))
            .ToListAsync();

        var classSubjects = await _context.SubjectClasswises
            .AsNoTracking()
            .Include(x => x.Subject)
            .Where(x => x.ClassID == sectionId && x.SubjectID != null)
            .ToListAsync();

        var subjectRows = classSubjects
            .GroupBy(x => x.SubjectID!.Value)
            .Select(g =>
            {
                var sample = g.First();
                return new
                {
                    SubjectId = g.Key,
                    SubjectName = sample.Subject?.SubjectName ?? sample.Subject?.ShortName ?? "Subject"
                };
            })
            .ToList();

        if (subjectRows.Count == 0)
        {
            subjectRows = classExams
                .Where(x => x.SubjectID.HasValue)
                .GroupBy(x => x.SubjectID!.Value)
                .Select(g => new
                {
                    SubjectId = g.Key,
                    SubjectName = g.First().Subject?.SubjectName ?? g.First().Subject?.ShortName ?? "Subject"
                })
                .ToList();
        }

        var orderedSubjects = subjectRows
            .Where(x =>
                x.SubjectId != specialSubjects.StempId &&
                (!isJunior || x.SubjectId != specialSubjects.DrawingId))
            .OrderBy(x => x.SubjectName)
            .ToList();

        if (isJunior && specialSubjects.DrawingId is int drawingId)
        {
            var drawing = subjectRows.FirstOrDefault(x => x.SubjectId == drawingId)
                ?? new { SubjectId = drawingId, SubjectName = "Drawing" };
            if (orderedSubjects.All(x => x.SubjectId != drawingId))
                orderedSubjects.Add(drawing);
        }

        if (specialSubjects.StempId is int stempId)
        {
            var stemp = subjectRows.FirstOrDefault(x => x.SubjectId == stempId)
                ?? new { SubjectId = stempId, SubjectName = "Stemp" };
            if (orderedSubjects.All(x => x.SubjectId != stempId))
                orderedSubjects.Add(stemp);
        }

        var examLookup = classExams
            .Where(x => x.StudentID.HasValue && x.ExamTypeID.HasValue && x.SubjectID.HasValue)
            .GroupBy(x => (x.StudentID!.Value, x.ExamTypeID!.Value, x.SubjectID!.Value))
            .ToDictionary(g => g.Key, g => g.First());

        var positionsByExamType = new Dictionary<int, Dictionary<int, int>>();
        foreach (var examType in examTypes)
        {
            var totals = new List<(int StudentId, int Total)>();
            foreach (var classmateId in classmates)
            {
                var rows = classExams
                    .Where(x =>
                        x.StudentID == classmateId &&
                        x.ExamTypeID == examType.Id &&
                        x.ObtainedMarks > 0 &&
                        !ShouldExcludeFromTotals(x.SubjectID, specialSubjects, options))
                    .ToList();

                totals.Add((classmateId, rows.Sum(x => x.ObtainedMarks ?? 0)));
            }

            positionsByExamType[examType.Id] = CalculateClassPositions(totals);
        }

        var examTypeColumns = examTypes
            .Select(x => new AcademicProgressExamTypeColumnDto
            {
                ExamTypeId = x.Id,
                ExamTypeName = x.Name
            })
            .ToList();

        var cards = new List<AcademicProgressCardDto>();

        foreach (var student in cardStudents)
        {
            var subjects = orderedSubjects.Select(subject =>
            {
                var usesGrade = IsGradingSubject(subject.SubjectId, specialSubjects, options);
                var cells = examTypes.Select(examType =>
                {
                    examLookup.TryGetValue(
                        (student.Reg_Id, examType.Id, subject.SubjectId),
                        out var examRow);

                    var totalMarks = examRow?.TotalMarks ?? 0;
                    var obtained = examRow?.ObtainedMarks;
                    var hasMarks = totalMarks > 0;

                    string? displayTotal = null;
                    string? displayObtained = null;
                    if (hasMarks)
                    {
                        if (usesGrade)
                        {
                            displayTotal = "Grade";
                            displayObtained = GetSubjectGrade(obtained, totalMarks);
                        }
                        else
                        {
                            displayTotal = totalMarks.ToString();
                            displayObtained = obtained == -1 ? "A" : (obtained ?? 0).ToString();
                        }
                    }

                    return new AcademicProgressCellDto
                    {
                        ExamTypeId = examType.Id,
                        TotalMarks = totalMarks,
                        ObtainedMarks = obtained,
                        DisplayTotal = displayTotal,
                        DisplayObtained = displayObtained,
                        HasMarks = hasMarks
                    };
                }).ToList();

                return new AcademicProgressSubjectRowDto
                {
                    SubjectId = subject.SubjectId,
                    SubjectName = subject.SubjectName,
                    UsesGradeDisplay = usesGrade,
                    Cells = cells
                };
            }).ToList();

            var summaries = examTypes.Select(examType =>
            {
                var studentExams = classExams
                    .Where(x => x.StudentID == student.Reg_Id && x.ExamTypeID == examType.Id)
                    .ToList();

                var counted = studentExams
                    .Where(x => !ShouldExcludeFromTotals(x.SubjectID, specialSubjects, options))
                    .ToList();

                var totalMarks = counted.Sum(x => x.TotalMarks ?? 0);
                var totalObtained = counted
                    .Where(x => x.ObtainedMarks != -1)
                    .Sum(x => x.ObtainedMarks ?? 0);
                var percentage = CalculatePercentage(totalObtained, totalMarks);
                var grade = GetGrade(percentage);
                var hasResult = totalMarks > 0;
                var position = positionsByExamType
                    .GetValueOrDefault(examType.Id)
                    ?.GetValueOrDefault(student.Reg_Id, 0) ?? 0;

                return new AcademicProgressExamSummaryDto
                {
                    ExamTypeId = examType.Id,
                    TotalMarks = totalMarks,
                    TotalObtained = totalObtained,
                    Percentage = percentage,
                    Grade = hasResult ? grade : "-",
                    Remarks = hasResult ? GetRemarks(grade) : "-",
                    LongRemarks = hasResult ? GetLongRemarks(grade, student.Gender) : "-",
                    Position = position,
                    PositionDisplay = hasResult ? FormatPosition(position) : "-",
                    AttendanceRatio = studentExams
                        .Select(x => x.AttendanceRatio)
                        .FirstOrDefault(x => !string.IsNullOrWhiteSpace(x) && x != "-/-"),
                    HasResult = hasResult
                };
            }).ToList();

            cards.Add(new AcademicProgressCardDto
            {
                StudentId = student.Reg_Id,
                StudentName = student.FullName,
                FatherName = student.Family?.FatherName,
                ClassName = student.Section?.ClassName ?? section.ClassName,
                Address = student.Home_Address ?? student.Family?.HomeAddress,
                Gender = student.Gender,
                SessionLabel = sessionLabel,
                IssueDate = PakistanTime.Today.ToDateTime(TimeOnly.MinValue),
                IsJunior = isJunior,
                ExamTypes = examTypeColumns,
                Subjects = subjects,
                ExamSummaries = summaries
            });
        }

        return cards;
    }

    private static string GetLongRemarks(string? grade, string? gender)
    {
        if (string.IsNullOrWhiteSpace(grade) || grade == "-")
            return "-";

        var isMale = (gender ?? "").Trim().StartsWith("M", StringComparison.OrdinalIgnoreCase);

        var heSmall = isMale ? "he" : "she";
        var heCapital = isMale ? "He" : "She";
        var hisSmall = isMale ? "his" : "her";
        var hisCapital = isMale ? "His" : "Her";
        var himself = isMale ? "himself" : "herself";

        return grade switch
        {
            "A++" => $"{hisCapital} performance has been outstanding. Well done. Keep it up.",
            "A+" => $"{heCapital} has shown excellent result. {heCapital} may show outstanding result with a little more effort.",
            "A" => $"{hisCapital} performance has been very good. Certainly, {heSmall} may improve with more efforts.",
            "B" => $"{heCapital} has shown a good result. {heCapital} is advised to show more interest to improve {himself}.",
            "C" => $"{hisCapital} performance has been average. It is hoped that {heSmall} can improve with more efforts.",
            "D" => $"With more hard work {heSmall} can make {hisSmall} position better in future.",
            "E" => $"{hisCapital} performance has been weak. {heCapital} will have to work very hard to be a successful student.",
            "F" => $"{heCapital} is advised to work pretty hard so that {heSmall} may continue {hisSmall} education.",
            _ => "-"
        };
    }
}
