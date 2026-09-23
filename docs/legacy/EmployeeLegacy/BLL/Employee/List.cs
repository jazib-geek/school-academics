using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;

namespace Data.BLL.Employee
{
    public class List
    {
        public static List<v_Employee> All()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_Employee.ToList();
            }
        }
        public static string NameFromID(int? ID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var row = db.tblEmployees.Find(ID);
                if (row != null)
                {
                    return row.EmployeeName;
                }
                return "";
            }
        }

        public static v_Employee GetByID(int? ID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_Employee.Where(x => x.ID == ID).FirstOrDefault();
            }
        }

        public static List<tblEmployeeQualification> Qualification(int? EmpID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.tblEmployeeQualifications.Where(x => x.EmpID == EmpID).ToList();
            }
        }

        public static List<tblEmployeeExperience> Experience(int? EmpID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.tblEmployeeExperiences.Where(x => x.EmpID == EmpID).ToList();
            }
        }
        public static List<tblEmployeeAsset> Asset(int? EmpID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.tblEmployeeAssets.Where(x => x.EmpID == EmpID).ToList();
            }
        }

        public static List<tblEmployeeSubject> Subject(int? EmpID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.tblEmployeeSubjects.Where(x => x.EmpID == EmpID).ToList();
            }
        }

        public static List<tblDesignation> lstDesignation()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.tblDesignations.ToList();
            }
        }
    }
}
