using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;
using Data.Viewmodel;

namespace Data.BLL.FeeAndFund
{
    public class Fee
    {
        public static List<FeeViewModel> lstFamilyFee(int? FamilyID)
        {
            var lst = new List<FeeViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var query = from fee in db.tblFeeAndFundCollections
                            join student in db.tblStudents on fee.StudentID equals student.Reg_Id
                            join section in db.tblSections on fee.ClassID equals section.ID
                            where student.Family_Code == FamilyID && student.IsActive == true && fee.Recieved == 0
                            select new { fee, student, section };

                foreach (var item in query)
                {
                    var model = new FeeViewModel()
                    {
                        ID = item.fee.ID,
                        StudentRegID = item.fee.StudentID,
                        ClassID = item.student.ClassCompositeID,
                        SectionID = item.student.Section_ID,
                        CompositeID = item.fee.ClassID,
                        student = item.student,
                        Type = item.fee.Type,
                        FundTypeID = item.fee.FundTypeID,
                        ClassSection = item.section.ClassName,
                        Month = item.fee.Month,
                        Year = item.fee.Year,
                        TotalAmount = item.fee.Payment,
                        AmountDue = Balance.NetBalance(item.fee.StudentID, item.fee.FundTypeID, item.fee.Month, item.fee.Year),
                        ReceiveNow = 0
                    };

                    lst.Add(model);
                }
            }

            return lst;
        }

        public static void UpdateFeeOfThisStudent(int? StudentID, int? TotalFee, int? TutionFee, int? Concession)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                tblStudent Student = db.tblStudents.Find(StudentID);

                if (Student != null)
                {
                    Student.Fee = TotalFee;
                    Student.TutionFee = TutionFee;
                    Student.FeeConcession = Concession;

                    db.SaveChanges();

                    // Record LOG

                    Log.StudentLog.InsertLog(StudentID.Value, "Fee Changed", DateFunctions.GetCurrentDate(), "Fee Updated to " + TutionFee + " from Fee Update Module");

                }
            }
        }


        public static List<StudentViewModel> BalanceSheet()
        {
            var lst = new List<StudentViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var query = from student in db.tblStudents
                            join Class in db.tblSections on student.ClassCompositeID equals Class.ID
                            where student.IsActive == true
                            select new { student.Reg_Id, student.FullName, Class, };

                foreach (var item in query)
                {
                    lst.Add(new StudentViewModel()
                    {
                        Reg_Id = item.Reg_Id,
                        FullName = item.FullName,
                        Class_ID = item.Class.Class_ID,
                        Section_ID = item.Class.SectionID,
                        ClassCompositeID = item.Class.ID,
                        ClassSection = item.Class.ClassName,
                        Balance_Total = Balance.NetBalance(item.Reg_Id)
                    });
                }

                return lst.Where(x => x.Balance_Total > 0).ToList();
            }
        }

        public static List<StudentViewModel> BalanceSheet(int? ClassID)
        {
            var lst = new List<StudentViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var query = from student in db.tblStudents
                            join Class in db.tblSections on student.ClassCompositeID equals Class.ID
                            where student.IsActive == true && student.ClassCompositeID == ClassID
                            select new { student.Reg_Id, student.FullName, Class, student.ClassCompositeID };

                foreach (var item in query)
                {
                    lst.Add(new StudentViewModel()
                    {
                        Reg_Id = item.Reg_Id,
                        FullName = item.FullName,
                        Class_ID = item.Class.Class_ID,
                        Section_ID = item.Class.SectionID,
                        ClassCompositeID = item.ClassCompositeID,
                        ClassSection = item.Class.ClassName,
                        Balance_Total = Balance.NetBalance(item.Reg_Id)
                    });
                }

                return lst.Where(x => x.Balance_Total > 0).ToList();
            }
        }

        public static void ChangeFee(int? ID, int? Fee, string Gender, string Branch, bool? IsHifz)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var row = db.tblSections.Find(ID);
                if (row != null)
                {
                    row.Fee = Fee;
                    row.Branch = Branch;
                    row.Section_Gender = Gender;
                    row.IsHifz = IsHifz;
                    db.SaveChanges();
                }
            }
        }

        public static void IncrementClassFee(int? ClassCompositeID, decimal? IncrementAmount)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                db.Database.ExecuteSqlCommand("exec sp_UpdateClassFee '" + ClassCompositeID + "' , '" + IncrementAmount + "'");
            }
        }
    }
}
