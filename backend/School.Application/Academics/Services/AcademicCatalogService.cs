using Microsoft.EntityFrameworkCore;
using AutoMapper;
using School.Application.Academics.DTOs;
using School.Application.Academics.Interfaces;
using School.Infrastructure.Academics.Data;
using School.Infrastructure.Academics.Entities;

namespace School.Application.Academics.Services;

public class AcademicCatalogService : IAcademicCatalogService
{
    private static readonly HashSet<string> AllowedQuestionTypes = ["mcq", "saq", "laq"];
    private static readonly HashSet<string> AllowedQuestionCategories = ["board", "text", "exercise"];

    private readonly AcademicContext _academicContext;
    private readonly IMapper _mapper;

    public AcademicCatalogService(AcademicContext academicContext, IMapper mapper)
    {
        _academicContext = academicContext;
        _mapper = mapper;
    }

    public async Task<List<AcademicClassDto>> GetClassesAsync()
    {
        return await _academicContext.Classes
            .AsNoTracking()
            .OrderBy(x => x.ClassName)
            .Select(x => new AcademicClassDto
            {
                Id = x.Id,
                ClassName = x.ClassName
            })
            .ToListAsync();
    }

    public async Task<AcademicClassDto?> GetClassByIdAsync(int id)
    {
        return await _academicContext.Classes
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new AcademicClassDto
            {
                Id = x.Id,
                ClassName = x.ClassName
            })
            .FirstOrDefaultAsync();
    }

    public async Task<AcademicClassDto> UpsertClassAsync(UpsertAcademicClassRequestDto request)
    {
        var className = request.ClassName.Trim();
        var classId = request.Id.GetValueOrDefault();
        var entity = classId > 0
            ? await _academicContext.Classes.FirstOrDefaultAsync(x => x.Id == classId)
            : null;

        if (entity == null)
        {
            entity = new AcademicClass();
            _academicContext.Classes.Add(entity);
        }

        entity.ClassName = className;
        await _academicContext.SaveChangesAsync();

        return new AcademicClassDto
        {
            Id = entity.Id,
            ClassName = entity.ClassName
        };
    }

    public async Task<bool> DeleteClassAsync(int id)
    {
        var entity = await _academicContext.Classes.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null)
        {
            return false;
        }

        _academicContext.Classes.Remove(entity);
        await _academicContext.SaveChangesAsync();
        return true;
    }

    public async Task<List<AcademicSubjectDto>> GetSubjectsAsync()
    {
        return await _academicContext.Subjects
            .AsNoTracking()
            .OrderBy(x => x.SubjectName)
            .Select(x => new AcademicSubjectDto
            {
                Id = x.Id,
                SubjectName = x.SubjectName
            })
            .ToListAsync();
    }

    public async Task<AcademicSubjectDto?> GetSubjectByIdAsync(int id)
    {
        return await _academicContext.Subjects
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new AcademicSubjectDto
            {
                Id = x.Id,
                SubjectName = x.SubjectName
            })
            .FirstOrDefaultAsync();
    }

    public async Task<AcademicSubjectDto> UpsertSubjectAsync(UpsertAcademicSubjectRequestDto request)
    {
        var subjectName = request.SubjectName.Trim();
        var subjectId = request.Id.GetValueOrDefault();
        var entity = subjectId > 0
            ? await _academicContext.Subjects.FirstOrDefaultAsync(x => x.Id == subjectId)
            : null;

        if (entity == null)
        {
            entity = new AcademicSubject();
            _academicContext.Subjects.Add(entity);
        }

        entity.SubjectName = subjectName;
        await _academicContext.SaveChangesAsync();

        return new AcademicSubjectDto
        {
            Id = entity.Id,
            SubjectName = entity.SubjectName
        };
    }

    public async Task<bool> DeleteSubjectAsync(int id)
    {
        var entity = await _academicContext.Subjects.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null)
        {
            return false;
        }

        _academicContext.Subjects.Remove(entity);
        await _academicContext.SaveChangesAsync();
        return true;
    }

    public async Task<List<QuestionCatalogDto>> GetQuestionCatalogAsync(int? chapterId = null)
    {
        var query = _academicContext.QuestionsCatalog
            .AsNoTracking()
            .AsQueryable();

        if (chapterId.HasValue && chapterId.Value > 0)
        {
            query = query.Where(x => x.ChapterId == chapterId.Value);
        }

        return await query
            .OrderBy(x => x.Id)
            .Select(x => MapQuestionCatalog(x))
            .ToListAsync();
    }

    public async Task<QuestionCatalogDto?> GetQuestionCatalogByIdAsync(int id)
    {
        return await _academicContext.QuestionsCatalog
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => MapQuestionCatalog(x))
            .FirstOrDefaultAsync();
    }

    public async Task<QuestionCatalogDto> UpsertQuestionCatalogAsync(UpsertQuestionCatalogRequestDto request)
    {
        var type = request.Type.Trim().ToLowerInvariant();
        var category = request.Category.Trim().ToLowerInvariant();

        if (!AllowedQuestionTypes.Contains(type))
        {
            throw new InvalidOperationException("Question type must be one of: mcq, saq, laq.");
        }

        if (!AllowedQuestionCategories.Contains(category))
        {
            throw new InvalidOperationException("Question category must be one of: board, text, exercise.");
        }

        if (type == "mcq" &&
            (string.IsNullOrWhiteSpace(request.McqOpt1) || string.IsNullOrWhiteSpace(request.McqOpt2)))
        {
            throw new InvalidOperationException("MCQ questions require at least option 1 and option 2.");
        }

        var chapterExists = await _academicContext.Chapters.AnyAsync(x => x.Id == request.ChapterId);
        if (!chapterExists)
        {
            throw new InvalidOperationException("Invalid ChapterId.");
        }

        var questionId = request.Id.GetValueOrDefault();
        var entity = questionId > 0
            ? await _academicContext.QuestionsCatalog.FirstOrDefaultAsync(x => x.Id == questionId)
            : null;

        if (entity == null)
        {
            entity = new QuestionCatalog();
            _academicContext.QuestionsCatalog.Add(entity);
        }

        entity.Type = type;
        entity.Category = category;
        entity.ChapterId = request.ChapterId;
        entity.DescriptionText = request.DescriptionText.Trim();
        entity.McqOpt1 = NormalizeNullable(request.McqOpt1);
        entity.McqOpt2 = NormalizeNullable(request.McqOpt2);
        entity.McqOpt3 = NormalizeNullable(request.McqOpt3);
        entity.McqOpt4 = NormalizeNullable(request.McqOpt4);

        await _academicContext.SaveChangesAsync();
        return MapQuestionCatalog(entity);
    }

    public async Task<bool> DeleteQuestionCatalogAsync(int id)
    {
        var entity = await _academicContext.QuestionsCatalog.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null)
        {
            return false;
        }

        _academicContext.QuestionsCatalog.Remove(entity);
        await _academicContext.SaveChangesAsync();
        return true;
    }

    public async Task<List<ChapterDto>> GetChaptersAsync()
    {
        var chapters = await _academicContext.Chapters
            .AsNoTracking()
            .Include(x => x.Class)
            .Include(x => x.Subject)
            .OrderBy(x => x.Class != null ? x.Class.ClassName : string.Empty)
            .ThenBy(x => x.Subject != null ? x.Subject.SubjectName : string.Empty)
            .ThenBy(x => x.ChapterNo)
            .ToListAsync();

        return _mapper.Map<List<ChapterDto>>(chapters);
    }

    public async Task<ChapterDto?> GetChapterByIdAsync(int id)
    {
        var chapter = await _academicContext.Chapters
            .AsNoTracking()
            .Include(x => x.Class)
            .Include(x => x.Subject)
            .FirstOrDefaultAsync(x => x.Id == id);

        return chapter == null ? null : _mapper.Map<ChapterDto>(chapter);
    }

    public async Task<ChapterDto> UpsertChapterAsync(UpsertChapterRequestDto request)
    {
        var chapterName = request.ChapterName.Trim();
        var chapterId = request.Id.GetValueOrDefault();

        if (!await _academicContext.Classes.AnyAsync(x => x.Id == request.ClassId))
        {
            throw new InvalidOperationException("Invalid ClassId.");
        }

        if (!await _academicContext.Subjects.AnyAsync(x => x.Id == request.SubjectId))
        {
            throw new InvalidOperationException("Invalid SubjectId.");
        }

        var duplicateExists = await _academicContext.Chapters.AnyAsync(x =>
            x.Id != chapterId &&
            x.ClassId == request.ClassId &&
            x.SubjectId == request.SubjectId &&
            x.ChapterNo == request.ChapterNo);

        if (duplicateExists)
        {
            throw new InvalidOperationException("Chapter no already exists for the selected class and subject.");
        }

        var entity = chapterId > 0
            ? await _academicContext.Chapters.FirstOrDefaultAsync(x => x.Id == chapterId)
            : null;

        if (entity == null)
        {
            entity = new Chapter();
            _academicContext.Chapters.Add(entity);
        }

        entity.ClassId = request.ClassId;
        entity.SubjectId = request.SubjectId;
        entity.ChapterNo = request.ChapterNo;
        entity.ChapterName = chapterName;

        await _academicContext.SaveChangesAsync();

        var resultEntity = await _academicContext.Chapters
            .AsNoTracking()
            .Include(x => x.Class)
            .Include(x => x.Subject)
            .FirstAsync(x => x.Id == entity.Id);

        return _mapper.Map<ChapterDto>(resultEntity);
    }

    public async Task<bool> DeleteChapterAsync(int id)
    {
        var entity = await _academicContext.Chapters.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null)
        {
            return false;
        }

        _academicContext.Chapters.Remove(entity);
        await _academicContext.SaveChangesAsync();
        return true;
    }

    private static string? NormalizeNullable(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }

    private static QuestionCatalogDto MapQuestionCatalog(QuestionCatalog x)
    {
        return new QuestionCatalogDto
        {
            Id = x.Id,
            Type = x.Type,
            Category = x.Category,
            ChapterId = x.ChapterId,
            DescriptionText = x.DescriptionText,
            McqOpt1 = x.McqOpt1,
            McqOpt2 = x.McqOpt2,
            McqOpt3 = x.McqOpt3,
            McqOpt4 = x.McqOpt4
        };
    }
}
