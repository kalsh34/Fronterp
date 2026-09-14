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
import { SalaryStructure, ISalaryStructure } from '../../../models/SalaryStructure';
import { ApiError } from '../../../common/ApiError';
import { PensionTaxBase, PayrollRecordStatus } from '../../../types';
import { config } from '../../../config/env';

const GUARD_MONTHLY_HOURS = 720;

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
      pensionTaxBase: rule.pensionTaxBase || 'NORMAL_SALARY_ONLY',
    };
  }

  static async getCurrentFormula(): Promise<IPayrollFormulaVersion> {
    const formula = await PayrollFormulaVersion.findOne({ isCurrent: true });
    if (!formula) throw ApiError.internal('No active payroll formula version found. Create one under Admin > Payroll Config.');
    return formula;
  }

  static async getActiveSalaryStructure(employeeType: 'GUARD' | 'STAFF'): Promise<ISalaryStructure | null> {
    return SalaryStructure.findOne({ employeeType, isCurrent: true });
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

  /**
   * Resolve the effective earning rate for a guard component.
   * Priority: Contract.wage (for BASIC) → Structure defaultRate → PayrollRate fallback.
   */
  static async resolveGuardRates(guardId: any, assignment: any): Promise<{
    normalRate: number;
    otRate: number;
    holidayRate: number;
    holidayOtRate: number;
    standardMonthlyHours: number;
  }> {
    const { Contract } = await import('../../../models/Contract');
    const activeContract = await Contract.findOne({ employeeId: guardId, status: 'ACTIVE' });

    let normalRate = 0;
    let otRate = 0;
    let holidayRate = 0;
    let holidayOtRate = 0;
    let otMultiplier = 1.5;
    let holidayMultiplier = 2.0;
    let holidayOtMultiplier = 2.5;

    if (activeContract) {
      const structure = activeContract.salaryStructureId
        ? await SalaryStructure.findById(activeContract.salaryStructureId)
        : await this.getActiveSalaryStructure('GUARD');

      if (activeContract.wage > 0) {
        normalRate = Math.round((activeContract.wage / GUARD_MONTHLY_HOURS) * 100) / 100;
      } else if (structure) {
        const basicEarning = structure.earnings.find((e) => e.componentCode === 'BASIC');
        if (basicEarning && basicEarning.defaultRate > 0) {
          normalRate = Math.round((basicEarning.defaultRate / GUARD_MONTHLY_HOURS) * 100) / 100;
        }
      }

      if (structure) {
        otMultiplier = structure.otMultiplier || 1.5;
        holidayMultiplier = structure.holidayMultiplier || 2.0;
        holidayOtMultiplier = structure.holidayOtMultiplier || 2.5;
      }
    } else {
      const structure = await this.getActiveSalaryStructure('GUARD');
      if (structure) {
        const basicEarning = structure.earnings.find((e) => e.componentCode === 'BASIC');
        if (basicEarning && basicEarning.defaultRate > 0) {
          normalRate = Math.round((basicEarning.defaultRate / GUARD_MONTHLY_HOURS) * 100) / 100;
        }
        otMultiplier = structure.otMultiplier || 1.5;
        holidayMultiplier = structure.holidayMultiplier || 2.0;
        holidayOtMultiplier = structure.holidayOtMultiplier || 2.5;
      }
    }

    if (normalRate === 0) {
      const fallback = await PayrollRate.findOne({});
      if (fallback) {
        normalRate = fallback.normalRate;
        otRate = fallback.otRate;
        holidayRate = fallback.holidayRate;
    return { normalRate, otRate, holidayRate, holidayOtRate: 0, standardMonthlyHours: GUARD_MONTHLY_HOURS };
      }
    }

    otRate = Math.round(normalRate * otMultiplier * 100) / 100;
    holidayRate = Math.round(normalRate * holidayMultiplier * 100) / 100;
    holidayOtRate = Math.round(normalRate * holidayOtMultiplier * 100) / 100;

    return { normalRate, otRate, holidayRate, holidayOtRate, standardMonthlyHours: GUARD_MONTHLY_HOURS };
  }

  static async calculateGuardPayroll(
    recordId: string,
  ): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(recordId)
      .populate('guardId')
      .populate('primarySiteId');
    if (!record) throw ApiError.notFound('Guard payroll record not found');

    const normalSalary = record.standardMonthlyHours * record.normalRate;
    const workedSalary = record.normalHours * record.normalRate;
    const regularOtPay = record.regularOtHours * record.otRate;
    const holidayOtPay = record.holidayOtHours * record.normalRate * 2.5;
    const holidayPay = record.holidayHours * record.holidayRate;
    const grossPay = workedSalary + regularOtPay + holidayOtPay + holidayPay + record.secondaryShiftPay;

    const pension = await this.calculatePension(normalSalary);
    const incomeTax = await this.calculateIncomeTax(grossPay);

    const baseComponent = pension.pensionTaxBase === PensionTaxBase.GROSS_PAY
      ? grossPay
      : normalSalary;

    record.normalSalary = Math.round(normalSalary * 100) / 100;
    record.workedSalary = Math.round(workedSalary * 100) / 100;
    record.regularOtPay = Math.round(regularOtPay * 100) / 100;
    record.holidayOtPay = Math.round(holidayOtPay * 100) / 100;
    record.holidayPay = Math.round(holidayPay * 100) / 100;
    record.grossPay = Math.round(grossPay * 100) / 100;
    record.baseComponent = Math.round(baseComponent * 100) / 100;
    record.employeePension = pension.employeePension;
    record.employerPension = pension.employerPension;
    record.incomeTax = Math.round(incomeTax * 100) / 100;
    record.totalDeductions = Math.round((incomeTax + pension.employeePension + record.loanDeduction) * 100) / 100;
    record.netPay = Math.round((grossPay - record.totalDeductions) * 100) / 100;
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

    const { Contract } = await import('../../../models/Contract');
    const activeContract = await Contract.findOne({
      employeeId: (record.employeeId as any)._id || record.employeeId,
      status: 'ACTIVE',
    });
    const pensionEnrolled = activeContract?.pensionEnrolled !== false;

    let grossSalary = 0;
    let taxableSalary = 0;
    let pensionBase = 0;
    let deductionCodes: string[] = [];

    if (activeContract?.salaryStructureId) {
      const structure = await SalaryStructure.findById(activeContract.salaryStructureId);
      if (structure) {
        for (const earning of structure.earnings) {
          const value = this.getComponentValue(record, earning.componentCode);
          grossSalary += value;
          if (earning.taxable) taxableSalary += value;
        }

        const basicEarning = structure.earnings.find((e) => e.componentCode === 'BASIC');
        if (basicEarning) {
          pensionBase = this.getComponentValue(record, 'BASIC');
        }

        deductionCodes = structure.deductions
          .filter((d) => d.enabled)
          .map((d) => d.componentCode);
      }
    }

    if (grossSalary === 0) {
      const formula = await this.getCurrentFormula();

      for (const code of formula.grossComponentCodes) {
        grossSalary += this.getComponentValue(record, code);
      }
      for (const code of formula.taxableComponentCodes) {
        taxableSalary += this.getComponentValue(record, code);
      }
      for (const code of formula.pensionBaseComponentCodes) {
        pensionBase += this.getComponentValue(record, code);
      }
      deductionCodes = formula.deductionComponentCodes;
      record.formulaVersionId = formula._id;
    }

    const pension = pensionEnrolled
      ? await this.calculatePension(pensionBase)
      : { employeePension: 0, employerPension: 0 };
    const incomeTax = await this.calculateIncomeTax(taxableSalary);

    const basicSalary = this.getComponentValue(record, 'BASIC');
    const hourlyRate = basicSalary / 192;
    let otMultiplier = 1.5;
    let holidayOtMultiplier = 2.5;
    if (activeContract?.salaryStructureId) {
      const structure = await SalaryStructure.findById(activeContract.salaryStructureId);
      if (structure) {
        otMultiplier = structure.otMultiplier || 1.5;
        holidayOtMultiplier = structure.holidayOtMultiplier || 2.5;
      }
    }
    const regularOtPay = Math.round((record.regularOtHours * hourlyRate * otMultiplier) * 100) / 100;
    const holidayOtPay = Math.round((record.holidayOtHours * hourlyRate * holidayOtMultiplier) * 100) / 100;
    record.regularOtPay = regularOtPay;
    record.holidayOtPay = holidayOtPay;
    record.overtime = regularOtPay + holidayOtPay;

    let totalDeductions = incomeTax + pension.employeePension;
    for (const code of deductionCodes) {
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
    record.status = PayrollRecordStatus.CALCULATED;
    record.calculatedAt = new Date();
    await record.save();

    return record;
  }

  static async generateGuardPayrollRecords(payrollPeriodId: string): Promise<IGuardPayrollRecord[]> {
    const assignments = await PrimarySiteAssignment.find({ isCurrent: true });

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

      const rates = await this.resolveGuardRates(assignment.guardId, assignment);

      const record = await GuardPayrollRecord.create({
        payrollPeriodId,
        guardId: assignment.guardId,
        primarySiteId: assignment.siteId,
        standardMonthlyHours: rates.standardMonthlyHours,
        normalHours,
        otHours: 0,
        holidayHours,
        secondaryShiftPay,
        normalRate: rates.normalRate,
        otRate: rates.otRate,
        holidayRate: rates.holidayRate,
        loanDeduction,
        status: PayrollRecordStatus.DRAFT,
      });

      records.push(record);
    }

    return records;
  }

  static async generateStaffPayrollRecords(payrollPeriodId: string): Promise<{ records: IStaffPayrollRecord[]; skipped: { employeeId: string; firstName: string; lastName: string; employeeCode: string; reason: string }[] }> {
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

    const staff = await Employee.find({ category: 'OFFICE_STAFF', status: { $in: ['ACTIVE', 'CONTRACTED'] } });
    const records: IStaffPayrollRecord[] = [];
    const skipped: { employeeId: string; firstName: string; lastName: string; employeeCode: string; reason: string }[] = [];

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

      if (!activeContract) {
        skipped.push({
          employeeId: (employee._id as any).toString(),
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeCode: employee.employeeCode,
          reason: 'No active contract',
        });
        continue;
      }

      const baseSalary = activeContract.wage;
      const responsibilityAllowance = activeContract.responsibilityAllowance || 0;
      const teleAllowance = activeContract.teleAllowance || 0;
      const taxableTransport = activeContract.taxableTransport || 0;
      const nonTaxableTransport = activeContract.nonTaxableAllowance || 0;
      const bonus = 0;

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

    return { records, skipped };
  }
}
