namespace School.Infrastructure.Entities;

public class EmployeeClass
{
    public int ID { get; set; }
    public int? EmpID { get; set; }
    public int? ClassID { get; set; }
    public int? SubjectID { get; set; }

    public Employee? Employee { get; set; }
    public Section? Section { get; set; }
    public SubjectMaster? Subject { get; set; }
}
