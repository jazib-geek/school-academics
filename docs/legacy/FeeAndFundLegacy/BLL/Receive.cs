using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;
using Data.Viewmodel;

namespace Data.BLL.FeeAndFund
{
    public class Receive
    {
        public static List<ReceiptViewModel> lstReceipt()
        {
            List<ReceiptViewModel> lstRcpt = new List<ReceiptViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var query = from rcpt in db.tblFeeAndFundCollections
                            join student in db.tblStudents on rcpt.StudentID equals student.Reg_Id
                            join Class in db.tblSections on rcpt.ClassID equals Class.ID
                            where rcpt.Recieved > 0
                            select new { rcpt, student, Class };

                foreach (var item in query)
                {
                    lstRcpt.Add(new ReceiptViewModel()
                    {
                        TransactionID = item.rcpt.TransactionID,
                        StudentID = item.rcpt.StudentID,
                        ClassCompositeID = item.rcpt.ClassID,
                        Month = item.rcpt.Month,
                        Year = item.rcpt.Year,
                        Amount = item.rcpt.Recieved,
                        Date = item.rcpt.Date,
                        // Time = item.rcpt.Time,
                        Type = item.rcpt.Type,
                        classname = item.Class.ClassName,
                        ///////////
                        student = item.student,
                    });
                }

                return lstRcpt;
            }
        }

