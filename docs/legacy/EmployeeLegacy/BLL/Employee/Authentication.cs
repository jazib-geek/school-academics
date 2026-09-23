using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Data.DAL;

namespace Data.BLL.Employee
{
    public class Authentication
    {
        public static string AttemptLogin(int? UserID, string Password)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var row = db.tblEmployees.Where(x => x.ID == UserID && x.Password == Password).FirstOrDefault();

                if (row != null)
                {
                    return "success";
                }

                return "denied";
            }
        }

    }
}
