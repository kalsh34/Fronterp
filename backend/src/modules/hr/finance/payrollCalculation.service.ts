import { TaxBracket, ITaxBracket } from '../../../models/TaxBracket';
import { PensionRule, IPensionRule } from '../../../models/PensionRule';
import { PayrollRate, IPayrollRate } from '../../../models/PayrollRate';
import { PrimarySiteAssignment } from '../../../models/PrimarySiteAssignment';
import { AttendanceRecord } from '../../../models/AttendanceRecord';
import { SecondaryShiftEntry } from '../../../models/SecondaryShiftEntry';
import { Loan } from '../../../models/Loan';
import { GuardPayrollRecord, IGuardPayrollRecord } from '../../../models/GuardPayrollRecord';
import { StaffPayrollRecord, IStaffPayrollRecord } from '../../../models/StaffPayrollRecord';
import { PayrollFormulaVersion, IPayrollFormulaVersion } from '../../../models/PayrollFormulaVersion';
import { ApiError } from '../../../common/ApiError';
import { PensionTaxBase, PayrollRecordStatus } from '../../../types';
import { config } from '../../../config/env';

export class PayrollCalculationService {
  static async calculateIncomeTax(taxableSalary: number, effectiveDate: Date = new Date()): Promise<number> {
    const bracket = await TaxBracket.findOne({ isCurrent: true, effectiveFrom: { $lte: effectiveDate } });
    if (!bracket) throw ApiError.internal('No active tax bracket found');

    for (const b of bracket.brackets) {
      const max = b.max ?? Infinity;
      if (taxableSalary >= b.min && taxableSalary <= max) {
        return Math.max(0, (taxableSalary * b.rate) - b.deduction);
      }
    }
    return 0;
  }

  static async calculatePension(baseAmount: number, effectiveDate: Date = new Date()) {
    const rule = await PensionRule.findOne({ isCurrent: true, effectiveFrom: { $lte: effectiveDate } });
    if (!rule) throw ApiError.internal('No active pension rule found');
    return {
      employeePension: Math.round(baseAmount * rule.employeeRate * 100) / 100,
      employerPension: Math.round(baseAmount * rule.employerRate * 100) / 100,
    };
  }

  static async getCurrentFormula(): Promise<IPayrollFormulaVersion> {
    const formula = await PayrollFormulaVersion.findOne({ isCurrent: true });
    if (!formula) throw ApiError.internal('No active payroll formula version found. Create one under Admin > Payroll Config.');
    return formula;
  }

  static getComponentValue(record: any, code: string): number {
    const fieldMap: Record<string, string> = {
      BASIC: 'basicSalary',
      RESPONSIBILITY_ALLOWANCE: 'responsibilityAllowance',
      TELE_ALLOWANCE: 'teleAllowance',
      NON_TAXABLE_ALLOWANCE: 'nonTaxableTransport',
      TAXABLE_TRANSPORT: 'taxableTransport',
      OT: 'overtime',
      BONUS: 'bonus',
      PENALTY: 'penalty',
      LOAN: 'loanDeduction',
      OTHER_DEDUCTIONS: 'otherDeductions',
    };
    const field = fieldMap[code];
    if (field && record[field] !== undefined) return record[field] as number;
    return 0;
  }

  static async calculateGuardPayroll(
    recordId: string,
    pensionTaxBase: PensionTaxBase = PensionTaxBase.NORMAL_SALARY_ONLY
  ): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(recordId)
      .populate('guardId')
      .populate('primarySiteId');
    if (!record) throw ApiError.notFound('Guard payroll record not found');

    const normalSalary = record.standardMonthlyHours * record.normalRate;
    const workedSalary = record.normalHours * record.normalRate;
    const otPay = record.otHours * record.otRate;
    const holidayPay = record.holidayHours * record.holidayRate;
    const grossPay = workedSalary + otPay + holidayPay + record.secondaryShiftPay;

    const baseComponent = pensionTaxBase === PensionTaxBase.NORMAL_SALARY_ONLY
      ? normalSalary
      : grossPay;

    const pension = await this.calculatePension(baseComponent);
    const incomeTax = await this.calculateIncomeTax(grossPay);
    const totalDeductions = incomeTax + pension.employeePension + record.loanDeduction;
    const netPay = grossPay - totalDeductions;

