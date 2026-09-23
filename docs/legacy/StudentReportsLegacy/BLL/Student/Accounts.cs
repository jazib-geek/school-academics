using Data.DAL;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.BLL.Student
{
    public class Accounts
    {
        public static string AttemptLogin(int? UserID, string Password)
        {
            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                var row = db.v_StudentList.Where(x => x.Reg_Id == UserID && x.StudentPassword == Password).FirstOrDefault();

                if (row != null)
                {
                    return "success";
                }

                return "denied";
            }
        }
    }
}
