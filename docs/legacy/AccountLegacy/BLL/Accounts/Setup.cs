using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;

namespace Data.BLL.Accounts
{
    public class Setup
    {
        public static string GetVoucherType(string Denotion)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.tblVoucherTypes.Where(x => x.VoucherTypeDenotion == Denotion).First().VoucherType;
            }
        }
    }
}
