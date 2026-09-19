namespace School.Infrastructure.Entities;

public class StudentFamilyDetail
{
    public int ID { get; set; }

    public int? FamilyID { get; set; }

    public string? FatherName { get; set; }

    public string? FatherCNIC { get; set; }

    public int? FatherQualificationID { get; set; }

    public int? FatherOccupationID { get; set; }

    public string? FatherMobileNo { get; set; }

    public string? FatherWorkPhone { get; set; }

    public string? FatherEmail { get; set; }

    public string? MotherName { get; set; }

    public string? MotherCNIC { get; set; }

    public string? MotherPhoneNo { get; set; }

    public int? MotherQualificationID { get; set; }

    public int? MotherOccupationID { get; set; }

    public string? Password { get; set; }

    public bool? IsActive { get; set; }

    public string? HomePhone { get; set; }

    public string? HomeAddress { get; set; }


    public ICollection<Student> Students { get; set; } = new List<Student>();
}
