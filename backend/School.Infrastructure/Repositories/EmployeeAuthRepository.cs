using Microsoft.EntityFrameworkCore;
using School.Infrastructure.Data;

namespace School.Infrastructure.Repositories;

public class EmployeeAuthRepository : IEmployeeAuthRepository
{
    private readonly AppDbContext _context;

    public EmployeeAuthRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<EmployeeLoginRecord?> GetActiveEmployeeByCredentialsAsync(int employeeId, string password)
    {
        return await (
            from employee in _context.Employees.AsNoTracking()
            join designation in _context.Designations.AsNoTracking()
                on employee.DesignationID equals designation.ID into designationJoin
            from designation in designationJoin.DefaultIfEmpty()
            where employee.ID == employeeId
                && employee.Password == password
                && employee.IsActive == true
            select new EmployeeLoginRecord
            {
                ID = employee.ID,
                EmployeeName = employee.EmployeeName,
                BranchID = employee.BranchID,
                DesignationId = employee.DesignationID,
                DesignationName = designation != null ? designation.DesignationName : null
            })
            .FirstOrDefaultAsync();
    }

    public Task<bool> IsActiveEmployeeWithDesignationAsync(int employeeId, int designationId, CancellationToken cancellationToken = default) =>
        _context.Employees.AsNoTracking().AnyAsync(
            e => e.ID == employeeId && e.IsActive == true && e.DesignationID == designationId,
            cancellationToken);
}
