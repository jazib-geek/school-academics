namespace School.Infrastructure.Entities;

public class Class
{
    public int Class_ID { get; set; }

    public string? Class_Name { get; set; }

    public int? BranchID { get; set; }

    public bool? IsActive { get; set; }

    public int? sort_by { get; set; }

    public bool? isHifz { get; set; }
}
