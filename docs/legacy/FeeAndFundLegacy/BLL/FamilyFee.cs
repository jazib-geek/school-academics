using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;

namespace Data.BLL.FeeAndFund
{
    public class FamilyFee
    {
        public static List<v_FeeMonthlyBalance> MonthlyList(int FamilyID)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_FeeMonthlyBalance.Where(x => x.Family_Code == FamilyID).ToList();
            }
        }
    }
}
