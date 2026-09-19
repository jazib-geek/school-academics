using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace School.Application.DTOs
{
    public class StudentDto
    {
        public int RegId { get; set; }

        public string? FullName { get; set; }

        public int? Family_Code { get; set; }
        public DateTime? DateOfBirth { get; set; }

        public int? ClassCompositeID { get; set; }
        public string? ClassName { get; set; }
        public string? Gender { get; set; }
        public int? Fee { get; set; }
        public decimal? FeeConcession { get; set; }
        public decimal? TutionFee { get; set; }

        public bool? IsActive { get; set; }
    }
}
