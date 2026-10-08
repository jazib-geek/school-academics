namespace School.Application.Common;

public static class CampusFundTypes
{
    public const int Tuition = 1;
    public const int AdmissionFee = 2;
    public const int MiscCharges = 3;
    public const int PrevBalance = 4;
    public const int TransportCharges = 5;
    public const int Fine = 6;
    public const int SecurityDeposit = 7;

    public static readonly int[] AdmissionAnnualFundTypeIds = [2, 3, 4, 7];
}
