using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.API.Filters;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class ExamController : ControllerBase
{
    private readonly IExamService _examService;

    public ExamController(IExamService examService)
    {
        _examService = examService;
    }

    [HttpGet("types")]
    public async Task<IActionResult> GetExamTypes()
    {
        var types = await _examService.GetExamTypesAsync();
        return Ok(types);
    }

    [HttpPost("entry/load")]
    public async Task<IActionResult> LoadExamEntryMatrix([FromBody] LoadExamEntryMatrixRequestDto request)
    {
        var matrix = await _examService.LoadExamEntryMatrixAsync(request.SectionId, request.ExamTypeId);

        if (matrix == null)
            return NotFound(new { message = "Class or exam type was not found." });

        return Ok(matrix);
    }

    [HttpPost("entry/add-missing-students")]
    public async Task<IActionResult> AddMissingExamEntryStudents([FromBody] LoadExamEntryMatrixRequestDto request)
    {
        var matrix = await _examService.AddMissingExamEntryStudentsAsync(request.SectionId, request.ExamTypeId);

        if (matrix == null)
            return NotFound(new { message = "Class or exam type was not found." });

        return Ok(matrix);
    }

    /// <summary>POST is offered in addition to PUT: some hosts/WAFs return 403 + HTML for PUT while POST succeeds.</summary>
    [HttpPost("entry/cells/{examId:int}")]
    [HttpPut("entry/cells/{examId:int}")]
    public async Task<IActionResult> UpdateExamEntryCell(int examId, [FromBody] UpdateExamEntryCellRequestDto request)
    {
        try
        {
            var cell = await _examService.UpdateExamEntryCellAsync(examId, request.ObtainedMarks);

            if (cell == null)
                return NotFound(new { message = "Exam cell was not found." });

            return Ok(cell);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>POST is offered in addition to PUT: some hosts/WAFs return 403 + HTML for PUT while POST succeeds.</summary>
    [HttpPost("entry/subject-marks")]
    [HttpPut("entry/subject-marks")]
    public async Task<IActionResult> UpdateExamEntrySubjectMarks([FromBody] UpdateExamEntrySubjectMarksRequestDto request)
    {
        try
        {
            var matrix = await _examService.UpdateExamEntrySubjectMarksAsync(request);

            if (matrix == null)
                return NotFound(new { message = "Subject was not found in this exam." });

            return Ok(matrix);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>POST is offered in addition to PUT: some hosts/WAFs return 403 + HTML for PUT while POST succeeds.</summary>
    [HttpPost("entry/attendance")]
    [HttpPut("entry/attendance")]
    public async Task<IActionResult> UpdateExamEntryAttendance([FromBody] UpdateExamEntryAttendanceRequestDto request)
    {
        try
        {
            var matrix = await _examService.UpdateExamEntryAttendanceAsync(request);

            if (matrix == null)
                return NotFound(new { message = "Student exam rows were not found." });

            return Ok(matrix);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("entry/available-subjects")]
    public async Task<IActionResult> GetAvailableExamEntrySubjects(
        [FromQuery] int sectionId,
        [FromQuery] int examTypeId)
    {
        var subjects = await _examService.GetAvailableExamEntrySubjectsAsync(sectionId, examTypeId);
        return Ok(subjects);
    }

    [HttpPost("entry/subjects")]
    public async Task<IActionResult> AddExamEntrySubject([FromBody] AddExamEntrySubjectRequestDto request)
    {
        try
        {
            var matrix = await _examService.AddExamEntrySubjectAsync(request);

            if (matrix == null)
                return NotFound(new { message = "Class, exam type, or subject was not found." });

            return Ok(matrix);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>POST delete route for Plesk/proxies that block HTTP DELETE.</summary>
    [HttpPost("entry/subjects/{subjectId:int}/delete")]
    [HttpDelete("entry/subjects/{subjectId:int}")]
    public async Task<IActionResult> DeleteExamEntrySubject(
        int subjectId,
        [FromQuery] int sectionId,
        [FromQuery] int examTypeId)
    {
        var matrix = await _examService.DeleteExamEntrySubjectAsync(sectionId, examTypeId, subjectId);

        if (matrix == null)
            return NotFound(new { message = "Subject was not found in this exam." });

        return Ok(matrix);
    }

    [HttpGet("subject-component-entry")]
    public async Task<IActionResult> LoadSubjectComponentEntry(
        [FromQuery] int sectionId,
        [FromQuery] int examTypeId,
        [FromQuery] int subjectId)
    {
        var matrix = await _examService.LoadSubjectComponentEntryAsync(sectionId, examTypeId, subjectId);

        if (matrix == null)
            return NotFound(new { message = "Class, exam type, subject, or exam rows were not found." });

        return Ok(matrix);
    }

    [HttpPost("subject-component-entry/headers")]
    public async Task<IActionResult> AddSubjectComponentHeader([FromBody] AddExamSubjectComponentHeaderRequestDto request)
    {
        try
        {
            var matrix = await _examService.AddSubjectComponentHeaderAsync(request);

            if (matrix == null)
                return NotFound(new { message = "Class, exam type, subject, or exam rows were not found." });

            return Ok(matrix);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>POST delete route for Plesk/proxies that block HTTP DELETE.</summary>
    [HttpPost("subject-component-entry/headers/{headerId:int}/delete")]
    [HttpDelete("subject-component-entry/headers/{headerId:int}")]
    public async Task<IActionResult> DeleteSubjectComponentHeader(
        int headerId,
        [FromQuery] int sectionId,
        [FromQuery] int examTypeId,
        [FromQuery] int subjectId)
    {
        var matrix = await _examService.DeleteSubjectComponentHeaderAsync(sectionId, examTypeId, subjectId, headerId);

        if (matrix == null)
            return NotFound(new { message = "Header was not found." });

        return Ok(matrix);
    }

    /// <summary>POST is offered in addition to PUT: some hosts/WAFs return 403 + HTML for PUT while POST succeeds.</summary>
    [HttpPost("subject-component-entry/marks")]
    [HttpPut("subject-component-entry/marks")]
    public async Task<IActionResult> SaveSubjectComponentMarks([FromBody] SaveExamSubjectComponentMarksRequestDto request)
    {
        try
        {
            var matrix = await _examService.SaveSubjectComponentMarksAsync(request);

            if (matrix == null)
                return NotFound(new { message = "Class, exam type, subject, or exam rows were not found." });

            return Ok(matrix);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("mark-sheet")]
    public async Task<IActionResult> GetExamMarkSheet(
        [FromQuery] int sectionId,
        [FromQuery] int examTypeId,
        [FromQuery] bool includeDrawing = false,
        [FromQuery] bool includeStemp = false,
        [FromQuery] string sortBy = "position")
    {
        var options = new ExamAggregationOptions
        {
            IncludeDrawingInTotals = includeDrawing,
            IncludeStempInTotals = includeStemp
        };

        var sheet = await _examService.GetExamMarkSheetAsync(sectionId, examTypeId, options, sortBy);

        if (sheet == null)
            return NotFound(new { message = "No exam mark sheet found for this class and exam type." });

        return Ok(sheet);
    }

    [HttpGet("teacher-analysis")]
    [AuthorizeCampusOrCoordinator]
    public async Task<IActionResult> GetTeacherExamAnalysis(
        [FromQuery] int sectionId,
        [FromQuery] int employeeId,
        [FromQuery] int examTypeId,
        [FromQuery] bool includeDrawing = false,
        [FromQuery] bool includeStemp = false)
    {
        var options = new ExamAggregationOptions
        {
            IncludeDrawingInTotals = includeDrawing,
            IncludeStempInTotals = includeStemp
        };

        var report = await _examService.GetTeacherExamAnalysisAsync(sectionId, employeeId, examTypeId, options);

        if (report == null)
            return NotFound(new { message = "No teacher exam analysis found for this class, teacher, and exam type." });

        return Ok(report);
    }

    [HttpGet("teacher-performance-grid")]
    [AuthorizeCampusOrCoordinator]
    public async Task<IActionResult> GetTeacherPerformanceGrid(
        [FromQuery] int employeeId,
        [FromQuery] bool includeDrawing = false,
        [FromQuery] bool includeStemp = false)
    {
        var options = new ExamAggregationOptions
        {
            IncludeDrawingInTotals = includeDrawing,
            IncludeStempInTotals = includeStemp
        };

        var report = await _examService.GetTeacherPerformanceGridAsync(employeeId, options);

        if (report == null)
            return NotFound(new { message = "No teacher performance grid found for this teacher." });

        return Ok(report);
    }

    [HttpGet("{studentId:int}/result/{examTypeId:int}")]
    public async Task<IActionResult> GetStudentResult(
        int studentId,
        int examTypeId,
        [FromQuery] bool includeDrawing = false,
        [FromQuery] bool includeStemp = false)
    {
        var options = new ExamAggregationOptions
        {
            IncludeDrawingInTotals = includeDrawing,
            IncludeStempInTotals = includeStemp
        };

        var result = await _examService.GetStudentResultAsync(studentId, examTypeId, options);

        if (result == null)
            return NotFound(new { message = "No exam result found for this student and exam type." });

        return Ok(result);
    }
}
