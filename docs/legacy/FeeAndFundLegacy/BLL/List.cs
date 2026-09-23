using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;
using Data.Viewmodel;

namespace Data.BLL.FeeAndFund
{
    public class List
    {
        public static List<v_FeeAndFundCollection> All()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_FeeAndFundCollection.ToList();
            }
        }
        //////////////////////////// DUE FEE START (WITH OVERLOADS)
        public static List<v_FeeMonthlyBalance> DueFee()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_FeeMonthlyBalance.Where(x => x.Balance > 0 && x.FundTypeID == 1).ToList();
            }
        }

        public static List<v_FeeMonthlyBalance> DueFee(int? ClassID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_FeeMonthlyBalance.Where(x => x.Balance > 0 && x.FundTypeID == 1 && x.ClassID == ClassID).ToList();
            }
        }

        public static List<v_FeeMonthlyBalance> DueFee(int? Month, int? Year)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_FeeMonthlyBalance.Where(x => x.Balance > 0 && x.FundTypeID == 1 && x.Month == Month && x.Year == Year).ToList();
            }
        }


        ////////////////////////////////////////////////  DUE FUNDS END ////////////////////////////////////////

        //////////////////////////// DUE FEE START (WITH OVERLOADS)
        public static List<v_FeeMonthlyBalance> DueFunds()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_FeeMonthlyBalance.Where(x => x.Balance > 0 && x.FundTypeID != 1).ToList();
            }
        }

        public static List<v_FeeMonthlyBalance> DueFunds(int? ClassID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_FeeMonthlyBalance.Where(x => x.Balance > 0 && x.FundTypeID != 1 && x.ClassID == ClassID).ToList();
            }
        }

        public static List<v_FeeMonthlyBalance> DueFunds(int? FundTypeID, string Alt)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_FeeMonthlyBalance.Where(x => x.Balance > 0 && x.FundTypeID == FundTypeID).ToList();
            }
        }




        ////////////////////////////////////////////////  TRANSACTIONS START ////////////////////////////////////////


        public static List<v_FeeAndFundCollection> ByDate(DateTime? Date)
        {
            var lst = new List<FeeViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var query = db.v_FeeAndFundCollection.Where(x => x.Recieved > 0 && x.Date == Date).ToList();

                return query;
            }
        }


        public static List<v_FeeAndFundCollection> ByInterval(DateTime? From, DateTime? To)
        {
            var lst = new List<FeeViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var query = db.v_FeeAndFundCollection.Where(x => x.Date >= From && x.Date <= To && x.Recieved > 0).ToList();

                return query;
            }
        }

        public static List<v_FeeAndFundCollection> ByStudentID(int? StudentID)
        {
            var lst = new List<FeeViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                // GENERATED
                //var query = from fee in db.tblFeeAndFundCollections
                //            join student in db.tblStudents on fee.StudentID equals student.Reg_Id
                //            join Class in db.tblSections on fee.ClassID equals Class.ID
                //            where fee.StudentID == StudentID && fee.Recieved > 0
                //            select new { student, Class, fee };

                var query = db.v_FeeAndFundCollection.Where(x => x.StudentID == StudentID && x.Recieved > 0).ToList();

              return query;
            }
        }

        public static List<FeeViewModel> ByName(string StudentName)
        {
            var lstGenerared = new List<FeeViewModel>();
            var lst = new List<FeeViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                // GENERATED
                var query = from fee in db.tblFeeAndFundCollections
                            join student in db.tblStudents on fee.StudentID equals student.Reg_Id
                            join Class in db.tblSections on fee.ClassID equals Class.ID
                            where student.FullName.ToLower().Contains(StudentName) && fee.Recieved > 0
                            select new { student, Class, fee };

                foreach (var item in query)
                {
                    lstGenerared.Add(new FeeViewModel()
                    {
                        TrxID = item.fee.TransactionID,
                        StudentRegID = item.student.Reg_Id,
                        Month = item.fee.Month,
                        FundType = item.fee.Type,
                        student = item.student,
                        ClassSection = item.Class.ClassName,
                        Year = item.fee.Year,
                        TotalAmount = item.fee.Payment,
                        AmountPaid = item.fee.Recieved
                    });
                }

                return lst;
            }
        }

        ////////////////////////////////////////////////  TRANSACTIONS END ////////////////////////////////////////

        public static List<StudentViewModel> Concession()
        {
            var lst = new List<StudentViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var query = from student in db.tblStudents
                            join locality in db.tblLocalities on student.LocalityID equals locality.ID
                            join Class in db.tblSections on student.ClassCompositeID equals Class.ID
                            join familyDetail in db.tblStudentFamilyDetails on student.Family_Code equals familyDetail.FamilyID
                            select new { student, Class, locality, familyDetail, };

                foreach (var item in query)
                {
                    lst.Add(new StudentViewModel()
                    {
                        Reg_Id = item.student.Reg_Id,
                        FullName = item.student.FullName,
                        FatherName = item.familyDetail.FatherName,
                        ClassCompositeID = item.student.ClassCompositeID,
                        FatherContactNumber = item.familyDetail.FatherMobileNo,
                        Class_ID = item.student.Class_ID,
                        Section_ID = item.student.Section_ID,
                        ClassSection = item.Class.ClassName,
                        Fee = item.student.Fee,
                        TutionFee = item.student.TutionFee,
                        FeeConcession = item.student.FeeConcession,
                    });
                }
            }

            return lst;
        }

        public static List<StudentViewModel> FamilyFee()
        {
            var lst = new List<StudentViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var query = from student in db.tblStudents
                            join locality in db.tblLocalities on student.LocalityID equals locality.ID
                            join Class in db.tblSections on student.ClassCompositeID equals Class.ID
                            join familyDetail in db.tblStudentFamilyDetails on student.Family_Code equals familyDetail.FamilyID
                            where student.IsActive == true
                            select new { student, Class, locality, familyDetail, };

                foreach (var item in query)
                {
                    lst.Add(new StudentViewModel()
                    {
                        Reg_Id = item.student.Reg_Id,
                        FullName = item.student.FullName,
                        Reg_Date = item.student?.RegDate,
                        FatherName = item.familyDetail.FatherName,
                        FatherContactNumber = item.familyDetail.FatherMobileNo,
                        ClassCompositeID = item.student.ClassCompositeID,
                        Class_ID = item.student.Class_ID,
                        Section_ID = item.student.Section_ID,
                        ClassSection = item.Class.ClassName,
                        Fee = item.student.Fee,
                        TutionFee = item.student.TutionFee,
                        FeeConcession = item.student.FeeConcession,
                    });
                }
            }

            return lst;
        }

        public static List<StudentViewModel> FamilyFee(int? FamilyID)
        {
            var lst = new List<StudentViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var query = from student in db.tblStudents
                            join locality in db.tblLocalities on student.LocalityID equals locality.ID
                            join Class in db.tblSections on student.ClassCompositeID equals Class.ID
                            join familyDetail in db.tblStudentFamilyDetails on student.Family_Code equals familyDetail.FamilyID
                            where student.Family_Code == FamilyID && student.IsActive == true
                            select new { student, Class, locality, familyDetail, };

                foreach (var item in query)
                {
                    lst.Add(new StudentViewModel()
                    {
                        Reg_Id = item.student.Reg_Id,
                        FullName = item.student.FullName,
                        Reg_Date = item.student?.RegDate,
                        FatherName = item.familyDetail.FatherName,
                        FatherContactNumber = item.familyDetail.FatherMobileNo,
                        ClassCompositeID = item.student.ClassCompositeID,
                        Class_ID = item.student.Class_ID,
                        Section_ID = item.student.Section_ID,
                        ClassSection = item.Class.ClassName,
                        Fee = item.student.Fee,
                        TutionFee = item.student.TutionFee,
                        FeeConcession = item.student.FeeConcession,
                    });
                }
            }

            return lst;
        }

        public static List<StudentViewModel> Receivables(int? ClassID)
        {
            var lst = new List<StudentViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var StdList = Student.List.All(ClassID).Where(x => x.IsActive == true).ToList();

                foreach (var item in StdList)
                {
                    lst.Add(new StudentViewModel()
                    {
                        Reg_Id = item.Reg_Id,
                        FullName = item.FullName,
                        ActualFee = Convert.ToInt32(item.TutionFee),
                        TutionFee = Balance.FundsBalance_ByType(item.Reg_Id , 1),
                        AdmissionFee = Balance.FundsBalance_ByType(item.Reg_Id, 2),
                        FundType_1 = Balance.FundsBalance_ByType(item.Reg_Id, 3),
                        FundType_2 = Balance.FundsBalance_ByType(item.Reg_Id, 4),
                        FundType_3 = Balance.FundsBalance_ByType(item.Reg_Id, 5),
                        Balance_Total = Balance.NetBalance(item.Reg_Id)
                    });
                }

                return lst;
            }
        }

        // List of Fund Type
        public static List<tblFundType> FundTypes()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.tblFundTypes.ToList();
            }
        }

        public static List<tblFeeAndFundCollection> lstDistinctDate()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.tblFeeAndFundCollections.Where(x => x.Recieved > 0).ToList();

                var distinctlst = lst.GroupBy(g => new { g.Date })
                              .Select(g => g.First())
                              .ToList();

                return distinctlst;
            }
        }
    }
}
