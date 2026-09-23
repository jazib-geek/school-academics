using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Data.DAL;
using Data.Viewmodel;

namespace Data.BLL.FeeAndFund
{
    public class Collection
    {
        public static List<v_FeeAndFundCollection> All()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_FeeAndFundCollection.Where(x => x.Recieved > 0).ToList();
            }
        }

        // List All
        public static List<ReceiptViewModel> List()
        {
            var lst = new List<ReceiptViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var query = from rcpt in db.tblFeeAndFundCollections
                            join student in db.tblStudents on rcpt.StudentID equals student.Reg_Id
                            join Class in db.tblSections on rcpt.ClassID equals Class.ID
                            where rcpt.Payment == 0
                            select new { student, Class, rcpt };

                foreach (var item in query)
                {
                    lst.Add(new ReceiptViewModel()
                    {
                        TransactionID = item.rcpt.TransactionID,
                        FundTypeID = item.rcpt.FundTypeID,
                        Type = item.rcpt.Type,
                        student = item.student,
                        Month = item.rcpt.Month,
                        Year = item.rcpt.Year,
                        ClassCompositeID = item.rcpt.ClassID,
                        ClassSection = item.Class.ClassName,
                        Amount = item.rcpt.Recieved,
                        Date = item.rcpt.Date,
                    });
                }
            }

            return lst;
        }

        // BY DATE
        public static List<v_FeeAndFundCollection> List_ByDate(DateTime? Date)
        {
            var lst = new List<ReceiptViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_FeeAndFundCollection.Where(x => x.Recieved > 0 && x.Date == Date).ToList();
            }
        }

        // SHEET
        public static List<Fn_CollectionSheet_Result> CollectionSheet(int? Year)
        {
            var lst = new List<ReceiptViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.Fn_CollectionSheet(Year).ToList();
            }
        }

        public static List<v_FeeAndFundCollection> List_ByInterval(DateTime? From, DateTime? To)
        {
            var lst = new List<ReceiptViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_FeeAndFundCollection.Where(x => x.Recieved > 0 && x.Date >= From && x.Date <= To).ToList();
            }
        }


        public static List<ReceiptViewModel> ByType(int? FundTypeID, DateTime? From, DateTime? To)
        {
            var lst = new List<ReceiptViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var query = from rcpt in db.tblReceipts
                            join student in db.tblStudents on rcpt.StudentID equals student.Reg_Id
                            join Class in db.tblSections on rcpt.ClassCompositeID equals Class.ID
                            where rcpt.FundTypeID == FundTypeID && rcpt.Date >= From && rcpt.Date <= To
                            select new { student, Class, rcpt };

                foreach (var item in query)
                {
                    lst.Add(new ReceiptViewModel()
                    {
                        TransactionID = item.rcpt.TransactionID,
                        FundTypeID = item.rcpt.FundTypeID,
                        Type = item.rcpt.Type,
                        student = item.student,
                        Month = item.rcpt.Month,
                        Year = item.rcpt.Year,
                        ClassCompositeID = item.rcpt.ClassCompositeID,
                        ClassSection = item.Class.ClassName,
                        Amount = item.rcpt.Amount,
                        Date = item.rcpt.Date,
                    });
                }
            }

            return lst;
        }

        public static decimal? ByDate(DateTime? Date)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var coll = db.tblFeeAndFundCollections.Where(x => x.Date == Date).Sum(x=>x.Recieved) ?? 0;
                
                return coll;
            }
        }
        public static decimal? ByMonth(int? Month, int? Year)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                if (db.tblFeeAndFundCollections.Count() == 0)
                {
                    return 0;
                }

                return db.tblFeeAndFundCollections.Where(x => x.Date.Value.Month == Month && x.Date.Value.Year == Year).Sum(x => x.Recieved) ?? 0;
            }
        }

        public static decimal? ByDate(DateTime? Date, int? FundTypeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_FeeAndFundCollection.Where(x => x.Date == Date && x.FundTypeID == FundTypeID).Sum(x => x.Recieved) ?? 00;
            }
        }

        ////////////////////// INTERVAL FUNCTIONS /////////////////
        public static decimal? ByInterval(DateTime? From, DateTime? To)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_FeeAndFundCollection.Where(x => x.Date >= From && x.Date <= To).Sum(x => x.Recieved) ?? 00;
            }
        }

        public static decimal? ByInterval(DateTime? From, DateTime? To, int? FundTypeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_FeeAndFundCollection.Where(x => x.Date >= From && x.Date <= To && x.FundTypeID == FundTypeID).Sum(x => x.Recieved) ?? 00;
            }
        }

        public static List<v_FeeAndFundCollection> lstDistinctDate()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.v_FeeAndFundCollection.Where(x => x.Recieved > 0).ToList();

                var distinctlst = lst.GroupBy(g => new { g.Date })
                              .Select(g => g.First())
                              .ToList();

                return distinctlst;
            }
        }
    }
}
