using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;
using Data.Viewmodel;

namespace Data.BLL.Student
{
    public class Family
    {
        public static List<StudentFamilyViewModel> List()
        {
            var lst = new List<StudentFamilyViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var query = from family in db.tblStudentFamilyDetails
                            join occupation in db.tblOccupations on family.FatherOccupationID equals occupation.ID
                            join father_qualif in db.tblDegreeParameters on family.FatherQualificationID equals father_qualif.ID
                            join mother_qualif in db.tblDegreeParameters on family.MotherQualificationID equals mother_qualif.ID
                            select new { family, father_qualif, mother_qualif, occupation };

                foreach (var item in query)
                {
                    lst.Add(new StudentFamilyViewModel()
                    {
                        ID = item.family.ID,
                        FamilyID = item.family.FamilyID,
                        FatherCNIC = item.family.FatherCNIC,
                        FatherEmail = item.family.FatherEmail,
                        FatherMobileNo = item.family.FatherMobileNo,
                        FatherName = item.family.FatherName,
                        FatherOccupationID = item.family.FatherOccupationID,
                        FatherQualificationID = item.family.FatherQualificationID,
                        MotherQualificationID = item.family.MotherQualificationID,
                        MotherName = item.family.MotherName,
                        MotherPhoneNo = item.family.MotherPhoneNo,
                        MotherCNIC = item.family.MotherCNIC,
                        FatherWorkPhone = item.family.FatherWorkPhone,
                        FatherOccupation = item.occupation.Occupation,
                        FatherQualification = item.father_qualif.DegreeTitle,
                        MotherQualification = item.mother_qualif.DegreeTitle,
                        // NumberOfStudents = NumberOfStudentInThisFamily(item.family.FamilyID),
                        NumberOfStudents = 0,
                        // LOGIN AREA
                        Password = item.family.Password
                    });
                }
            }

            return lst;
        }
        public static List<int?> lstIDs()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.v_StudentList.Where(x => x.IsActive == true).GroupBy(i => i.Family_Code).Select(group => group.FirstOrDefault()).ToList();

                return lst.Select(x => x.Family_Code).OrderBy(x => x).ToList();
            }
        }

        public static List<v_StudentList> AccountList()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.v_StudentList.Where(x => x.IsActive == true).ToList();

                return lst.GroupBy(i => i.Family_Code).Select(group => group.FirstOrDefault()).ToList();
            }
        }

        public static StudentFamilyViewModel GetByID(int? ID)
        {
            return List().Where(x => x.FamilyID == ID).FirstOrDefault();
        }

        public static string FamilyLogin(int? ID, string Password)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var row = db.tblStudentFamilyDetails.Where(x => x.FamilyID == ID && x.Password == Password).FirstOrDefault();
                if (row != null)
                {
                    return "allow";
                }
                return "deny";
            }
        }


        public static int NumberOfStudentInThisFamily(int? FamilyID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.tblStudentFamilies.Where(x => x.FamilyID == FamilyID).Count();
            }
        }

        public static List<v_StudentList> GetStudentsOfThisFamily(int? FamilyID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_StudentList.Where(x => x.Family_Code == FamilyID).ToList();
            }
        }
    }
}
