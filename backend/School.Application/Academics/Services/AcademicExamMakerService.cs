using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using School.Application.Academics.DTOs;
using School.Application.Academics.Interfaces;
using School.Infrastructure.Academics.Data;
using School.Infrastructure.Academics.Entities;
using School.Infrastructure.Academics.Repositories;
using System.Globalization;
using System.Text.Json;

namespace School.Application.Academics.Services;

public class AcademicExamMakerService : IAcademicExamMakerService
{
    private readonly AcademicContext _academicContext;
    private readonly IExamTitleRepository _examTitleRepository;
    private readonly ILogger<AcademicExamMakerService> _logger;

    public AcademicExamMakerService(
        AcademicContext academicContext,
        IExamTitleRepository examTitleRepository,
        ILogger<AcademicExamMakerService> logger)
    {
        _academicContext = academicContext;
        _examTitleRepository = examTitleRepository;
        _logger = logger;
    }

    public async Task<List<QuestionCatalogDto>> GetQuestionPoolAsync(
        int classId,
        int subjectId,
        List<int>? chapterIds = null,
        string? searchText = null,
        string? type = null,
        string? category = null,
        int take = 120)
    {
        var query = _academicContext.QuestionsCatalog
            .AsNoTracking()
            .Include(x => x.Chapter)
            .Where(x => x.Chapter != null && x.Chapter.ClassId == classId && x.Chapter.SubjectId == subjectId);

        if (chapterIds is { Count: > 0 })
        {
            query = query.Where(x => chapterIds.Contains(x.ChapterId));
        }

        var normalizedType = type?.Trim().ToLowerInvariant();
        if (!string.IsNullOrWhiteSpace(normalizedType) && normalizedType != "all")
        {
            query = query.Where(x => x.Type == normalizedType);
        }

        var normalizedCategory = category?.Trim().ToLowerInvariant();
        if (!string.IsNullOrWhiteSpace(normalizedCategory) && normalizedCategory != "all")
        {
            query = query.Where(x => x.Category == normalizedCategory);
        }

        var normalizedSearch = searchText?.Trim();
        if (!string.IsNullOrWhiteSpace(normalizedSearch))
        {
            query = query.Where(x =>
                EF.Functions.Like(x.DescriptionText, $"%{normalizedSearch}%") ||
                EF.Functions.Like(x.McqOpt1 ?? string.Empty, $"%{normalizedSearch}%") ||
                EF.Functions.Like(x.McqOpt2 ?? string.Empty, $"%{normalizedSearch}%") ||
                EF.Functions.Like(x.McqOpt3 ?? string.Empty, $"%{normalizedSearch}%") ||
                EF.Functions.Like(x.McqOpt4 ?? string.Empty, $"%{normalizedSearch}%"));
        }

        var safeTake = Math.Clamp(take, 20, 250);

        return await query
            .OrderBy(x => x.Chapter != null ? x.Chapter.ChapterNo : 0)
            .ThenBy(x => x.Id)
            .Take(safeTake)
            .Select(x => new QuestionCatalogDto
            {
                Id = x.Id,
                Type = x.Type,
                Category = x.Category,
                ChapterId = x.ChapterId,
                DescriptionText = x.DescriptionText,
                StemImage = x.StemImage,
                McqOpt1 = x.McqOpt1,
                McqOpt2 = x.McqOpt2,
                McqOpt3 = x.McqOpt3,
                McqOpt4 = x.McqOpt4
            })
            .ToListAsync();
    }

    public async Task<List<QuestionChapterAvailabilityDto>> GetQuestionAvailabilityByChapterAsync(int classId, int subjectId)
    {
        if (classId <= 0 || subjectId <= 0)
        {
            throw new InvalidOperationException("ClassId and SubjectId are required.");
        }

        var counts = await _academicContext.QuestionsCatalog
            .AsNoTracking()
            .Include(x => x.Chapter)
            .Where(x =>
                x.Chapter != null &&
                x.Chapter.ClassId == classId &&
                x.Chapter.SubjectId == subjectId &&
                (x.Type == "mcq" || x.Type == "saq" || x.Type == "laq" || x.Type == "numerical"))
            .GroupBy(x => new { x.ChapterId, x.Type })
            .Select(group => new
            {
                group.Key.ChapterId,
                group.Key.Type,
                Count = group.Count()
            })
            .ToListAsync();

        return counts
            .GroupBy(x => x.ChapterId)
            .Select(group => new QuestionChapterAvailabilityDto
            {
                ChapterId = group.Key,
                McqCount = group.Where(x => x.Type == "mcq").Sum(x => x.Count),
                SaqCount = group.Where(x => x.Type == "saq").Sum(x => x.Count),
                LaqCount = group.Where(x => x.Type == "laq").Sum(x => x.Count),
                NumericalCount = group.Where(x => x.Type == "numerical").Sum(x => x.Count)
            })
            .ToList();
    }

