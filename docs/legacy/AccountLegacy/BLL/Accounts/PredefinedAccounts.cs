using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;

namespace Data.BLL.Accounts
{
    public class PredefinedAccounts
    {
        public static string CashAccountCode()
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
               // return db.tblAccounts.First().AccountID;
                return "";
            }
        }
    }
}
