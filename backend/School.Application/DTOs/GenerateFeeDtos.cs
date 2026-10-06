namespace School.Application.DTOs;

public class GenerateFeeAllRequestDto
{
    public int Month { get; set; }
    public int Year { get; set; }
}

public class GenerateFeeStudentRequestDto
{
    public int StudentId { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }

    /// <summary>
    /// Use -1 to charge the student's stored tuition fee; otherwise a custom amount (0 allowed).
    /// </summary>
    public decimal Amount { get; set; }
}

public class FeeGenerateStudentPeriodDto
{
    public decimal Generated { get; set; }

    public decimal Received { get; set; }

    public bool HasReceipts => Received > 0;

    public decimal MinimumCharge => Received;
}
