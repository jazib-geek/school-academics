using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Data.DAL;
using Data.Viewmodel;

namespace Data.BLL.FeeAndFund
{
    public class Export
    {
        public static List<v_DefaulterList> lstDefaulters()
        {
            var lst = new List<FeeViewModel>();

            using (dbSchoolEntities db = new dbSchoolEntities())
            {
                return db.v_DefaulterList.ToList();
            }

        }
    }
}
