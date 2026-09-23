using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;

namespace Data.BLL.Accounts
{
    public class TrialBalance
    {
        public static List<Fn_TrialBalance_Result> GetByDate(DateTime? From, DateTime? To)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                string FromDate = From.Value.Year + "-" + From.Value.Month + "-" + From.Value.Day;
                string ToDate = To.Value.Year + "-" + To.Value.Month + "-" + To.Value.Day;
                return db.Fn_TrialBalance(FromDate, ToDate).ToList();
            }
        }
    }
}
