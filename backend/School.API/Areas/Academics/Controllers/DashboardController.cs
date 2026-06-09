using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    public IActionResult Get()
    {
        var data = new
        {
            classes = _academicContext.Classes.Count(),
            subjects = _academicContext.Subjects.Count(),
            chapters = _academicContext.Chapters.Count(),
            questionPapers = _academicContext.QuestionPapers.Count(),
            questions = _academicContext.QuestionsCatalog.Count()
        };

        return Ok(ApiResponse<object>.SuccessResponse(data));
    }
}
