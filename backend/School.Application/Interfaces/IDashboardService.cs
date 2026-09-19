using School.Application.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace School.Application.Interfaces
{
    public interface IDashboardService
    {
        Task<DashboardDto> GetDashboardAsync(int studentId);
        Task<AllCampusDashboardDto> GetAllCampusesDashboardAsync();
        Task<CampusFeeCollectionByDateDto> GetAllCampusesFeeCollectionByDateAsync(DateTime date);
        Task<CampusExpenseByIntervalDto> GetAllCampusesExpenseByIntervalAsync(int days);
        Task<CampusExpenseDetailDto> GetCampusExpenseDetailsAsync(string campus, int days);
        Task<CampusFeeBalanceByMonthDto> GetAllCampusesFeeBalanceByMonthAsync(int month, int year);
        Task<CampusAdmissionsByMonthDto> GetAllCampusesAdmissionsByMonthAsync(int month, int year);
        Task<CampusLeftStudentsByMonthDto> GetCampusLeftStudentsByMonthAsync(string campus, int month, int year);
        Task<CampusDashboardDetailDto> GetCampusDashboardAsync(string campus);
        Task<CampusFeeBreakdownByMonthDto> GetCampusFeeBreakdownByMonthAsync(string campus, int month, int year);
        Task<CampusAdmissionsVsLeftTrendDto> GetCampusAdmissionsVsLeftTrendAsync(string campus, int days);
    }
}
