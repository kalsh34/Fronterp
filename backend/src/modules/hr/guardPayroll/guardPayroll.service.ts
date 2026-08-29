import { GuardPayrollRecord, IGuardPayrollRecord } from '../../../models/GuardPayrollRecord';
import { PayrollPeriod, IPayrollPeriod } from '../../../models/PayrollPeriod';
import { PayrollRate } from '../../../models/PayrollRate';
import { PayrollApproval } from '../../../models/PayrollApproval';
import { PayrollCalculationService } from '../finance/payrollCalculation.service';
import { PayrollJournalService } from '../../finance-accounting/payrollJournal.service';
import { ApiError } from '../../../common/ApiError';
import { PayrollRecordStatus, PensionTaxBase } from '../../../types';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';

export class GuardPayrollService {
  static async getAll(query: { payrollPeriodId?: string; status?: string; page?: number; limit?: number }) {
    const { payrollPeriodId, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (payrollPeriodId) filter.payrollPeriodId = payrollPeriodId;
    if (status) filter.status = status;

    const [records, total] = await Promise.all([
      GuardPayrollRecord.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('guardId')
        .populate('primarySiteId')
        .populate('payrollPeriodId'),
      GuardPayrollRecord.countDocuments(filter),
    ]);
    return { data: records, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async getById(id: string): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(id)
      .populate('guardId')
      .populate('primarySiteId')
      .populate('payrollPeriodId');
    if (!record) throw ApiError.notFound('Guard payroll record not found');
    return record;
  }

  static async generateRecords(payrollPeriodId: string, auditCtx?: { userId: string; ip?: string; ua?: string }) {
    const period = await PayrollPeriod.findById(payrollPeriodId);
    if (!period) throw ApiError.notFound('Payroll period not found');
    if (period.status !== 'OPEN') throw ApiError.badRequest('Period must be OPEN');

    const records = await PayrollCalculationService.generateGuardPayrollRecords(payrollPeriodId);

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'GUARD_PAYROLL_GENERATE',
        entity: 'GuardPayrollRecord',
        newValues: { payrollPeriodId, count: records.length },
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.guardPayroll.generated', { payrollPeriodId, count: records.length });

    return records;
  }

  static async enterRates(
    recordId: string,
    data: { normalRate: number; otRate: number; holidayRate: number },
    userId: string,
    auditCtx?: { ip?: string; ua?: string }
  ): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Record not found');
    if (record.status !== PayrollRecordStatus.SUBMITTED && record.status !== PayrollRecordStatus.RETURNED) {
      throw ApiError.badRequest('Record must be SUBMITTED or RETURNED');
    }

    const oldRates = { normalRate: record.normalRate, otRate: record.otRate, holidayRate: record.holidayRate };
    record.normalRate = data.normalRate;
    record.otRate = data.otRate;
    record.holidayRate = data.holidayRate;
    record.rateEnteredBy = userId as any;
    record.rateEnteredAt = new Date();
    record.status = PayrollRecordStatus.RATE_ENTERED;
    await record.save();

    AuditService.log({
      userId,
      action: 'GUARD_PAYROLL_ENTER_RATES',
      entity: 'GuardPayrollRecord',
      entityId: recordId,
      oldValues: oldRates,
      newValues: data,
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
    eventBus.emit('hr.guardPayroll.ratesEntered', { recordId });

    return record;
  }

  static async calculate(
    recordId: string,
    pensionTaxBase: PensionTaxBase = PensionTaxBase.NORMAL_SALARY_ONLY,
    auditCtx?: { userId: string; ip?: string; ua?: string }
  ): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Record not found');
    if (record.status !== PayrollRecordStatus.RATE_ENTERED) {
      throw ApiError.badRequest('Record must be RATE_ENTERED');
    }

    const calculated = await PayrollCalculationService.calculateGuardPayroll(recordId, pensionTaxBase);

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'GUARD_PAYROLL_CALCULATE',
        entity: 'GuardPayrollRecord',
        entityId: recordId,
        newValues: { netPay: calculated.netPay, grossPay: calculated.grossPay },
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.guardPayroll.calculated', { recordId, netPay: calculated.netPay });

    return calculated;
  }

  static async submit(recordId: string, userId: string, auditCtx?: { ip?: string; ua?: string }): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Record not found');
    if (record.status !== PayrollRecordStatus.DRAFT && record.status !== PayrollRecordStatus.RETURNED) {
      throw ApiError.badRequest('Record must be DRAFT or RETURNED');
    }

    record.status = PayrollRecordStatus.SUBMITTED;
    record.submittedBy = userId as any;
    record.submittedAt = new Date();
    await record.save();

    await PayrollApproval.create({
      payrollRecordId: record._id,
      payrollType: 'GUARD',
      action: 'SUBMITTED',
      performedBy: userId,
    });

    AuditService.log({
      userId,
      action: 'GUARD_PAYROLL_SUBMIT',
      entity: 'GuardPayrollRecord',
      entityId: recordId,
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
    eventBus.emit('hr.guardPayroll.submitted', { recordId });

    return record;
  }

  static async check(recordId: string, userId: string, auditCtx?: { ip?: string; ua?: string }): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Record not found');
    if (record.status !== PayrollRecordStatus.CALCULATED) {
      throw ApiError.badRequest('Record must be CALCULATED');
    }

    record.status = PayrollRecordStatus.CHECKED;
    record.checkedBy = userId as any;
    record.checkedAt = new Date();
    await record.save();

    await PayrollApproval.create({
      payrollRecordId: record._id,
      payrollType: 'GUARD',
      action: 'CHECKED',
      performedBy: userId,
    });

    AuditService.log({
      userId,
      action: 'GUARD_PAYROLL_CHECK',
      entity: 'GuardPayrollRecord',
      entityId: recordId,
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
    eventBus.emit('hr.guardPayroll.checked', { recordId });

    return record;
  }

  static async approve(recordId: string, userId: string, auditCtx?: { ip?: string; ua?: string }): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Record not found');
    if (record.status !== PayrollRecordStatus.CHECKED) {
      throw ApiError.badRequest('Record must be CHECKED');
    }

    record.status = PayrollRecordStatus.APPROVED;
    record.approvedBy = userId as any;
    record.approvedAt = new Date();
    await record.save();

    await PayrollApproval.create({
      payrollRecordId: record._id,
      payrollType: 'GUARD',
      action: 'APPROVED',
      performedBy: userId,
    });

    AuditService.log({
      userId,
      action: 'GUARD_PAYROLL_APPROVE',
      entity: 'GuardPayrollRecord',
      entityId: recordId,
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
    eventBus.emit('hr.guardPayroll.approved', { recordId });

    return record;
  }

  static async markReadyForPayment(recordId: string): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Record not found');
    if (record.status !== PayrollRecordStatus.APPROVED) {
      throw ApiError.badRequest('Record must be APPROVED');
    }

    record.status = PayrollRecordStatus.READY_FOR_PAYMENT;
    await record.save();
    return record;
  }

  static async pay(
    recordId: string,
    data: { paymentMethod: string; bankReference?: string; paymentDate: Date },
    userId: string,
    auditCtx?: { ip?: string; ua?: string }
  ): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Record not found');
    if (record.status !== PayrollRecordStatus.READY_FOR_PAYMENT && record.status !== PayrollRecordStatus.APPROVED) {
      throw ApiError.badRequest('Record must be READY_FOR_PAYMENT or APPROVED');
    }

    record.status = PayrollRecordStatus.PAID;
    record.paymentMethod = data.paymentMethod;
    record.bankReference = data.bankReference;
    record.paymentDate = data.paymentDate;
    record.paidBy = userId as any;
    record.paidAt = new Date();
    await record.save();

    await PayrollApproval.create({
      payrollRecordId: record._id,
      payrollType: 'GUARD',
      action: 'PAID',
      performedBy: userId,
    });

    const period = await PayrollPeriod.findById(record.payrollPeriodId);
    const periodLabel = period ? `${period.monthName} ${period.year}` : 'Unknown Period';
    try {
      await PayrollJournalService.postGuardPayroll(record, periodLabel, userId, auditCtx);
    } catch (journalErr) {
      console.error('[GuardPayroll] Failed to post journal entry:', journalErr);
    }

    AuditService.log({
      userId,
      action: 'GUARD_PAYROLL_PAY',
      entity: 'GuardPayrollRecord',
      entityId: recordId,
      newValues: { paymentMethod: data.paymentMethod, paymentDate: data.paymentDate },
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
    eventBus.emit('hr.guardPayroll.paid', { recordId });

    return record;
  }

  static async returnForCorrection(recordId: string, userId: string, reason: string, auditCtx?: { ip?: string; ua?: string }): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Record not found');

    record.status = PayrollRecordStatus.RETURNED;
    record.returnedBy = userId as any;
    record.returnedAt = new Date();
    record.returnReason = reason;
    await record.save();

    await PayrollApproval.create({
      payrollRecordId: record._id,
      payrollType: 'GUARD',
      action: 'RETURNED',
      performedBy: userId,
      notes: reason,
    });

    AuditService.log({
      userId,
      action: 'GUARD_PAYROLL_RETURN',
      entity: 'GuardPayrollRecord',
      entityId: recordId,
      newValues: { reason },
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
    eventBus.emit('hr.guardPayroll.returned', { recordId, reason });

    return record;
  }

  static async updateHours(
    recordId: string,
    data: { normalHours?: number; otHours?: number; holidayHours?: number },
    userId: string,
    auditCtx?: { ip?: string; ua?: string }
  ): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Record not found');
    if (record.status !== PayrollRecordStatus.DRAFT && record.status !== PayrollRecordStatus.RETURNED) {
      throw ApiError.badRequest('Record must be DRAFT or RETURNED to edit');
    }

    const oldHours = { normalHours: record.normalHours, otHours: record.otHours, holidayHours: record.holidayHours };
    if (data.normalHours !== undefined) record.normalHours = data.normalHours;
    if (data.otHours !== undefined) record.otHours = data.otHours;
    if (data.holidayHours !== undefined) record.holidayHours = data.holidayHours;
    await record.save();

    AuditService.log({
      userId,
      action: 'GUARD_PAYROLL_UPDATE_HOURS',
      entity: 'GuardPayrollRecord',
      entityId: recordId,
      oldValues: oldHours,
      newValues: data,
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });

    return record;
  }
}
