"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollCalculationService = void 0;
const TaxBracket_1 = require("../../../models/TaxBracket");
const PensionRule_1 = require("../../../models/PensionRule");
const PayrollRate_1 = require("../../../models/PayrollRate");
const PrimarySiteAssignment_1 = require("../../../models/PrimarySiteAssignment");
const AttendanceRecord_1 = require("../../../models/AttendanceRecord");
const SecondaryShiftEntry_1 = require("../../../models/SecondaryShiftEntry");
const Loan_1 = require("../../../models/Loan");
const GuardPayrollRecord_1 = require("../../../models/GuardPayrollRecord");
const StaffPayrollRecord_1 = require("../../../models/StaffPayrollRecord");
const PayrollFormulaVersion_1 = require("../../../models/PayrollFormulaVersion");
const ApiError_1 = require("../../../common/ApiError");
const types_1 = require("../../../types");
class PayrollCalculationService {
    static async calculateIncomeTax(taxableSalary, effectiveDate = new Date()) {
        const bracket = await TaxBracket_1.TaxBracket.findOne({ isCurrent: true, effectiveFrom: { $lte: effectiveDate } });
        if (!bracket)
            throw ApiError_1.ApiError.internal('No active tax bracket found');
        for (const b of bracket.brackets) {
            const max = b.max ?? Infinity;
            if (taxableSalary >= b.min && taxableSalary <= max) {
                return Math.max(0, (taxableSalary * b.rate) - b.deduction);
            }
        }
        return 0;
    }
    static async calculatePension(baseAmount, effectiveDate = new Date()) {
        const rule = await PensionRule_1.PensionRule.findOne({ isCurrent: true, effectiveFrom: { $lte: effectiveDate } });
        if (!rule)
            throw ApiError_1.ApiError.internal('No active pension rule found');
        return {
            employeePension: Math.round(baseAmount * rule.employeeRate * 100) / 100,
            employerPension: Math.round(baseAmount * rule.employerRate * 100) / 100,
        };
    }
    static async getCurrentFormula() {
        const formula = await PayrollFormulaVersion_1.PayrollFormulaVersion.findOne({ isCurrent: true });
        if (!formula)
            throw ApiError_1.ApiError.internal('No active payroll formula version found. Create one under Admin > Payroll Config.');
        return formula;
    }
    static getComponentValue(record, code) {
        const fieldMap = {
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
        if (field && record[field] !== undefined)
            return record[field];
        return 0;
    }
    static async calculateGuardPayroll(recordId, pensionTaxBase = types_1.PensionTaxBase.NORMAL_SALARY_ONLY) {
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(recordId)
            .populate('guardId')
            .populate('primarySiteId');
        if (!record)
            throw ApiError_1.ApiError.notFound('Guard payroll record not found');
        const normalSalary = record.standardMonthlyHours * record.normalRate;
        const workedSalary = record.normalHours * record.normalRate;
        const otPay = record.otHours * record.otRate;
        const holidayPay = record.holidayHours * record.holidayRate;
        const grossPay = workedSalary + otPay + holidayPay + record.secondaryShiftPay;
        const baseComponent = pensionTaxBase === types_1.PensionTaxBase.NORMAL_SALARY_ONLY
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
        record.status = types_1.PayrollRecordStatus.CALCULATED;
        record.calculatedBy = record.calculatedBy;
        record.calculatedAt = new Date();
        await record.save();
        return record;
    }
    static async calculateStaffPayroll(recordId) {
        const record = await StaffPayrollRecord_1.StaffPayrollRecord.findById(recordId)
            .populate('employeeId');
        if (!record)
            throw ApiError_1.ApiError.notFound('Staff payroll record not found');
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
            if (code === 'INCOME_TAX' || code === 'EMPLOYEE_PENSION')
                continue;
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
        record.status = types_1.PayrollRecordStatus.CALCULATED;
        record.calculatedAt = new Date();
        await record.save();
        return record;
    }
    static async generateGuardPayrollRecords(payrollPeriodId) {
        const assignments = await PrimarySiteAssignment_1.PrimarySiteAssignment.find({ isCurrent: true });
        const rate = await PayrollRate_1.PayrollRate.findOne({ payrollPeriodId });
        if (!rate)
            throw ApiError_1.ApiError.badRequest('Payroll rates not set for this period');
        const records = [];
        for (const assignment of assignments) {
            const existing = await GuardPayrollRecord_1.GuardPayrollRecord.findOne({
                payrollPeriodId,
                guardId: assignment.guardId,
            });
            if (existing)
                continue;
            const period = await (await Promise.resolve().then(() => __importStar(require('../../../models/PayrollPeriod')))).PayrollPeriod.findById(payrollPeriodId);
            if (!period)
                continue;
            const attendance = await AttendanceRecord_1.AttendanceRecord.find({
                guardId: assignment.guardId,
                date: { $gte: period.startDate, $lte: period.endDate },
            });
            let normalHours = 0;
            attendance.forEach((a) => { normalHours += a.totalHours; });
            const secondaryShifts = await SecondaryShiftEntry_1.SecondaryShiftEntry.find({
                guardId: assignment.guardId,
                payrollPeriodId,
            });
            let secondaryShiftPay = 0;
            secondaryShifts.forEach((s) => { secondaryShiftPay += s.totalPay; });
            const activeLoans = await Loan_1.Loan.find({
                employeeId: assignment.guardId,
                status: 'ACTIVE',
            });
            let loanDeduction = 0;
            activeLoans.forEach((l) => { loanDeduction += l.monthlyDeduction; });
            const record = await GuardPayrollRecord_1.GuardPayrollRecord.create({
                payrollPeriodId,
                guardId: assignment.guardId,
                primarySiteId: assignment.siteId,
                standardMonthlyHours: assignment.standardMonthlyHours,
                normalHours,
                otHours: 0,
                holidayHours: 0,
                secondaryShiftPay,
                normalRate: rate.normalRate,
                otRate: rate.otRate,
                holidayRate: rate.holidayRate,
                loanDeduction,
                status: types_1.PayrollRecordStatus.DRAFT,
            });
            records.push(record);
        }
        return records;
    }
    static async generateStaffPayrollRecords(payrollPeriodId) {
        const { Employee } = await Promise.resolve().then(() => __importStar(require('../../../models/Employee')));
        const { Loan } = await Promise.resolve().then(() => __importStar(require('../../../models/Loan')));
        const { Contract } = await Promise.resolve().then(() => __importStar(require('../../../models/Contract')));
        const { StaffAttendance } = await Promise.resolve().then(() => __importStar(require('../../../models/StaffAttendance')));
        const { PayrollPeriod } = await Promise.resolve().then(() => __importStar(require('../../../models/PayrollPeriod')));
        const period = await PayrollPeriod.findById(payrollPeriodId);
        if (!period)
            throw ApiError_1.ApiError.notFound('Payroll period not found');
        if (period.status !== 'LOCKED') {
            throw ApiError_1.ApiError.badRequest('Staff attendance for this period has not been locked yet. Please ask HR to lock attendance before generating payroll.');
        }
        const staff = await Employee.find({ category: 'OFFICE_STAFF', status: 'ACTIVE' });
        const records = [];
        for (const employee of staff) {
            const existing = await StaffPayrollRecord_1.StaffPayrollRecord.findOne({ payrollPeriodId, employeeId: employee._id });
            if (existing)
                continue;
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
            const baseSalary = activeContract?.wage || employee.salary || 0;
            const nonTaxableTransport = employee.transportAllowance || 0;
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
            }
            else {
                const counts = {
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
            const record = await StaffPayrollRecord_1.StaffPayrollRecord.create({
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
                status: types_1.PayrollRecordStatus.DRAFT,
            });
            records.push(record);
        }
        return records;
    }
}
exports.PayrollCalculationService = PayrollCalculationService;
//# sourceMappingURL=payrollCalculation.service.js.map