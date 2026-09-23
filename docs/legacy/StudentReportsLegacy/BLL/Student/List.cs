using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;
using Data.BLL;
using Data.Viewmodel;
using System.Runtime.Remoting.Contexts;

namespace Data.BLL.Student
{
    public class List
    {
        public static List<v_StudentList> All()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_StudentList.Where(x => x.IsActive == true).ToList();              
            }
        }

        public static List<v_StudentList> All(int? ClassID)
        {
            return All().Where(x => x.ClassCompositeID == ClassID && x.IsActive == true).ToList();
        }

        public static List<v_StudentList> Deactivated()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_StudentList.Where(x => x.IsActive == false).ToList();
            }
        }
        
        public static v_StudentList GetByID(int? id)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_StudentList.Where(x => x.Reg_Id == id).FirstOrDefault();
            }
        }
        public static List<v_StudentList> GetByFamilyID(int? FamilyID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_StudentList.Where(x => x.Family_Code == FamilyID).ToList();
            }
        }

        // Deactivate Student
        public static void DeactivateThisStudent(int? id, string Reason)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblStudent find = db.tblStudents.Where(x => x.Reg_Id == id).FirstOrDefault();
                if (find != null)
                {
                    find.IsActive = false;
                    find.Leave_Date = DateTime.Now.AddHours(10).Date;
                    db.SaveChanges();

                    Log.StudentLog.InsertLog(id.Value, "Left", DateFunctions.GetCurrentDate(), Reason);
                }
            }
        }
        public static void ActivateThisStudent(int? id, string Reason)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblStudent find = db.tblStudents.Where(x => x.Reg_Id == id).FirstOrDefault();
                if (find != null)
                {
                    find.IsActive = true;
                    db.SaveChanges();

                    Log.StudentLog.InsertLog(id.Value, "Re-Activated", DateFunctions.GetCurrentDate(), Reason);
                }
            }
        }

        public static void DeleteStudentPermanently(int? ID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                db.Database.ExecuteSqlCommand("delete from tblStudent where Reg_Id = " + ID);
                db.Database.ExecuteSqlCommand("delete from tblStudentLog where StudentID ="  + ID);
                db.Database.ExecuteSqlCommand("delete from tblFeeAndFundCollection where StudentID =" + ID);
                db.Database.ExecuteSqlCommand("delete from tblExam where StudentID =" + ID);
                db.Database.ExecuteSqlCommand("delete from tblAttendance where StudentID =" + ID);
            }
        }

        #region Alt List (lesser columns for faster loading)
        public static List<v_AltStudentList> ALT()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_AltStudentList.Where(x => x.IsActive == true).ToList();
            }
        }
        public static List<v_AltStudentList> ALT_D()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_AltStudentList.Where(x => x.IsActive == false).ToList();
            }
        }
        #endregion

        public static List<string> Types()
        {
            var lst = new List<string>
            {
                "Day Scholar",
                "Hostelized",
                "Married Quarters"
            };

            return lst;
        }

        #region Counts
        public static int StudentCount(int? IsActive = null)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                string Query = "SELECT COUNT(*) FROM tblStudent where 1=1";
                if (IsActive != null)
                {
                    Query += $" And IsActive = {IsActive}";
                }

                var studentCount = db.Database.SqlQuery<int>(Query).Single();

                return studentCount;
            }
        }
        #endregion
    }
}
