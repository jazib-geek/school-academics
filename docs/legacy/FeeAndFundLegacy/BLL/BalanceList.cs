using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;

namespace Data.BLL.FeeAndFund
{
    public class BalanceList
    {
        public  static List<v_FeeMonthlyBalance> MonthlyBalance()
        {
            using (dbSchoolEntities db  = new dbSchoolEntities())
            {
                return db.v_FeeMonthlyBalance.ToList();
            }
        }

        public static List<v_FeeMonthlyBalance> MonthlyBalance(int? Month, int? Year)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_FeeMonthlyBalance.Where(x => x.Month == Month && x.Year == Year).ToList();
            }
        }

        public static List<Fn_ListBalance_Result> MonthlyBalance(int? Month, int? Year, int? ClassID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.Fn_ListBalance(ClassID, Month, Year).ToList();
            }
        }

        public static List<v_FundsBalance> FundsBalance()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_FundsBalance.ToList();
            }
        }

        public static List<v_FundsBalance> FundsBalance(int? ClassID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_FundsBalance.Where(x => x.ClassID == ClassID).ToList();
            }
        }


        public static List<v_FeeOverallBalance> OverallBalance()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_FeeOverallBalance.ToList();
            }
        }
    }
}
