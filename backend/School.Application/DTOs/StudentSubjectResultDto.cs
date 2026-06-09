namespace School.Application.DTOs;

public class StudentSubjectResultDto
{
    public int SubjectId { get; set; }
    public string? SubjectName { get; set; }

    public int TotalMarks { get; set; }
    public int PassingMarks { get; set; }
    public int ObtainedMarks { get; set; }

    public int Percentage { get; set; }

    /// <summary>Drawing / Stemp: show letter grade instead of numeric obtained marks.</summary>
    public bool UsesGradeDisplay { get; set; }

    /// <summary>Letter grade for Drawing / Stemp rows (A++, A+, …).</summary>
    public string? SubjectGrade { get; set; }
}
