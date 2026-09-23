using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Data.DAL;

namespace Data.BLL.FeeAndFund
{
    public class Balance
    {
        public static decimal? NetBalance()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                decimal? Sum = db.v_FeeMonthlyBalance.Sum(x => x.Balance) ?? 0;

                return Sum;
            }
        }
        public static decimal? NetBalance(int? StudentID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                decimal? Generated = db.tblFeeAndFundCollections.Where(x => x.StudentID == StudentID).Sum(x => x.Payment) ?? 0;
                decimal? Received = db.tblFeeAndFundCollections.Where(x => x.StudentID == StudentID).Sum(x => x.Recieved) ?? 0;

                return Generated - Received;
            }
        }

        public static decimal? NetBalance(int? StudentID, int? FundTypeID, int? Month, int? Year)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                decimal? Sum = db.v_FeeMonthlyBalance.Where(x => x.StudentID == StudentID && x.Month == Month && x.Year == Year).Sum(x => x.Balance) ?? 0;

                return Sum;
            }
        }

        public static decimal? FundsBalance_ByType(int? StudentID, int? FundTypeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                decimal? Generated = db.tblFeeAndFundCollections.Where(x => x.StudentID == StudentID && x.FundTypeID == FundTypeID).Sum(x => x.Payment) ?? 0;
                decimal? Received = db.tblFeeAndFundCollections.Where(x => x.StudentID == StudentID && x.FundTypeID == FundTypeID).Sum(x => x.Recieved) ?? 0;

                return Generated - Received;
            }
        }

        public static decimal? GetTutionFeeBalance(int? StudentID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.tblFeeAndFundCollections.Where(x => x.StudentID == StudentID && x.FundTypeID == 1).ToList();
                if (lst.Count > 0)
                {
                    var Bal = lst.Sum(x => x.Payment) - lst.Sum(x => x.Recieved);
                    return Bal;
                }
                return 0;
            }
        }
        /////////////////////////// TUTION FEE ///////////////////////////

        public static decimal? TutionFeeBalance()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                decimal? NetFeeBalance = 0;
                decimal? NetReceived = 0;

                var lstFee = from fee in db.tblFeeAndFundCollections
                             join student in db.tblStudents on fee.StudentID equals student.Reg_Id
                             where student.IsActive == true && fee.FundTypeID == 1
                             select new { fee.Payment, fee.Recieved };

                if (lstFee.Count() > 0)
                {
                    NetFeeBalance = lstFee.Sum(x => x.Payment);
                    NetReceived = lstFee.Sum(x => x.Recieved);
                }

                return NetFeeBalance - NetReceived;
            }
        }

        public static decimal? TutionFeeBalance(int? Month, int? Year)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                decimal? Sum = db.v_FeeMonthlyBalance.Where(x => x.Month == Month && x.Year == Year).Sum(x => x.Balance) ?? 0;

                return Sum;
            }
        }

        /////////////////////////// FUNDS ///////////////////////////
        public static decimal? FundsBalance()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                decimal? Sum = db.v_FeeMonthlyBalance.Where(x => x.FundTypeID > 1).Sum(x => x.Balance) ?? 0;

                return Sum;
            }
        }

        public static decimal? FundsBalance(int? FundTypeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                decimal? Sum = db.v_FeeMonthlyBalance.Where(x => x.FundTypeID == FundTypeID).Sum(x => x.Balance) ?? 0;

                return Sum;

                //decimal? Generated = db.tblFeeAndFundCollections.Where(x => x.FundTypeID == FundTypeID).Sum(x => x.Payment) ?? 0;
                //decimal? Received = db.tblFeeAndFundCollections.Where(x => x.FundTypeID == FundTypeID).Sum(x => x.Recieved) ?? 0;

                //return Generated - Received;
            }
        }

        public static decimal? FundsBalance(int? StudentID, int? FundTypeID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                decimal? Sum = db.v_FeeMonthlyBalance.Where(x => x.StudentID == StudentID && x.FundTypeID == FundTypeID).Sum(x => x.Balance) ?? 0;

                return Sum;
            }
        }

        public static List<Fn_BalanceSheet_Result> GetBalanceSheet(int Year)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.Fn_BalanceSheet(Year).ToList();
            }
        }

        public static string GetDuesString_TF(int StudentID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.v_FeeMonthlyBalance.Where(x => x.StudentID == StudentID).ToList();
                string Balance = "";
                foreach (var item in lst.Where(x => x.Balance > 0 && x.Month != 0))
                {
                    Balance += DateFunctions.convertToStringMonth(item.Month) + " , ";
                }
                return Balance;
            }
        }

        public static string GetDuesString_Fund(int StudentID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var lst = db.v_FeeMonthlyBalance.Where(x => x.StudentID == StudentID).ToList();
                string Balance = "";
                foreach (var item in lst.Where(x => x.Balance > 0 && x.Month == 0))
                {
                    Balance += item.Type + " , ";
                }
                return Balance;
            }
        }

        public static decimal? NetBalance_TF(int? StudentID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                decimal? Sum = db.v_FeeMonthlyBalance.Where(x => x.StudentID == StudentID && x.Month != 0).Sum(x => x.Balance) ?? 0;

                return Sum;
            }
        }

        public static decimal? NetBalance_Funds(int? StudentID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                decimal? Sum = db.v_FeeMonthlyBalance.Where(x => x.StudentID == StudentID && x.Month == 0).Sum(x => x.Balance) ?? 0;

                return Sum;
            }
        }
    }
}