    public async Task<ExamPaperDto> GeneratePaperAsync(GenerateExamPaperRequestDto request)
    {
        if (request.ClassId <= 0 || request.SubjectId <= 0)
        {
            throw new InvalidOperationException("ClassId and SubjectId are required.");
        }

        if (request.Blueprint.Count == 0)
        {
            throw new InvalidOperationException("At least one blueprint rule is required.");
        }

        var classEntity = await _academicContext.Classes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.ClassId)
            ?? throw new InvalidOperationException("Invalid ClassId.");
        var subjectEntity = await _academicContext.Subjects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.SubjectId)
            ?? throw new InvalidOperationException("Invalid SubjectId.");
        var examTitleRow = await RequireExamTitleAsync(request.ExamTitleId);
        var examTypeKeyGen = NormalizeExamPaperType(request.ExamType);
        var paperNameGen = string.IsNullOrWhiteSpace(request.PaperName)
            ? $"{subjectEntity.SubjectName} - {examTitleRow.Title} ({FormatExamPaperDateLabel(DateTime.Now)})"
            : RequirePaperName(request.PaperName);
        var existingGenSlot = await FindPaperIdBySlotAndNameAsync(
            request.ClassId, request.SubjectId, examTitleRow.Id, examTypeKeyGen, paperNameGen);
        if (existingGenSlot.HasValue)
        {
            throw new InvalidOperationException(
                "A paper with this name already exists for this class, subject, exam title, and exam type. Use a different paper name or edit the existing paper.");
        }

        var chapterIds = (request.ChapterIds ?? []).Distinct().ToList();
        if (chapterIds.Count > 0)
        {
            var validChapterCount = await _academicContext.Chapters
                .AsNoTracking()
                .CountAsync(x => x.ClassId == request.ClassId && x.SubjectId == request.SubjectId && chapterIds.Contains(x.Id));
            if (validChapterCount != chapterIds.Count)
            {
                throw new InvalidOperationException("One or more selected chapters do not belong to the selected class/subject.");
            }
        }

        var baseQuery = _academicContext.QuestionsCatalog
            .AsNoTracking()
            .Include(x => x.Chapter)
            .Where(x => x.Chapter != null && x.Chapter.ClassId == request.ClassId && x.Chapter.SubjectId == request.SubjectId);

        if (chapterIds.Count > 0)
        {
            baseQuery = baseQuery.Where(x => chapterIds.Contains(x.ChapterId));
        }

        var pool = await baseQuery.ToListAsync();
        var random = new Random();
        var usedQuestionIds = new HashSet<int>();
        var paperQuestions = new List<QuestionPaperQuestion>();
        var displayRows = new List<PaperQuestionItemDto>();
        var order = 1;

        foreach (var rule in request.Blueprint.Where(x => x.Count > 0))
        {
            var type = rule.Type?.Trim().ToLowerInvariant();
            var category = rule.Category?.Trim().ToLowerInvariant();
            var section = string.IsNullOrWhiteSpace(rule.Section) ? null : rule.Section.Trim();

            var scoped = pool
                .Where(x => !usedQuestionIds.Contains(x.Id))
                .Where(x => string.IsNullOrWhiteSpace(type) || x.Type == type)
                .Where(x => string.IsNullOrWhiteSpace(category) || x.Category == category)
                .OrderBy(_ => random.Next())
                .Take(rule.Count)
                .ToList();

            if (scoped.Count < rule.Count)
            {
                var typeLabel = string.IsNullOrWhiteSpace(type) ? "any-type" : type;
                var categoryLabel = string.IsNullOrWhiteSpace(category) ? "any-category" : category;
                throw new InvalidOperationException(
                    $"Insufficient questions for blueprint rule (section: {section ?? "-"}, type: {typeLabel}, category: {categoryLabel}). Requested {rule.Count}, found {scoped.Count}.");
            }

            foreach (var item in scoped)
            {
                usedQuestionIds.Add(item.Id);
                var marks = rule.MarksPerQuestion > 0 ? rule.MarksPerQuestion : 1;
                paperQuestions.Add(new QuestionPaperQuestion
                {
                    QuestionId = item.Id,
                    QuestionOrder = order,
                    Marks = marks,
                    Section = section
                });

                displayRows.Add(new PaperQuestionItemDto
                {
                    Id = item.Id,
                    Type = item.Type,
                    Category = item.Category,
                    ChapterId = item.ChapterId,
                    ChapterName = item.Chapter?.ChapterName ?? string.Empty,
                    ChapterNo = item.Chapter?.ChapterNo ?? 0,
                    DescriptionText = item.DescriptionText,
                    StemImage = item.StemImage,
                    McqOpt1 = item.McqOpt1,
                    McqOpt2 = item.McqOpt2,
                    McqOpt3 = item.McqOpt3,
                    McqOpt4 = item.McqOpt4,
                    Marks = marks,
                    Section = section,
                    Order = order
                });
                order++;
            }
        }

        var totalMarks = paperQuestions.Sum(x => x.Marks);
        var sections = NormalizeSections(request.Sections);
        var paperEntity = new QuestionPaper
        {
            ClassId = request.ClassId,
            SubjectId = request.SubjectId,
            PaperName = paperNameGen,
            TotalMarks = totalMarks,
            DurationMinutes = request.DurationMinutes,
            SchoolName = NormalizeNullable(request.SchoolName),
            SchoolLogoUrl = NormalizeNullable(request.SchoolLogoUrl),
            ExamTitleId = examTitleRow.Id,
            SessionLabel = NormalizeNullable(request.SessionLabel),
            ExamType = examTypeKeyGen,
            HeaderNote = NormalizeNullable(request.HeaderNote),
            Instructions = NormalizeNullable(request.Instructions),
            FooterNote = NormalizeNullable(request.FooterNote),
            ShowSectionNames = request.ShowSectionNames,
            SubQuestionNumberingStyle = NormalizeSubQuestionNumbering(request.SubQuestionNumberingStyle),
            WrapQuestionMarksInParentheses = request.WrapQuestionMarksInParentheses,
            SectionMetaJson = SerializeSections(sections),
            Questions = paperQuestions
        };

        _academicContext.QuestionPapers.Add(paperEntity);
        await _academicContext.SaveChangesAsync();

        return new ExamPaperDto
        {
            Id = paperEntity.Id,
            ExamTitleId = examTitleRow.Id,
            ClassId = request.ClassId,
            SubjectId = request.SubjectId,
            ClassName = classEntity.ClassName,
            SubjectName = subjectEntity.SubjectName,
            PaperName = paperEntity.PaperName,
            TotalMarks = paperEntity.TotalMarks,
            DurationMinutes = paperEntity.DurationMinutes,
            CreatedOn = paperEntity.CreatedOn,
            SchoolName = paperEntity.SchoolName,
            SchoolLogoUrl = paperEntity.SchoolLogoUrl,
            ExamTitle = examTitleRow.Title,
            SessionLabel = paperEntity.SessionLabel,
            ExamType = paperEntity.ExamType,
            HeaderNote = paperEntity.HeaderNote,
            Instructions = paperEntity.Instructions,
            FooterNote = paperEntity.FooterNote,
            ShowSectionNames = paperEntity.ShowSectionNames,
            SubQuestionNumberingStyle = paperEntity.SubQuestionNumberingStyle,
            WrapQuestionMarksInParentheses = paperEntity.WrapQuestionMarksInParentheses,
            Sections = sections,
            Questions = displayRows.OrderBy(x => x.Order).ToList()
        };
    }

    public async Task<ExamPaperDto> CreatePaperFromSelectionAsync(CreateExamPaperFromSelectionRequestDto request)
    {
        if (request.ClassId <= 0 || request.SubjectId <= 0)
        {
            throw new InvalidOperationException("ClassId and SubjectId are required.");
        }

        if (request.SelectedQuestions.Count == 0)
        {
            throw new InvalidOperationException("Select at least one question from catalog.");
        }

        var classEntity = await _academicContext.Classes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.ClassId)
            ?? throw new InvalidOperationException("Invalid ClassId.");
        var subjectEntity = await _academicContext.Subjects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.SubjectId)
            ?? throw new InvalidOperationException("Invalid SubjectId.");
        var examTitleRow = await RequireExamTitleAsync(request.ExamTitleId);
        var examTypeKey = NormalizeExamPaperType(request.ExamType);
        var paperName = RequirePaperName(request.PaperName);
        var existingSlotId = await FindPaperIdBySlotAndNameAsync(
            request.ClassId, request.SubjectId, examTitleRow.Id, examTypeKey, paperName);
        if (existingSlotId.HasValue)
        {
            throw new InvalidOperationException(
                "A paper with this name already exists for this class, subject, exam title, and exam type. Open it from Papers or use a different name.");
        }

        _logger.LogInformation(
            "Exam save (create-from-selection): new paper. ClassId={ClassId} SubjectId={SubjectId} ExamTitleId={ExamTitleId} ExamTypeKey={ExamTypeKey} PaperName={PaperName} SelectedCount={SelectedCount} ChapterFilterCount={ChapterCount}",
            request.ClassId,
            request.SubjectId,
            request.ExamTitleId,
            examTypeKey,
            paperName,
            request.SelectedQuestions.Count,
            request.ChapterIds?.Count ?? 0);

        var chapterIds = (request.ChapterIds ?? []).Distinct().ToList();
        if (chapterIds.Count > 0)
        {
            var validChapterCount = await _academicContext.Chapters
                .AsNoTracking()
                .CountAsync(x => x.ClassId == request.ClassId && x.SubjectId == request.SubjectId && chapterIds.Contains(x.Id));
            if (validChapterCount != chapterIds.Count)
            {
                throw new InvalidOperationException("One or more selected chapters do not belong to the selected class/subject.");
            }
        }

        var selectedQuestionIds = request.SelectedQuestions.Select(x => x.QuestionId).Distinct().ToList();
        if (selectedQuestionIds.Count != request.SelectedQuestions.Count)
        {
            throw new InvalidOperationException("Duplicate questions are not allowed in selection.");
        }

        var questionEntities = await _academicContext.QuestionsCatalog
            .AsNoTracking()
            .Include(x => x.Chapter)
            .Where(x => selectedQuestionIds.Contains(x.Id))
            .ToListAsync();

        if (questionEntities.Count != selectedQuestionIds.Count)
        {
            throw new InvalidOperationException("One or more selected questions were not found.");
        }

        var invalidQuestion = questionEntities.FirstOrDefault(x =>
            x.Chapter == null ||
            x.Chapter.ClassId != request.ClassId ||
            x.Chapter.SubjectId != request.SubjectId ||
            (chapterIds.Count > 0 && !chapterIds.Contains(x.ChapterId)));

        if (invalidQuestion != null)
        {
            throw new InvalidOperationException("Selected questions must belong to selected class/subject/chapters.");
        }

        var orderSet = new HashSet<int>();
        var paperQuestions = new List<QuestionPaperQuestion>();
        var displayRows = new List<PaperQuestionItemDto>();
        var selectionRows = request.SelectedQuestions.OrderBy(x => x.QuestionOrder).ToList();

        foreach (var selected in selectionRows)
        {
            if (selected.QuestionOrder <= 0 || !orderSet.Add(selected.QuestionOrder))
            {
                throw new InvalidOperationException("QuestionOrder must be unique and greater than zero.");
            }

            var entity = questionEntities.First(x => x.Id == selected.QuestionId);
            var marks = selected.Marks > 0 ? selected.Marks : 1;
            var section = string.IsNullOrWhiteSpace(selected.Section) ? "Q1" : selected.Section.Trim();

            paperQuestions.Add(new QuestionPaperQuestion
            {
                QuestionId = selected.QuestionId,
                QuestionOrder = selected.QuestionOrder,
                Marks = marks,
                Section = section
            });

            displayRows.Add(new PaperQuestionItemDto
            {
                Id = entity.Id,
                Type = entity.Type,
                Category = entity.Category,
                ChapterId = entity.ChapterId,
                ChapterName = entity.Chapter?.ChapterName ?? string.Empty,
                ChapterNo = entity.Chapter?.ChapterNo ?? 0,
                DescriptionText = entity.DescriptionText,
                StemImage = entity.StemImage,
                McqOpt1 = entity.McqOpt1,
                McqOpt2 = entity.McqOpt2,
                McqOpt3 = entity.McqOpt3,
                McqOpt4 = entity.McqOpt4,
                Marks = marks,
                Section = section,
                Order = selected.QuestionOrder
            });
        }

        var sections = NormalizeSections(request.Sections);
        var questionTypesById = questionEntities.ToDictionary(x => x.Id, x => x.Type);
        var totalMarks = ComputeTotalMarksFromSelection(paperQuestions, questionTypesById, sections);
        var paperEntity = new QuestionPaper
        {
            ClassId = request.ClassId,
            SubjectId = request.SubjectId,
            PaperName = paperName,
            TotalMarks = totalMarks,
            DurationMinutes = request.DurationMinutes,
            SchoolName = NormalizeNullable(request.SchoolName),
            SchoolLogoUrl = NormalizeNullable(request.SchoolLogoUrl),
            ExamTitleId = examTitleRow.Id,
            SessionLabel = NormalizeNullable(request.SessionLabel),
            ExamType = examTypeKey,
            HeaderNote = NormalizeNullable(request.HeaderNote),
            Instructions = NormalizeNullable(request.Instructions),
            FooterNote = NormalizeNullable(request.FooterNote),
            ShowSectionNames = request.ShowSectionNames,
            SubQuestionNumberingStyle = NormalizeSubQuestionNumbering(request.SubQuestionNumberingStyle),
            WrapQuestionMarksInParentheses = request.WrapQuestionMarksInParentheses,
            SectionMetaJson = SerializeSections(sections),
            Questions = paperQuestions
        };

        _academicContext.QuestionPapers.Add(paperEntity);
        _logger.LogInformation(
            "Exam save (create-from-selection): calling SaveChanges for new QuestionPaper with {QuestionRowCount} question rows, TotalMarks={TotalMarks}.",
            paperQuestions.Count,
            totalMarks);
        try
        {
            await _academicContext.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            LogExamSaveFailure("create-from-selection", ex);
            throw;
        }

        _logger.LogInformation(
            "Exam save (create-from-selection): succeeded. New PaperId={PaperId}",
            paperEntity.Id);

        return new ExamPaperDto
        {
            Id = paperEntity.Id,
            ExamTitleId = examTitleRow.Id,
            ClassId = request.ClassId,
            SubjectId = request.SubjectId,
            ClassName = classEntity.ClassName,
            SubjectName = subjectEntity.SubjectName,
            PaperName = paperEntity.PaperName,
            TotalMarks = paperEntity.TotalMarks,
            DurationMinutes = paperEntity.DurationMinutes,
            CreatedOn = paperEntity.CreatedOn,
            SchoolName = paperEntity.SchoolName,
            SchoolLogoUrl = paperEntity.SchoolLogoUrl,
            ExamTitle = examTitleRow.Title,
            SessionLabel = paperEntity.SessionLabel,
            ExamType = paperEntity.ExamType,
            HeaderNote = paperEntity.HeaderNote,
            Instructions = paperEntity.Instructions,
            FooterNote = paperEntity.FooterNote,
            ShowSectionNames = paperEntity.ShowSectionNames,
            SubQuestionNumberingStyle = paperEntity.SubQuestionNumberingStyle,
            WrapQuestionMarksInParentheses = paperEntity.WrapQuestionMarksInParentheses,
            Sections = sections,
            Questions = displayRows.OrderBy(x => x.Order).ToList()
        };
    }

    public async Task<ExamPaperDto> UpdatePaperFromSelectionAsync(int id, CreateExamPaperFromSelectionRequestDto request)
    {
        if (id <= 0)
        {
            throw new InvalidOperationException("Invalid paper id.");
        }

        if (request.ClassId <= 0 || request.SubjectId <= 0)
        {
            throw new InvalidOperationException("ClassId and SubjectId are required.");
        }

        if (request.SelectedQuestions.Count == 0)
        {
            throw new InvalidOperationException("Select at least one question from catalog.");
        }

        _logger.LogInformation(
            "Exam save (update-from-selection): PaperId={PaperId} ClassId={ClassId} SubjectId={SubjectId} ExamTitleId={ExamTitleId} ExamType={ExamType} SelectedCount={SelectedCount}",
            id,
            request.ClassId,
            request.SubjectId,
            request.ExamTitleId,
            request.ExamType,
            request.SelectedQuestions.Count);

        var paperEntity = await _academicContext.QuestionPapers
            .Include(x => x.Questions)
            .FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new InvalidOperationException("Paper not found.");

        if (paperEntity.ClassId != request.ClassId || paperEntity.SubjectId != request.SubjectId)
        {
            throw new InvalidOperationException("Selected class/subject does not match this existing paper.");
        }

        var examTitleRow = await RequireExamTitleAsync(request.ExamTitleId);
        var newTypeKey = NormalizeExamPaperType(request.ExamType);
        var paperName = RequirePaperName(request.PaperName);
        var siblingRows = await _academicContext.QuestionPapers.AsNoTracking()
            .Where(x => x.Id != id && x.ClassId == request.ClassId && x.SubjectId == request.SubjectId && x.ExamTitleId == examTitleRow.Id)
            .Select(x => new { x.Id, x.ExamType, x.PaperName })
            .ToListAsync();
        if (siblingRows.Any(x =>
                NormalizeExamPaperType(x.ExamType) == newTypeKey &&
                PaperNamesEqual(x.PaperName, paperName)))
        {
            throw new InvalidOperationException(
                "Another paper already exists with this name for this class, subject, exam title, and exam type.");
        }

        var chapterIds = (request.ChapterIds ?? []).Distinct().ToList();
        if (chapterIds.Count > 0)
        {
            var validChapterCount = await _academicContext.Chapters
                .AsNoTracking()
                .CountAsync(x => x.ClassId == request.ClassId && x.SubjectId == request.SubjectId && chapterIds.Contains(x.Id));
            if (validChapterCount != chapterIds.Count)
            {
                throw new InvalidOperationException("One or more selected chapters do not belong to the selected class/subject.");
            }
        }

        var selectedQuestionIds = request.SelectedQuestions.Select(x => x.QuestionId).Distinct().ToList();
        if (selectedQuestionIds.Count != request.SelectedQuestions.Count)
        {
            throw new InvalidOperationException("Duplicate questions are not allowed in selection.");
        }

        var questionEntities = await _academicContext.QuestionsCatalog
            .AsNoTracking()
            .Include(x => x.Chapter)
            .Where(x => selectedQuestionIds.Contains(x.Id))
            .ToListAsync();

        if (questionEntities.Count != selectedQuestionIds.Count)
        {
            throw new InvalidOperationException("One or more selected questions were not found.");
        }

        var invalidQuestion = questionEntities.FirstOrDefault(x =>
            x.Chapter == null ||
            x.Chapter.ClassId != request.ClassId ||
            x.Chapter.SubjectId != request.SubjectId ||
            (chapterIds.Count > 0 && !chapterIds.Contains(x.ChapterId)));

        if (invalidQuestion != null)
        {
            throw new InvalidOperationException("Selected questions must belong to selected class/subject/chapters.");
        }

        var orderSet = new HashSet<int>();
        var paperQuestions = new List<QuestionPaperQuestion>();
        var selectionRows = request.SelectedQuestions.OrderBy(x => x.QuestionOrder).ToList();

        foreach (var selected in selectionRows)
        {
            if (selected.QuestionOrder <= 0 || !orderSet.Add(selected.QuestionOrder))
            {
                throw new InvalidOperationException("QuestionOrder must be unique and greater than zero.");
            }

            var marks = selected.Marks > 0 ? selected.Marks : 1;
            var section = string.IsNullOrWhiteSpace(selected.Section) ? "Q1" : selected.Section.Trim();
            paperQuestions.Add(new QuestionPaperQuestion
            {
                QuestionId = selected.QuestionId,
                QuestionOrder = selected.QuestionOrder,
                Marks = marks,
                Section = section
            });
        }

        var sections = NormalizeSections(request.Sections);
        var questionTypesById = questionEntities.ToDictionary(x => x.Id, x => x.Type);
        var totalMarks = ComputeTotalMarksFromSelection(paperQuestions, questionTypesById, sections);

        _academicContext.QuestionPaperQuestions.RemoveRange(paperEntity.Questions);
        paperEntity.Questions = paperQuestions;
        paperEntity.PaperName = paperName;
        paperEntity.TotalMarks = totalMarks;
        paperEntity.DurationMinutes = request.DurationMinutes;
        paperEntity.SchoolName = NormalizeNullable(request.SchoolName);
        paperEntity.SchoolLogoUrl = NormalizeNullable(request.SchoolLogoUrl);
        paperEntity.ExamTitleId = examTitleRow.Id;
        paperEntity.SessionLabel = NormalizeNullable(request.SessionLabel);
        paperEntity.ExamType = newTypeKey;
        paperEntity.HeaderNote = NormalizeNullable(request.HeaderNote);
        paperEntity.Instructions = NormalizeNullable(request.Instructions);
        paperEntity.FooterNote = NormalizeNullable(request.FooterNote);
        paperEntity.ShowSectionNames = request.ShowSectionNames;
        paperEntity.SubQuestionNumberingStyle = NormalizeSubQuestionNumbering(request.SubQuestionNumberingStyle);
        paperEntity.WrapQuestionMarksInParentheses = request.WrapQuestionMarksInParentheses;
        paperEntity.SectionMetaJson = SerializeSections(sections);

        _logger.LogInformation(
            "Exam save (update-from-selection): SaveChanges for PaperId={PaperId}, {QuestionRowCount} question rows, ExamType after normalize={ExamTypeKey}, TotalMarks={TotalMarks}.",
            paperEntity.Id,
            paperQuestions.Count,
            newTypeKey,
            totalMarks);
        try
        {
            await _academicContext.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            LogExamSaveFailure("update-from-selection", ex);
            throw;
        }

        _logger.LogInformation("Exam save (update-from-selection): SaveChanges succeeded for PaperId={PaperId}.", paperEntity.Id);

        return await GetPaperByIdAsync(paperEntity.Id) ?? throw new InvalidOperationException("Unable to reload updated paper.");
    }

    public async Task<ExamPaperDto> RandomizePaperFromChaptersAsync(RandomizeExamPaperRequestDto request)
    {
        if (request.ClassId <= 0 || request.SubjectId <= 0)
        {
            throw new InvalidOperationException("ClassId and SubjectId are required.");
        }

        var chapterRules = NormalizeRandomChapterRules(request.ChapterRules);
        if (chapterRules.Count == 0)
        {
            throw new InvalidOperationException("Select at least one chapter and question count.");
        }

        var examTypeKey = NormalizeExamPaperType(request.ExamType);
        if (examTypeKey == "objective" && chapterRules.Any(x => x.SaqCount > 0 || x.LaqCount > 0))
        {
            throw new InvalidOperationException("Objective papers can include MCQ questions only.");
        }

        if (examTypeKey == "subjective" && chapterRules.Any(x => x.McqCount > 0))
        {
            throw new InvalidOperationException("Subjective papers can include SAQ and LAQ questions only.");
        }

        var classEntity = await _academicContext.Classes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.ClassId)
            ?? throw new InvalidOperationException("Invalid ClassId.");
        var subjectEntity = await _academicContext.Subjects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.SubjectId)
            ?? throw new InvalidOperationException("Invalid SubjectId.");
        var examTitleRow = await RequireExamTitleAsync(request.ExamTitleId);
        var paperName = RequirePaperName(request.PaperName);

        var chapterIds = chapterRules.Select(x => x.ChapterId).ToList();
        var chapterRows = await _academicContext.Chapters
            .AsNoTracking()
            .Where(x => chapterIds.Contains(x.Id))
            .Select(x => new { x.Id, x.ClassId, x.SubjectId, x.ChapterNo })
            .ToListAsync();

        if (chapterRows.Count != chapterIds.Count ||
            chapterRows.Any(x => x.ClassId != request.ClassId || x.SubjectId != request.SubjectId))
        {
            throw new InvalidOperationException("One or more selected chapters do not belong to the selected class/subject.");
        }

        QuestionPaper? paperEntity = null;
        if (request.PaperId is > 0)
        {
            paperEntity = await _academicContext.QuestionPapers
                .Include(x => x.Questions)
                .FirstOrDefaultAsync(x => x.Id == request.PaperId.Value)
                ?? throw new InvalidOperationException("Paper not found.");

            if (paperEntity.ClassId != request.ClassId || paperEntity.SubjectId != request.SubjectId)
            {
                throw new InvalidOperationException("Selected class/subject does not match this existing paper.");
            }

            var siblingRows = await _academicContext.QuestionPapers.AsNoTracking()
                .Where(x => x.Id != paperEntity.Id && x.ClassId == request.ClassId && x.SubjectId == request.SubjectId && x.ExamTitleId == examTitleRow.Id)
                .Select(x => new { x.Id, x.ExamType, x.PaperName })
                .ToListAsync();
            if (siblingRows.Any(x =>
                    NormalizeExamPaperType(x.ExamType) == examTypeKey &&
                    PaperNamesEqual(x.PaperName, paperName)))
            {
                throw new InvalidOperationException(
                    "Another paper already exists with this name for this class, subject, exam title, and exam type.");
            }
        }
        else
        {
            var existingSlotId = await FindPaperIdBySlotAndNameAsync(
                request.ClassId, request.SubjectId, examTitleRow.Id, examTypeKey, paperName);
            if (existingSlotId.HasValue)
            {
                paperEntity = await _academicContext.QuestionPapers
                    .Include(x => x.Questions)
                    .FirstOrDefaultAsync(x => x.Id == existingSlotId.Value);
            }
        }

        var requestedTypes = GetRequestedRandomQuestionTypes(chapterRules);
        var questionRows = await _academicContext.QuestionsCatalog
            .AsNoTracking()
            .Include(x => x.Chapter)
            .Where(x =>
                chapterIds.Contains(x.ChapterId) &&
                requestedTypes.Contains(x.Type) &&
                x.Chapter != null &&
                x.Chapter.ClassId == request.ClassId &&
                x.Chapter.SubjectId == request.SubjectId)
            .ToListAsync();

        var random = new Random();
        var usedQuestionIds = new HashSet<int>();
        var autoSectionResolver = new AutoSectionResolver(examTypeKey);
        var paperQuestions = new List<QuestionPaperQuestion>();
        var questionTypesById = new Dictionary<int, string>();
        var order = 1;

        foreach (var rule in chapterRules
                     .OrderBy(x => chapterRows.First(c => c.Id == x.ChapterId).ChapterNo)
                     .ThenBy(x => x.ChapterId))
        {
            foreach (var type in GetRandomTypeOrder(examTypeKey))
            {
                var requestedCount = GetRequestedRandomCount(rule, type);
                if (requestedCount <= 0)
                {
                    continue;
                }

                var scoped = questionRows
                    .Where(x => x.ChapterId == rule.ChapterId && x.Type == type && !usedQuestionIds.Contains(x.Id))
                    .OrderBy(_ => random.Next())
                    .Take(requestedCount)
                    .ToList();

                if (scoped.Count < requestedCount)
                {
                    var chapterNo = chapterRows.First(x => x.Id == rule.ChapterId).ChapterNo;
                    throw new InvalidOperationException(
                        $"Insufficient {type.ToUpperInvariant()} questions in chapter {chapterNo}. Requested {requestedCount}, found {scoped.Count}.");
                }

                foreach (var item in scoped)
                {
                    usedQuestionIds.Add(item.Id);
                    questionTypesById[item.Id] = item.Type;
                    paperQuestions.Add(new QuestionPaperQuestion
                    {
                        QuestionId = item.Id,
                        QuestionOrder = order,
                        Marks = DefaultMarksForQuestionType(item.Type),
                        Section = autoSectionResolver.Resolve(item.Type)
                    });
                    order++;
                }
            }
        }

        if (paperQuestions.Count == 0)
        {
            throw new InvalidOperationException("Select at least one question to randomize.");
        }

        var sections = EnsureSectionsForAutoQuestions(request.Sections, paperQuestions, questionTypesById, examTypeKey);
        var totalMarks = ComputeTotalMarksFromSelection(paperQuestions, questionTypesById, sections);

        await using var transaction = await _academicContext.Database.BeginTransactionAsync();
        if (paperEntity == null)
        {
            paperEntity = new QuestionPaper
            {
                ClassId = request.ClassId,
                SubjectId = request.SubjectId,
                Questions = paperQuestions
            };
            _academicContext.QuestionPapers.Add(paperEntity);
        }
        else
        {
            _academicContext.QuestionPaperQuestions.RemoveRange(paperEntity.Questions);
            paperEntity.Questions = paperQuestions;
        }

        paperEntity.PaperName = paperName;
        paperEntity.TotalMarks = totalMarks;
        paperEntity.DurationMinutes = request.DurationMinutes;
        paperEntity.SchoolName = NormalizeNullable(request.SchoolName);
        paperEntity.SchoolLogoUrl = NormalizeNullable(request.SchoolLogoUrl);
        paperEntity.ExamTitleId = examTitleRow.Id;
        paperEntity.SessionLabel = NormalizeNullable(request.SessionLabel);
        paperEntity.ExamType = examTypeKey;
        paperEntity.HeaderNote = NormalizeNullable(request.HeaderNote);
        paperEntity.Instructions = NormalizeNullable(request.Instructions);
        paperEntity.FooterNote = NormalizeNullable(request.FooterNote);
        paperEntity.ShowSectionNames = request.ShowSectionNames;
        paperEntity.SubQuestionNumberingStyle = NormalizeSubQuestionNumbering(request.SubQuestionNumberingStyle);
        paperEntity.WrapQuestionMarksInParentheses = request.WrapQuestionMarksInParentheses;
        paperEntity.SectionMetaJson = SerializeSections(sections);

        _logger.LogInformation(
            "Exam save (auto-from-chapters): PaperId={PaperId} ClassId={ClassId} SubjectId={SubjectId} ExamTitleId={ExamTitleId} ExamType={ExamType} QuestionCount={QuestionCount}",
            paperEntity.Id,
            request.ClassId,
            request.SubjectId,
            examTitleRow.Id,
            examTypeKey,
            paperQuestions.Count);
        try
        {
            await _academicContext.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            LogExamSaveFailure("auto-from-chapters", ex);
            throw;
        }

        return await GetPaperByIdAsync(paperEntity.Id) ?? throw new InvalidOperationException("Unable to reload randomized paper.");
    }

    public async Task<bool> DeletePaperAsync(int id)
    {
        if (id <= 0)
        {
            return false;
        }

        var paperEntity = await _academicContext.QuestionPapers
            .Include(x => x.Questions)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (paperEntity == null)
        {
            return false;
        }

        _academicContext.QuestionPaperQuestions.RemoveRange(paperEntity.Questions);
        _academicContext.QuestionPapers.Remove(paperEntity);
        await _academicContext.SaveChangesAsync();
        _logger.LogInformation("Exam paper deleted permanently. PaperId={PaperId}", id);
        return true;
    }

    public async Task<List<ExamPaperDto>> GetPapersAsync(int? classId = null, int? subjectId = null)
    {
        var query = _academicContext.QuestionPapers
            .AsNoTracking()
            .Include(x => x.Class)
            .Include(x => x.Subject)
            .Include(x => x.ExamTitle)
            .AsQueryable();

        if (classId.HasValue && classId.Value > 0)
        {
            query = query.Where(x => x.ClassId == classId.Value);
        }

        if (subjectId.HasValue && subjectId.Value > 0)
        {
            query = query.Where(x => x.SubjectId == subjectId.Value);
        }

        var papers = await query
            .OrderByDescending(x => x.CreatedOn)
            .ToListAsync();

        return papers.Select(x => new ExamPaperDto
        {
            Id = x.Id,
            ExamTitleId = x.ExamTitleId,
            ClassId = x.ClassId,
            SubjectId = x.SubjectId,
            ClassName = x.Class != null ? x.Class.ClassName : string.Empty,
            SubjectName = x.Subject != null ? x.Subject.SubjectName : string.Empty,
            PaperName = x.PaperName,
            TotalMarks = x.TotalMarks,
            DurationMinutes = x.DurationMinutes,
            CreatedOn = x.CreatedOn,
            SchoolName = x.SchoolName,
            SchoolLogoUrl = x.SchoolLogoUrl,
            ExamTitle = x.ExamTitle != null ? x.ExamTitle.Title : null,
            SessionLabel = x.SessionLabel,
            ExamType = x.ExamType,
            HeaderNote = x.HeaderNote,
            Instructions = x.Instructions,
            FooterNote = x.FooterNote,
            ShowSectionNames = x.ShowSectionNames,
            SubQuestionNumberingStyle = x.SubQuestionNumberingStyle,
            WrapQuestionMarksInParentheses = x.WrapQuestionMarksInParentheses,
            Sections = DeserializeSections(x.SectionMetaJson)
        }).ToList();
    }

    public async Task<ExamPaperDto?> GetPaperByIdAsync(int id)
    {
        var paper = await _academicContext.QuestionPapers
            .AsNoTracking()
            .Include(x => x.Class)
            .Include(x => x.Subject)
            .Include(x => x.ExamTitle)
            .Include(x => x.Questions)
                .ThenInclude(x => x.Question!)
                    .ThenInclude(x => x.Chapter)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (paper == null)
        {
            return null;
        }

        return new ExamPaperDto
        {
            Id = paper.Id,
            ExamTitleId = paper.ExamTitleId,
            ClassId = paper.ClassId,
            SubjectId = paper.SubjectId,
            ClassName = paper.Class?.ClassName ?? string.Empty,
            SubjectName = paper.Subject?.SubjectName ?? string.Empty,
            PaperName = paper.PaperName,
            TotalMarks = paper.TotalMarks,
            DurationMinutes = paper.DurationMinutes,
            CreatedOn = paper.CreatedOn,
            SchoolName = paper.SchoolName,
            SchoolLogoUrl = paper.SchoolLogoUrl,
            ExamTitle = paper.ExamTitle?.Title,
            SessionLabel = paper.SessionLabel,
            ExamType = paper.ExamType,
            HeaderNote = paper.HeaderNote,
            Instructions = paper.Instructions,
            FooterNote = paper.FooterNote,
            ShowSectionNames = paper.ShowSectionNames,
            SubQuestionNumberingStyle = paper.SubQuestionNumberingStyle,
            WrapQuestionMarksInParentheses = paper.WrapQuestionMarksInParentheses,
            Sections = DeserializeSections(paper.SectionMetaJson),
            Questions = paper.Questions
                .OrderBy(x => x.QuestionOrder)
                .Select(x => new PaperQuestionItemDto
                {
                    Id = x.QuestionId,
                    Type = x.Question?.Type ?? string.Empty,
                    Category = x.Question?.Category ?? string.Empty,
                    ChapterId = x.Question?.ChapterId ?? 0,
                    ChapterName = x.Question?.Chapter?.ChapterName ?? string.Empty,
                    ChapterNo = x.Question?.Chapter?.ChapterNo ?? 0,
                    DescriptionText = x.Question?.DescriptionText ?? string.Empty,
                    StemImage = x.Question?.StemImage,
                    McqOpt1 = x.Question?.McqOpt1,
                    McqOpt2 = x.Question?.McqOpt2,
                    McqOpt3 = x.Question?.McqOpt3,
                    McqOpt4 = x.Question?.McqOpt4,
                    Marks = x.Marks,
                    Section = x.Section,
                    Order = x.QuestionOrder
                })
                .ToList()
        };
    }

    private async Task<ExamTitle> RequireExamTitleAsync(int examTitleId)
    {
        if (examTitleId <= 0)
        {
            throw new InvalidOperationException("ExamTitleId is required.");
        }

        var row = await _examTitleRepository.GetByIdAsync(examTitleId);
        return row ?? throw new InvalidOperationException("Invalid ExamTitleId.");
    }

    /// <summary>Printed in auto-generated paper names, e.g. 03 May 2026.</summary>
    private static string FormatExamPaperDateLabel(DateTime when) =>
        when.ToString("dd MMM yyyy", CultureInfo.InvariantCulture);

    private static string NormalizeExamPaperType(string? value)
    {
        var v = (value ?? string.Empty).Trim().ToLowerInvariant();
        return v == "subjective" ? "subjective" : "objective";
    }

    private async Task<int?> FindPaperIdBySlotAndNameAsync(
        int classId,
        int subjectId,
        int examTitleId,
        string normalizedExamType,
        string normalizedPaperName)
    {
        var rows = await _academicContext.QuestionPapers
            .AsNoTracking()
            .Where(x => x.ClassId == classId && x.SubjectId == subjectId && x.ExamTitleId == examTitleId)
            .Select(x => new { x.Id, x.ExamType, x.PaperName })
            .ToListAsync();
        var match = rows.FirstOrDefault(x =>
            NormalizeExamPaperType(x.ExamType) == normalizedExamType &&
            PaperNamesEqual(x.PaperName, normalizedPaperName));
        return match?.Id;
    }

    private static string RequirePaperName(string? value)
    {
        var normalized = NormalizePaperName(value);
        if (string.IsNullOrEmpty(normalized))
        {
            throw new InvalidOperationException("Paper name is required.");
        }

        if (normalized.Length > 200)
        {
            throw new InvalidOperationException("Paper name must be 200 characters or fewer.");
        }

        return normalized;
    }

    private static string NormalizePaperName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        return string.Join(' ', value.Trim().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
    }

    private static bool PaperNamesEqual(string? a, string? b) =>
        string.Equals(NormalizePaperName(a), NormalizePaperName(b), StringComparison.OrdinalIgnoreCase);

    private static string? NormalizeNullable(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }

    private static string NormalizeSubQuestionNumbering(string? value)
    {
        var v = (value ?? "roman").Trim().ToLowerInvariant();
        return v switch
        {
            "numeric" or "number" or "decimal" => "numeric",
            "alpha" or "alphabetic" or "letter" or "letters" => "alpha",
            _ => "roman"
        };
    }

    private static List<ExamSectionConfigDto> NormalizeSections(List<ExamSectionConfigDto>? sections)
    {
        if (sections == null || sections.Count == 0)
        {
            return [];
        }

        return sections
            .Where(x => !string.IsNullOrWhiteSpace(x.SectionKey))
            .Select(x => new ExamSectionConfigDto
            {
                SectionKey = x.SectionKey.Trim(),
                SectionName = NormalizeNullable(x.SectionName),
                HeadingText = NormalizeNullable(x.HeadingText),
                InstructionText = NormalizeNullable(x.InstructionText),
                MarksDisplayText = NormalizeNullable(x.MarksDisplayText),
                OptionalQuestionsEnabled = x.OptionalQuestionsEnabled,
                OptionalQuestionsAttemptCount = x.OptionalQuestionsAttemptCount is > 0
                    ? x.OptionalQuestionsAttemptCount
                    : null
            })
            .ToList();
    }

    private static int ComputeTotalMarksFromSelection(
        IReadOnlyList<QuestionPaperQuestion> paperQuestions,
        IReadOnlyDictionary<int, string> questionTypesById,
        List<ExamSectionConfigDto> sections)
    {
        if (paperQuestions.Count == 0)
        {
            return 0;
        }

        var sectionConfigByKey = sections
            .Where(x => !string.IsNullOrWhiteSpace(x.SectionKey))
            .GroupBy(x => x.SectionKey.Trim(), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var total = 0;
        foreach (var group in paperQuestions.GroupBy(x => string.IsNullOrWhiteSpace(x.Section) ? "Q1" : x.Section.Trim()))
        {
            var rows = group.ToList();
            sectionConfigByKey.TryGetValue(group.Key, out var config);
            var attemptCount = config?.OptionalQuestionsAttemptCount ?? 0;
            if (config?.OptionalQuestionsEnabled == true
                && attemptCount > 0
                && attemptCount < rows.Count
                && SectionSupportsOptionalQuestions(rows, questionTypesById))
            {
                total += SumMarksForOptionalAttempt(rows, attemptCount);
            }
            else
            {
                total += rows.Sum(x => x.Marks);
            }
        }

        return total;
    }

    private static bool SectionSupportsOptionalQuestions(
        IReadOnlyList<QuestionPaperQuestion> rows,
        IReadOnlyDictionary<int, string> questionTypesById)
    {
        foreach (var row in rows)
        {
            if (!questionTypesById.TryGetValue(row.QuestionId, out var type))
            {
                return false;
            }

            var normalized = type.Trim().ToLowerInvariant();
            if (normalized is not ("saq" or "laq" or "numerical"))
            {
                return false;
            }
        }

        return rows.Count > 0;
    }

    private static int SumMarksForOptionalAttempt(IReadOnlyList<QuestionPaperQuestion> rows, int attemptCount)
    {
        var marks = rows.Select(x => x.Marks).ToList();
        if (marks.Count > 0 && marks.All(value => value == marks[0]))
        {
            return marks[0] * attemptCount;
        }

        return marks.OrderByDescending(value => value).Take(attemptCount).Sum();
    }

    private static string? SerializeSections(List<ExamSectionConfigDto> sections)
    {
        if (sections.Count == 0)
        {
            return null;
        }

        return JsonSerializer.Serialize(sections);
    }

    private static List<ExamSectionConfigDto> DeserializeSections(string? sectionMetaJson)
    {
        if (string.IsNullOrWhiteSpace(sectionMetaJson))
        {
            return [];
        }

        try
        {
            return JsonSerializer.Deserialize<List<ExamSectionConfigDto>>(sectionMetaJson) ?? [];
        }
        catch
        {
            return [];
        }
    }

    private static List<RandomQuestionChapterRuleDto> NormalizeRandomChapterRules(List<RandomQuestionChapterRuleDto>? rules)
    {
        if (rules == null || rules.Count == 0)
        {
            return [];
        }

        return rules
            .Where(x => x.ChapterId > 0)
            .GroupBy(x => x.ChapterId)
            .Select(group => new RandomQuestionChapterRuleDto
            {
                ChapterId = group.Key,
                McqCount = group.Sum(x => Math.Max(0, x.McqCount)),
                SaqCount = group.Sum(x => Math.Max(0, x.SaqCount)),
                LaqCount = group.Sum(x => Math.Max(0, x.LaqCount))
            })
            .Where(x => x.McqCount > 0 || x.SaqCount > 0 || x.LaqCount > 0)
            .ToList();
    }

    private static List<string> GetRequestedRandomQuestionTypes(IReadOnlyList<RandomQuestionChapterRuleDto> rules)
    {
        var types = new List<string>();
        if (rules.Any(x => x.McqCount > 0))
        {
            types.Add("mcq");
        }

        if (rules.Any(x => x.SaqCount > 0))
        {
            types.Add("saq");
        }

        if (rules.Any(x => x.LaqCount > 0))
        {
            types.Add("laq");
        }

        return types;
    }

    private static IReadOnlyList<string> GetRandomTypeOrder(string examType) =>
        NormalizeExamPaperType(examType) == "subjective"
            ? new[] { "saq", "laq" }
            : new[] { "mcq" };

    private static int GetRequestedRandomCount(RandomQuestionChapterRuleDto rule, string type) =>
        type switch
        {
            "saq" => rule.SaqCount,
            "laq" => rule.LaqCount,
            _ => rule.McqCount
        };

    private static int DefaultMarksForQuestionType(string? type) =>
        (type ?? string.Empty).Trim().ToLowerInvariant() switch
        {
            "mcq" => 1,
            "saq" => 2,
            _ => 8
        };

    private static List<ExamSectionConfigDto> EnsureSectionsForAutoQuestions(
        List<ExamSectionConfigDto>? requestedSections,
        IReadOnlyList<QuestionPaperQuestion> paperQuestions,
        IReadOnlyDictionary<int, string> questionTypesById,
        string examType)
    {
        var normalized = NormalizeSections(requestedSections);
        var existingByKey = normalized
            .Where(x => !string.IsNullOrWhiteSpace(x.SectionKey))
            .GroupBy(x => x.SectionKey.Trim(), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(x => x.Key, x => x.First(), StringComparer.OrdinalIgnoreCase);

        return paperQuestions
            .GroupBy(x => string.IsNullOrWhiteSpace(x.Section) ? "Q1" : x.Section.Trim())
            .OrderBy(x => GetSectionNumberForSort(x.Key))
            .ThenBy(x => x.Key, StringComparer.OrdinalIgnoreCase)
            .Select(group =>
            {
                existingByKey.TryGetValue(group.Key, out var existing);
                return new ExamSectionConfigDto
                {
                    SectionKey = group.Key,
                    SectionName = existing?.SectionName,
                    HeadingText = string.IsNullOrWhiteSpace(existing?.HeadingText)
                        ? DefaultSectionHeading(group.Key, examType, ResolveSectionMode(group, questionTypesById))
                        : existing.HeadingText,
                    InstructionText = string.IsNullOrWhiteSpace(existing?.InstructionText)
                        ? DefaultSectionInstruction(ResolveSectionMode(group, questionTypesById))
                        : existing.InstructionText,
                    MarksDisplayText = string.IsNullOrWhiteSpace(existing?.MarksDisplayText)
                        ? group.Sum(x => x.Marks).ToString(CultureInfo.InvariantCulture)
                        : existing.MarksDisplayText,
                    OptionalQuestionsEnabled = existing?.OptionalQuestionsEnabled ?? false,
                    OptionalQuestionsAttemptCount = existing?.OptionalQuestionsAttemptCount
                };
            })
            .ToList();
    }

    private static string ResolveSectionMode(
        IEnumerable<QuestionPaperQuestion> rows,
        IReadOnlyDictionary<int, string> questionTypesById)
    {
        var types = rows
            .Select(x => questionTypesById.TryGetValue(x.QuestionId, out var type) ? (type ?? string.Empty).Trim().ToLowerInvariant() : string.Empty)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        return types.Count == 1 ? types[0] : "mixed";
    }

    private static string DefaultSectionHeading(string sectionKey, string examType, string mode)
    {
        var key = string.IsNullOrWhiteSpace(sectionKey) ? "Q1" : sectionKey.Trim();
        if (NormalizeExamPaperType(examType) != "subjective" || mode == "mcq")
        {
            return $"{key}: Choose correct option:";
        }

        return mode is "laq" or "numerical"
            ? $"{key}: Attempt following questions."
            : $"{key}: Write short answers of following questions.";
    }

    private static string DefaultSectionInstruction(string mode) =>
        mode == "mcq" ? string.Empty : "Answer all questions in this section.";

    private static int GetSectionNumberForSort(string sectionKey)
    {
        var key = (sectionKey ?? string.Empty).Trim();
        if (key.Length < 2 || !key.StartsWith("Q", StringComparison.OrdinalIgnoreCase))
        {
            return int.MaxValue;
        }

        return int.TryParse(key[1..], NumberStyles.Integer, CultureInfo.InvariantCulture, out var value)
            ? value
            : int.MaxValue;
    }

    private sealed class AutoSectionResolver
    {
        private readonly string _examType;
        private readonly Dictionary<string, string> _sectionsByType = new(StringComparer.OrdinalIgnoreCase);

        public AutoSectionResolver(string examType)
        {
            _examType = NormalizeExamPaperType(examType);
        }

        public string Resolve(string type)
        {
            var normalizedType = (type ?? string.Empty).Trim().ToLowerInvariant();
            if (_examType == "objective")
            {
                return "Q1";
            }

            if (_sectionsByType.TryGetValue(normalizedType, out var sectionKey))
            {
                return sectionKey;
            }

            var nextKey = $"Q{_sectionsByType.Count + 1}";
            _sectionsByType[normalizedType] = nextKey;
            return nextKey;
        }
    }

    private void LogExamSaveFailure(string operation, Exception ex)
    {
        if (ex is DbUpdateException dbEx)
        {
            _logger.LogError(
                dbEx,
                "ExamMaker {Operation}: DbUpdateException. Message={Message} Inner={Inner}",
                operation,
                dbEx.Message,
                dbEx.InnerException?.Message);
            foreach (var entry in dbEx.Entries)
            {
                _logger.LogError(
                    "ExamMaker {Operation}: EF entry EntityType={EntityType} State={State}",
                    operation,
                    entry.Entity.GetType().Name,
                    entry.State);
            }
        }
        else
        {
            _logger.LogError(ex, "ExamMaker {Operation}: save failed.", operation);
        }
    }
}
