using Data.DAL;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.BLL.Employee
{
    public class Login
    {
        public static int AttemptLogin(int? ID, string Password)
         {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var row = db.tblEmployees.Where(x => x.ID == ID && x.Password == Password).FirstOrDefault();
                if (row != null)
                {
                    if (row.IsActive == true)
                    {
                        return 1;
                    }
                    return -1;
                }
                return 0;
            }
        }
    }
}
