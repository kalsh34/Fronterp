import { JournalService } from './journal.service';
import { eventBus } from '../../core/events/EventBus';

const ACCOUNTS = {
  SALARY_EXPENSE: { code: '5100', name: 'Salary Expense' },
  GUARD_PAYABLE: { code: '2100', name: 'Guard Payroll Payable' },
  STAFF_PAYABLE: { code: '2110', name: 'Staff Payroll Payable' },
  BANK: { code: '1200', name: 'Bank Account' },
  INCOME_TAX_PAYABLE: { code: '2200', name: 'Income Tax Payable' },
  PENSION_PAYABLE: { code: '2210', name: 'Pension Payable' },
  EMPLOYER_PENSION_EXPENSE: { code: '5200', name: 'Employer Pension Expense' },
  LOAN_PAYABLE: { code: '2300', name: 'Loan Repayment Payable' },
  OT_EXPENSE: { code: '5110', name: 'Overtime Expense' },
  HOLIDAY_EXPENSE: { code: '5120', name: 'Holiday Pay Expense' },
};

export class PayrollJournalService {
  static async postGuardPayroll(record: any, periodLabel: string, userId: string, auditCtx?: { ip?: string; ua?: string }) {
    const lines = [
      {
        accountCode: ACCOUNTS.SALARY_EXPENSE.code,
        accountName: ACCOUNTS.SALARY_EXPENSE.name,
        description: `Guard salary - ${record.guardId?.firstName || ''} ${record.guardId?.lastName || ''} (${periodLabel})`,
        debit: record.grossPay,
        credit: 0,
      },
      {
        accountCode: ACCOUNTS.EMPLOYER_PENSION_EXPENSE.code,
        accountName: ACCOUNTS.EMPLOYER_PENSION_EXPENSE.name,
        description: `Employer pension contribution - ${periodLabel}`,
        debit: record.employerPension,
        credit: 0,
      },
      {
        accountCode: ACCOUNTS.BANK.code,
        accountName: ACCOUNTS.BANK.name,
        description: `Bank payment - Guard payroll (${periodLabel})`,
        debit: 0,
        credit: record.netPay,
      },
      {
        accountCode: ACCOUNTS.INCOME_TAX_PAYABLE.code,
        accountName: ACCOUNTS.INCOME_TAX_PAYABLE.name,
        description: `Income tax deducted - ${periodLabel}`,
        debit: 0,
        credit: record.incomeTax,
      },
      {
        accountCode: ACCOUNTS.PENSION_PAYABLE.code,
        accountName: ACCOUNTS.PENSION_PAYABLE.name,
        description: `Employee pension deducted - ${periodLabel}`,
        debit: 0,
        credit: record.employeePension,
      },
    ];

    if (record.loanDeduction > 0) {
      lines.push({
        accountCode: ACCOUNTS.LOAN_PAYABLE.code,
        accountName: ACCOUNTS.LOAN_PAYABLE.name,
        description: `Loan repayment - ${periodLabel}`,
        debit: 0,
        credit: record.loanDeduction,
      });
    }

    if (record.otPay > 0) {
      lines[0].debit -= record.otPay;
      lines.splice(1, 0, {
        accountCode: ACCOUNTS.OT_EXPENSE.code,
        accountName: ACCOUNTS.OT_EXPENSE.name,
        description: `Overtime pay - ${periodLabel}`,
        debit: record.otPay,
        credit: 0,
      });
    }

    if (record.holidayPay > 0) {
      lines[0].debit -= record.holidayPay;
      lines.splice(2, 0, {
        accountCode: ACCOUNTS.HOLIDAY_EXPENSE.code,
        accountName: ACCOUNTS.HOLIDAY_EXPENSE.name,
        description: `Holiday pay - ${periodLabel}`,
        debit: record.holidayPay,
        credit: 0,
      });
    }

    const entry = await JournalService.createEntry({
      entryType: 'PAYROLL',
      description: `Guard payroll - ${record.guardId?.firstName || ''} ${record.guardId?.lastName || ''} - ${periodLabel}`,
      reference: record.paymentMethod === 'BANK_TRANSFER' ? `BANK-${record.bankReference || 'N/A'}` : `CASH-${periodLabel}`,
      referenceModel: 'GuardPayrollRecord',
      referenceId: (record._id as any).toString(),
      lines,
      payrollPeriodId: (record.payrollPeriodId as any)?._id?.toString() || (record.payrollPeriodId as any)?.toString(),
      userId,
      ip: auditCtx?.ip,
      ua: auditCtx?.ua,
    });

    eventBus.emit('finance.journal.created', { entryId: entry._id, type: 'PAYROLL', module: 'GUARD' });
    return entry;
  }