    record.normalSalary = Math.round(normalSalary * 100) / 100;
    record.workedSalary = Math.round(workedSalary * 100) / 100;
    record.otPay = Math.round(otPay * 100) / 100;
    record.holidayPay = Math.round(holidayPay * 100) / 100;
    record.grossPay = Math.round(grossPay * 100) / 100;
    record.baseComponent = Math.round(baseComponent * 100) / 100;
    record.employeePension = pension.employeePension;
    record.employerPension = pension.employerPension;
    record.incomeTax = Math.round(incomeTax * 100) / 100;
    record.totalDeductions = Math.round(totalDeductions * 100) / 100;
    record.netPay = Math.round(netPay * 100) / 100;
    record.status = PayrollRecordStatus.CALCULATED;
    record.calculatedBy = record.calculatedBy;
    record.calculatedAt = new Date();
    await record.save();

    return record;
  }

  static async calculateStaffPayroll(recordId: string): Promise<IStaffPayrollRecord> {
    const record = await StaffPayrollRecord.findById(recordId)
      .populate('employeeId');
    if (!record) throw ApiError.notFound('Staff payroll record not found');

    const formula = await this.getCurrentFormula();

    let grossSalary = 0;
    for (const code of formula.grossComponentCodes) {
      grossSalary += this.getComponentValue(record, code);
    }

    let taxableSalary = 0;
    for (const code of formula.taxableComponentCodes) {
      taxableSalary += this.getComponentValue(record, code);
    }

    let pensionBase = 0;
    for (const code of formula.pensionBaseComponentCodes) {
      pensionBase += this.getComponentValue(record, code);
    }

    const pension = await this.calculatePension(pensionBase);
    const incomeTax = await this.calculateIncomeTax(taxableSalary);

    let totalDeductions = incomeTax + pension.employeePension;
    for (const code of formula.deductionComponentCodes) {
      if (code === 'INCOME_TAX' || code === 'EMPLOYEE_PENSION') continue;
      totalDeductions += this.getComponentValue(record, code);
    }

    const netPay = grossSalary - totalDeductions;

    record.grossSalary = Math.round(grossSalary * 100) / 100;
    record.taxableSalary = Math.round(taxableSalary * 100) / 100;
    record.employeePension = pension.employeePension;
    record.employerPension = pension.employerPension;
    record.incomeTax = Math.round(incomeTax * 100) / 100;
    record.totalDeductions = Math.round(totalDeductions * 100) / 100;
    record.netPay = Math.round(netPay * 100) / 100;
    record.formulaVersionId = formula._id;
    record.status = PayrollRecordStatus.CALCULATED;
    record.calculatedAt = new Date();
    await record.save();

    return record;
  }

  static async generateGuardPayrollRecords(payrollPeriodId: string): Promise<IGuardPayrollRecord[]> {
    const assignments = await PrimarySiteAssignment.find({ isCurrent: true });
    const rate = await PayrollRate.findOne({ payrollPeriodId });
    if (!rate) throw ApiError.badRequest('Payroll rates not set for this period');

    const records: IGuardPayrollRecord[] = [];

    for (const assignment of assignments) {
      const existing = await GuardPayrollRecord.findOne({
        payrollPeriodId,
        guardId: assignment.guardId,
      });
      if (existing) continue;

      const period = await (await import('../../../models/PayrollPeriod')).PayrollPeriod.findById(payrollPeriodId);
      if (!period) continue;

      const attendance = await AttendanceRecord.find({
        guardId: assignment.guardId,
        date: { $gte: period.startDate, $lte: period.endDate },
      });

      let normalHours = 0;
      let holidayHours = 0;
      attendance.forEach((a) => {
        if (a.isHoliday) holidayHours += a.totalHours;
        else normalHours += a.totalHours;
      });

      const secondaryShifts = await SecondaryShiftEntry.find({
        guardId: assignment.guardId,
        payrollPeriodId,
      });
      let secondaryShiftPay = 0;
      secondaryShifts.forEach((s) => { secondaryShiftPay += s.totalPay; });

      const activeLoans = await Loan.find({
        employeeId: assignment.guardId,
        status: 'ACTIVE',
      });
      let loanDeduction = 0;
      activeLoans.forEach((l) => { loanDeduction += l.monthlyDeduction; });

      const record = await GuardPayrollRecord.create({
        payrollPeriodId,
        guardId: assignment.guardId,
        primarySiteId: assignment.siteId,
        standardMonthlyHours: assignment.standardMonthlyHours,
        normalHours,
        otHours: 0,
        holidayHours,
        secondaryShiftPay,
        normalRate: rate.normalRate,
        otRate: rate.otRate,
        holidayRate: rate.holidayRate,
        loanDeduction,
        status: PayrollRecordStatus.DRAFT,
      });

      records.push(record);
    }

    return records;
  }

  static async generateStaffPayrollRecords(payrollPeriodId: string): Promise<IStaffPayrollRecord[]> {
    const { Employee } = await import('../../../models/Employee');
    const { Loan } = await import('../../../models/Loan');
    const { Contract } = await import('../../../models/Contract');
    const { StaffAttendance } = await import('../../../models/StaffAttendance');
    const { PayrollPeriod } = await import('../../../models/PayrollPeriod');

    const period = await PayrollPeriod.findById(payrollPeriodId);
    if (!period) throw ApiError.notFound('Payroll period not found');
    if (period.status !== 'LOCKED') {
      throw ApiError.badRequest(
        'Staff attendance for this period has not been locked yet. Please ask HR to lock attendance before generating payroll.'
      );
    }

    const staff = await Employee.find({ category: 'OFFICE_STAFF', status: 'ACTIVE' });
    const records: IStaffPayrollRecord[] = [];

    for (const employee of staff) {
      const existing = await StaffPayrollRecord.findOne({ payrollPeriodId, employeeId: employee._id });
      if (existing) continue;

      const activeContract = await Contract.findOne({
        employeeId: employee._id,
        status: 'ACTIVE',
        contractStartDate: { $lte: new Date() },
        $or: [
          { contractEndDate: { $exists: false } },
          { contractEndDate: null },
          { contractEndDate: { $gte: new Date() } },
        ],
      });

      const baseSalary = activeContract?.wage || (employee as any).salary || 0;
      const nonTaxableTransport = (employee as any).transportAllowance || 0;
      const responsibilityAllowance = activeContract?.allowances?.da || 0;
      const teleAllowance = activeContract?.allowances?.otherAllowance || 0;
      const taxableTransport = activeContract?.allowances?.travelAllowance || 0;
      const bonus = activeContract?.monthlyAdvantagesInCash || 0;

      const attendanceRecords = await StaffAttendance.find({
        employeeId: employee._id,
        payrollPeriodId: payrollPeriodId,
      });

      let attendanceDataMissing = false;
      let deductibleDays = 0;

      if (attendanceRecords.length === 0) {
        attendanceDataMissing = true;
      } else {
        const counts: Record<string, number> = {
          ABSENT: 0, UNPAID_LEAVE: 0, HALF_DAY: 0,
        };
        attendanceRecords.forEach((r) => {
          if (counts[r.status] !== undefined) {
            counts[r.status]++;
          }
        });
        deductibleDays = counts.ABSENT + counts.UNPAID_LEAVE + (counts.HALF_DAY * 0.5);
      }

      const dailyRate = baseSalary / 22;
      const attendanceDeduction = deductibleDays * dailyRate;
      const basicSalary = Math.round((baseSalary - attendanceDeduction) * 100) / 100;

      const activeLoans = await Loan.find({ employeeId: employee._id, status: 'ACTIVE' });
      let loanDeduction = 0;
      activeLoans.forEach((l) => { loanDeduction += l.monthlyDeduction; });

      const record = await StaffPayrollRecord.create({
        payrollPeriodId,
        employeeId: employee._id,
        basicSalary,
        responsibilityAllowance,
        teleAllowance,
        taxableTransport,
        nonTaxableTransport,
        overtime: 0,
        bonus,
        loanDeduction,
        attendanceDataMissing,
        status: PayrollRecordStatus.DRAFT,
      });

      records.push(record);
    }

    return records;
  }
}
