using Data.DAL;
using Data.Viewmodel.Employee;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Data.Helper.Constants;

namespace Data.BLL.Employee
{
    public class SalaryComponent
    {
        public static List<SalaryComponentViewModel> GetEmployeeSalaryComponents(int empID, string ComponentType = null)
        {
            using (var db = new dbSchoolEntities())
            {
                var query = db.tblEmployeeSalaryComponents
                              .Where(x => x.EmpID == empID);

                if (!string.IsNullOrEmpty(ComponentType))
                    query = query.Where(x => x.ComponentType == ComponentType);

                return query.OrderBy(x => x.Year)
                            .ThenBy(x => x.Month)
                            .Select(x => new SalaryComponentViewModel
                            {
                                ID = x.ID,
                                ComponentType = x.ComponentType,
                                Amount = x.Amount,
                                Month = x.Month,
                                Year = x.Year,
                                Description = x.Description
                            }).ToList();
            }
        }



        public static void InsertOrUpdateSalaryComponent(int? EmpID, int Month, int Year, string ComponentType, decimal Amount, string Description)
        {
            using (var db = new dbSchoolEntities())
            {
                // Check for existing component
                var component = db.tblEmployeeSalaryComponents.FirstOrDefault(c => c.EmpID == EmpID && c.Month == Month && c.Year == Year && c.ComponentType == ComponentType);

                if (component != null)
                {
                    // Update existing component
                    component.Amount = Amount;
                    component.Description = Description;
                }
                else
                {
                    // Insert new component
                    var newComponent = new tblEmployeeSalaryComponent
                    {
                        EmpID = EmpID.Value,
                        Month = Month,
                        Year = Year,
                        ComponentType = ComponentType,
                        Amount = Amount,
                        Description = Description
                    };
                    db.tblEmployeeSalaryComponents.Add(newComponent);
                }

                db.SaveChanges();
            }
        }

        public  static List<string> ComponentList()
        {
            var list = new List<string>
            {
                SalaryComponentTypes.WorkingDaySalary,
                SalaryComponentTypes.Loan,
                SalaryComponentTypes.SecurityCharges,
                SalaryComponentTypes.Bonus,
                SalaryComponentTypes.Fine,
                SalaryComponentTypes.Advance,
            };

            return list;
        }
    }
}
