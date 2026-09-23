using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Data.DAL;

namespace Data.BLL.Student
{
    public class Contacts
    {
        public static string GetFatherContact(int? StudentID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var Row = db.tblStudents.Find(StudentID);

                if (Row != null)
                {
                    int? FamilyID = Row.Family_Code;

                    return db.tblStudentFamilyDetails.Where(x => x.FamilyID == FamilyID).First().FatherMobileNo;
                }
            }

            return "";
        }
    }
}
