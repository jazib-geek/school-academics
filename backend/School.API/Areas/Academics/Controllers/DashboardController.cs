using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Infrastructure.Academics.Data;

namespace School.API.Areas.Academics.Controllers;

[Area("Academics")]
[ApiController]
[Authorize(Policy = "AcademicsOnly")]
[Route("api/academics/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly AcademicContext _academicContext;

    public DashboardController(AcademicContext academicContext)
    {
        _academicContext = academicContext;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var questionTypeRows = await _academicContext.QuestionsCatalog
            .AsNoTracking()
            .GroupBy(q => q.Type)
            .Select(g => new { Type = g.Key, Count = g.Count() })
            .ToListAsync();

        static int CountForType(IEnumerable<(string Type, int Count)> rows, string type) =>
            rows.FirstOrDefault(r => string.Equals(r.Type, type, StringComparison.OrdinalIgnoreCase)).Count;

        var typedRows = questionTypeRows
            .Select(r => (Type: r.Type ?? string.Empty, Count: r.Count))
            .ToList();

        var recentPapers = await _academicContext.QuestionPapers
            .AsNoTracking()
            .Include(x => x.Class)
            .Include(x => x.Subject)
            .Include(x => x.ExamTitle)
            .OrderByDescending(x => x.CreatedOn)
            .Take(6)
            .Select(x => new
            {
                x.Id,
                x.PaperName,
                x.ExamType,
                x.TotalMarks,
                x.CreatedOn,
                ClassName = x.Class != null ? x.Class.ClassName : string.Empty,
                SubjectName = x.Subject != null ? x.Subject.SubjectName : string.Empty,
                ExamTitle = x.ExamTitle != null ? x.ExamTitle.Title : null
            })
            .ToListAsync();

        var chaptersWithoutQuestions = await _academicContext.Chapters
            .AsNoTracking()
            .CountAsync(c => !c.Questions.Any());

        var data = new
        {
            classes = await _academicContext.Classes.CountAsync(),
            subjects = await _academicContext.Subjects.CountAsync(),
            chapters = await _academicContext.Chapters.CountAsync(),
            questionPapers = await _academicContext.QuestionPapers.CountAsync(),
            questions = await _academicContext.QuestionsCatalog.CountAsync(),
            examTitles = await _academicContext.ExamTitles.CountAsync(),
            chaptersWithoutQuestions,
            questionBreakdown = new
            {
                mcq = CountForType(typedRows, "mcq"),
                saq = CountForType(typedRows, "saq"),
                laq = CountForType(typedRows, "laq"),
                numerical = CountForType(typedRows, "numerical"),
            },
            recentPapers
        };

        return Ok(ApiResponse<object>.SuccessResponse(data));
    }
}