        public static void ReceiveFee(int? TrxID, List<FeeViewModel> lstFee, DateTime? date, string ReceivedBy, string ManualRcptNo)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                if (lstFee.Where(x => x.ReceiveNow > 0).Count() > 0)
                {
                    // Insert in Receipt Table
                    foreach (var item in lstFee.Where(x => x.ReceiveNow > 0 && x.FundTypeID != 6))
                    {
                        tblFeeAndFundCollection rcpt_fund = new tblFeeAndFundCollection()
                        {
                            StudentID = item.StudentRegID,
                            TransactionID = TrxID,
                            FundTypeID = item.FundTypeID,
                            Type = item.Type,
                            ClassID = item.ClassID,
                            Month = item.Month,
                            Year = item.Year,
                            Date = date,
                            SessionYear = "2019-2020",
                            //BranchID = 1,
                            Time = DateFunctions.GetCurrentTime(),
                            Payment = 0,
                            Recieved = item.ReceiveNow,
                            Discount = item.Discount,
                            ReceivedBy = ReceivedBy,
                            VoidAmount = 0,
                            ManualRcptNo = ManualRcptNo
                        };
                        db.tblFeeAndFundCollections.Add(rcpt_fund);
                        db.SaveChanges();
                    }

                    // Receive Fine
                    var lstFine = lstFee.Where(x => x.ReceiveNow > 0 && x.FundTypeID == 6);
                    if (lstFine.Count() > 0)
                    {
                        var Fine = lstFine.FirstOrDefault();
                        // first generate
                        if (Fine != null)
                        {
                            Generate.GenerateFine(Fine.StudentRegID, Fine.FundTypeID, Fine.Month, Fine.Year, Fine.ReceiveNow);

                            // Then recieve equalent amount
                            tblFeeAndFundCollection rcpt_fine = new tblFeeAndFundCollection()
                            {
                                StudentID = Fine.StudentRegID,
                                TransactionID = TrxID,
                                FundTypeID = Fine.FundTypeID,
                                Type = Fine.Type,
                                ClassID = Fine.ClassID,
                                Month = Fine.Month,
                                Year = Fine.Year,
                                Date = date,
                                SessionYear = "2019-2020",
                                //BranchID = 1,
                                Time = DateFunctions.GetCurrentTime(),
                                Payment = 0,
                                Recieved = Fine.ReceiveNow,
                                Discount = Fine.Discount,
                                ReceivedBy = ReceivedBy,
                                VoidAmount = 0,
                                ManualRcptNo = ManualRcptNo
                            };
                            db.tblFeeAndFundCollections.Add(rcpt_fine);
                            db.SaveChanges();
                        }
                    }

                    // Update Rcpt ID for each Receipt
                    var lstTrx = db.tblFeeAndFundCollections.Where(x => x.TransactionID == TrxID).ToList();
                    if (lstTrx.Count > 0)
                    {
                        var lstDistinct = lstTrx.GroupBy(i => i.StudentID).Select(group => group.First());
                        foreach (var item in lstDistinct)
                        {
                            var RcptID = GenerateRcptID();
                            db.Database.ExecuteSqlCommand("update tblFeeAndFundCollection set RcptID = " + RcptID + " Where TransactionID = " + TrxID + " AND StudentID = " + item.StudentID + "");
                        }
                    }
                }
            }
        }

        // RECEIPT OF SINGLE STUDENT
        public static ReceiptViewModel getReceiptByTrxIDForStudent(int? TrxID, int? studentid)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.tblFeeAndFundCollections.Where(x => x.TransactionID == TrxID).ToList();
                var lst_std = lst.Where(x => x.StudentID == studentid && x.Recieved > 0).ToList();
                var std = db.tblStudents.Find(studentid);

                if (lst.Count > 0)
                {
                    var row = lst_std.First();

                    var distinctlst = lst.GroupBy(g => new { g.StudentID })
                                 .Select(g => g.First())
                                 .ToList();

                    ReceiptViewModel model = new ReceiptViewModel()
                    {
                        studentmodel = new StudentViewModel() { Reg_Id = std.Reg_Id, FullName = std.FullName, Family_ID = std.Family_Code, ClassCompositeID = std.ClassCompositeID },
                        StudentID = studentid,
                        TransactionID = row.TransactionID,
                        SumOfReceived = lst_std.Sum(x => x.Recieved),
                        Date = row.Date,
                        ReceivedBy = row.ReceivedBy,
                        RcptID = row.RcptID,
                        ManualRcptNo = row.ManualRcptNo,
                        Time = row.Time
                    };

                    return model;
                }
            }

            return new ReceiptViewModel();
        }

        public static List<ReceiptViewModel> lstReceiptByTrxID(int? TrxID)
        {
            var lst = lstReceipt().Where(x => x.TransactionID == TrxID).ToList();

            var distinctlst = lst.GroupBy(g => new { g.StudentID })
                         .Select(g => g.First())
                         .ToList();

            return distinctlst;
        }

        public static List<tblFeeAndFundCollection> lstByTrxID(int? TrxID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.tblFeeAndFundCollections.Where(x => x.TransactionID == TrxID).ToList();
            }
        }

        public static List<v_FeeAndFundCollection> lstByTrxIDAlt(int? TrxID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_FeeAndFundCollection.Where(x => x.TransactionID == TrxID).ToList();
            }
        }

        public static List<v_FeeAndFundCollection> GetReceiptByRcptID(int? RcptID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_FeeAndFundCollection.Where(x => x.RcptID == RcptID).ToList();
            }
        }

      public static decimal? GetActualFee(int? StudentID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_StudentList.Where(x => x.Reg_Id == StudentID).First().TotalFee ?? 0;
            }
        }
          public static decimal? GetTutionFee(int? StudentID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_StudentList.Where(x => x.Reg_Id == StudentID).First().TutionFee ?? 0;
            }
        }

        public static decimal? GetThisMonthPayable(int? StudentID, int? Month, int? Year)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var row = db.tblFeeAndFundCollections.Where(x => x.StudentID == StudentID && x.Month == Month && x.Year == Year && x.Payment > 0).FirstOrDefault();

                if (row != null)
                {
                    return row.Payment;
                }

                return 0;
            }
        }

        public static decimal? GetThisMonthPayableWithoutDiscount(int? StudentID, int? Month, int? Year)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var row = db.tblFeeAndFundCollections.Where(x => x.StudentID == StudentID && x.Month == Month && x.Year == Year && x.Payment > 0).FirstOrDefault();

                if (row != null)
                {
                    return row.Payment + row.Discount;
                }

                return 0;
            }
        }

        public static decimal? GetThisMonthDiscount(int? StudentID, int? FundTypeID, int? Month, int? Year)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var row = db.tblFeeAndFundCollections.Where(x => x.StudentID == StudentID && x.FundTypeID == FundTypeID && x.Month == Month && x.Year == Year && x.Payment > 0).FirstOrDefault();

                if (row != null)
                {
                    return row.Discount;
                }

                return 0;
            }
        }

        public static decimal? GetConcession(int? StudentID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_StudentList.Where(x => x.Reg_Id == StudentID).First().FeeConcession ?? 0;
            }
        }

        public static int? GenerateRcptID()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.tblFeeAndFundCollections.ToList();
                return (lst.Max(x => x.RcptID) + 1) ?? 1;
            }
        }

        public static int? GenerateRcptID(int? TrxID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.tblFeeAndFundCollections.Where(x => x.TransactionID == TrxID).ToList();
                return (lst.Max(x => x.RcptID) + 1) ?? 1;
            }
        }

        public static void FixRcptIdSequence()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lstTrx = db.tblFeeAndFundCollections.ToList();
                if (lstTrx.Count > 0)
                {
                    var lstDistinct = lstTrx.GroupBy(i => i.TransactionID).Select(group => group.First());
                    foreach (var item in lstDistinct)
                    {
                        var RcptID = GenerateRcptID();
                      //  db.Database.ExecuteSqlCommand("update tblFeeAndFundCollection set RcptID = " + RcptID + " Where TransactionID = " + TrxID + " AND StudentID = " + item.StudentID + "");
                    }
                }
            }
        }
    }
}