  static async postStaffPayroll(record: any, periodLabel: string, userId: string, auditCtx?: { ip?: string; ua?: string }) {
    const lines = [
      {
        accountCode: ACCOUNTS.SALARY_EXPENSE.code,
        accountName: ACCOUNTS.SALARY_EXPENSE.name,
        description: `Staff salary - ${record.employeeId?.firstName || ''} ${record.employeeId?.lastName || ''} (${periodLabel})`,
        debit: record.grossSalary,
        credit: 0,
      },
      {
        accountCode: ACCOUNTS.EMPLOYER_PENSION_EXPENSE.code,
        accountName: ACCOUNTS.EMPLOYER_PENSION_EXPENSE.name,
        description: `Employer pension contribution - ${periodLabel}`,
        debit: record.employerPension,
        credit: 0,
      },
      {
        accountCode: ACCOUNTS.BANK.code,
        accountName: ACCOUNTS.BANK.name,
        description: `Bank payment - Staff payroll (${periodLabel})`,
        debit: 0,
        credit: record.netPay,
      },
      {
        accountCode: ACCOUNTS.INCOME_TAX_PAYABLE.code,
        accountName: ACCOUNTS.INCOME_TAX_PAYABLE.name,
        description: `Income tax deducted - ${periodLabel}`,
        debit: 0,
        credit: record.incomeTax,
      },
      {
        accountCode: ACCOUNTS.PENSION_PAYABLE.code,
        accountName: ACCOUNTS.PENSION_PAYABLE.name,
        description: `Employee pension deducted - ${periodLabel}`,
        debit: 0,
        credit: record.employeePension,
      },
    ];

    if (record.loanDeduction > 0) {
      lines.push({
        accountCode: ACCOUNTS.LOAN_PAYABLE.code,
        accountName: ACCOUNTS.LOAN_PAYABLE.name,
        description: `Loan repayment - ${periodLabel}`,
        debit: 0,
        credit: record.loanDeduction,
      });
    }

    if (record.otherDeductions > 0) {
      lines.push({
        accountCode: '2220',
        accountName: 'Other Deductions Payable',
        description: `Other deductions - ${periodLabel}`,
        debit: 0,
        credit: record.otherDeductions,
      });
    }

    const entry = await JournalService.createEntry({
      entryType: 'PAYROLL',
      description: `Staff payroll - ${record.employeeId?.firstName || ''} ${record.employeeId?.lastName || ''} - ${periodLabel}`,
      reference: record.paymentMethod === 'BANK_TRANSFER' ? `BANK-${record.bankReference || 'N/A'}` : `CASH-${periodLabel}`,
      referenceModel: 'StaffPayrollRecord',
      referenceId: (record._id as any).toString(),
      lines,
      payrollPeriodId: (record.payrollPeriodId as any)?._id?.toString() || (record.payrollPeriodId as any)?.toString(),
      userId,
      ip: auditCtx?.ip,
      ua: auditCtx?.ua,
    });

    eventBus.emit('finance.journal.created', { entryId: entry._id, type: 'PAYROLL', module: 'STAFF' });
    return entry;
  }
}
