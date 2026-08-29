import { IGuardPayrollRecord } from '../../../models/GuardPayrollRecord';
import { IStaffPayrollRecord } from '../../../models/StaffPayrollRecord';
import { IPayrollFormulaVersion } from '../../../models/PayrollFormulaVersion';
import { PensionTaxBase } from '../../../types';
export declare class PayrollCalculationService {
    static calculateIncomeTax(taxableSalary: number, effectiveDate?: Date): Promise<number>;
    static calculatePension(baseAmount: number, effectiveDate?: Date): Promise<{
        employeePension: number;
        employerPension: number;
    }>;
    static getCurrentFormula(): Promise<IPayrollFormulaVersion>;
    static getComponentValue(record: any, code: string): number;
    static calculateGuardPayroll(recordId: string, pensionTaxBase?: PensionTaxBase): Promise<IGuardPayrollRecord>;
    static calculateStaffPayroll(recordId: string): Promise<IStaffPayrollRecord>;
    static generateGuardPayrollRecords(payrollPeriodId: string): Promise<IGuardPayrollRecord[]>;
    static generateStaffPayrollRecords(payrollPeriodId: string): Promise<IStaffPayrollRecord[]>;
}
//# sourceMappingURL=payrollCalculation.service.d.ts.map