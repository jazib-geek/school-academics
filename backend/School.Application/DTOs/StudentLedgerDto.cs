namespace School.Application.DTOs;

public class StudentLedgerDto
{
    public int Id { get; set; }

    public DateTime? Date { get; set; }

    public string? Description { get; set; }

    public decimal Debit { get; set; }

    public decimal Credit { get; set; }

    public decimal Balance { get; set; }
}
