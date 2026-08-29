"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardPayrollService = void 0;
const GuardPayrollRecord_1 = require("../../../models/GuardPayrollRecord");
const PayrollPeriod_1 = require("../../../models/PayrollPeriod");
const PayrollApproval_1 = require("../../../models/PayrollApproval");
const payrollCalculation_service_1 = require("../finance/payrollCalculation.service");
const payrollJournal_service_1 = require("../../finance-accounting/payrollJournal.service");
const ApiError_1 = require("../../../common/ApiError");
const types_1 = require("../../../types");
const AuditService_1 = require("../../../core/audit/AuditService");
const EventBus_1 = require("../../../core/events/EventBus");
class GuardPayrollService {
    static async getAll(query) {
        const { payrollPeriodId, status, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;
        const filter = {};
        if (payrollPeriodId)
            filter.payrollPeriodId = payrollPeriodId;
        if (status)
            filter.status = status;
        const [records, total] = await Promise.all([
            GuardPayrollRecord_1.GuardPayrollRecord.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('guardId')
                .populate('primarySiteId')
                .populate('payrollPeriodId'),
            GuardPayrollRecord_1.GuardPayrollRecord.countDocuments(filter),
        ]);
        return { data: records, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
    static async getById(id) {
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(id)
            .populate('guardId')
            .populate('primarySiteId')
            .populate('payrollPeriodId');
        if (!record)
            throw ApiError_1.ApiError.notFound('Guard payroll record not found');
        return record;
    }
    static async generateRecords(payrollPeriodId, auditCtx) {
        const period = await PayrollPeriod_1.PayrollPeriod.findById(payrollPeriodId);
        if (!period)
            throw ApiError_1.ApiError.notFound('Payroll period not found');
        if (period.status !== 'OPEN')
            throw ApiError_1.ApiError.badRequest('Period must be OPEN');
        const records = await payrollCalculation_service_1.PayrollCalculationService.generateGuardPayrollRecords(payrollPeriodId);
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'GUARD_PAYROLL_GENERATE',
                entity: 'GuardPayrollRecord',
                newValues: { payrollPeriodId, count: records.length },
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.guardPayroll.generated', { payrollPeriodId, count: records.length });
        return records;
    }
    static async enterRates(recordId, data, userId, auditCtx) {
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        if (record.status !== types_1.PayrollRecordStatus.SUBMITTED && record.status !== types_1.PayrollRecordStatus.RETURNED) {
            throw ApiError_1.ApiError.badRequest('Record must be SUBMITTED or RETURNED');
        }
        const oldRates = { normalRate: record.normalRate, otRate: record.otRate, holidayRate: record.holidayRate };
        record.normalRate = data.normalRate;
        record.otRate = data.otRate;
        record.holidayRate = data.holidayRate;
        record.rateEnteredBy = userId;
        record.rateEnteredAt = new Date();
        record.status = types_1.PayrollRecordStatus.RATE_ENTERED;
        await record.save();
        AuditService_1.AuditService.log({
            userId,
            action: 'GUARD_PAYROLL_ENTER_RATES',
            entity: 'GuardPayrollRecord',
            entityId: recordId,
            oldValues: oldRates,
            newValues: data,
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.guardPayroll.ratesEntered', { recordId });
        return record;
    }
    static async calculate(recordId, pensionTaxBase = types_1.PensionTaxBase.NORMAL_SALARY_ONLY, auditCtx) {
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        if (record.status !== types_1.PayrollRecordStatus.RATE_ENTERED) {
            throw ApiError_1.ApiError.badRequest('Record must be RATE_ENTERED');
        }
        const calculated = await payrollCalculation_service_1.PayrollCalculationService.calculateGuardPayroll(recordId, pensionTaxBase);
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'GUARD_PAYROLL_CALCULATE',
                entity: 'GuardPayrollRecord',
                entityId: recordId,
                newValues: { netPay: calculated.netPay, grossPay: calculated.grossPay },
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.guardPayroll.calculated', { recordId, netPay: calculated.netPay });
        return calculated;
    }
    static async submit(recordId, userId, auditCtx) {
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        if (record.status !== types_1.PayrollRecordStatus.DRAFT && record.status !== types_1.PayrollRecordStatus.RETURNED) {
            throw ApiError_1.ApiError.badRequest('Record must be DRAFT or RETURNED');
        }
        record.status = types_1.PayrollRecordStatus.SUBMITTED;
        record.submittedBy = userId;
        record.submittedAt = new Date();
        await record.save();
        await PayrollApproval_1.PayrollApproval.create({
            payrollRecordId: record._id,
            payrollType: 'GUARD',
            action: 'SUBMITTED',
            performedBy: userId,
        });
        AuditService_1.AuditService.log({
            userId,
            action: 'GUARD_PAYROLL_SUBMIT',
            entity: 'GuardPayrollRecord',
            entityId: recordId,
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.guardPayroll.submitted', { recordId });
        return record;
    }
    static async check(recordId, userId, auditCtx) {
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        if (record.status !== types_1.PayrollRecordStatus.CALCULATED) {
            throw ApiError_1.ApiError.badRequest('Record must be CALCULATED');
        }
        record.status = types_1.PayrollRecordStatus.CHECKED;
        record.checkedBy = userId;
        record.checkedAt = new Date();
        await record.save();
        await PayrollApproval_1.PayrollApproval.create({
            payrollRecordId: record._id,
            payrollType: 'GUARD',
            action: 'CHECKED',
            performedBy: userId,
        });
        AuditService_1.AuditService.log({
            userId,
            action: 'GUARD_PAYROLL_CHECK',
            entity: 'GuardPayrollRecord',
            entityId: recordId,
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.guardPayroll.checked', { recordId });
        return record;
    }
    static async approve(recordId, userId, auditCtx) {
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        if (record.status !== types_1.PayrollRecordStatus.CHECKED) {
            throw ApiError_1.ApiError.badRequest('Record must be CHECKED');
        }
        record.status = types_1.PayrollRecordStatus.APPROVED;
        record.approvedBy = userId;
        record.approvedAt = new Date();
        await record.save();
        await PayrollApproval_1.PayrollApproval.create({
            payrollRecordId: record._id,
            payrollType: 'GUARD',
            action: 'APPROVED',
            performedBy: userId,
        });
        AuditService_1.AuditService.log({
            userId,
            action: 'GUARD_PAYROLL_APPROVE',
            entity: 'GuardPayrollRecord',
            entityId: recordId,
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.guardPayroll.approved', { recordId });
        return record;
    }
    static async markReadyForPayment(recordId) {
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        if (record.status !== types_1.PayrollRecordStatus.APPROVED) {
            throw ApiError_1.ApiError.badRequest('Record must be APPROVED');
        }
        record.status = types_1.PayrollRecordStatus.READY_FOR_PAYMENT;
        await record.save();
        return record;
    }
    static async pay(recordId, data, userId, auditCtx) {
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        if (record.status !== types_1.PayrollRecordStatus.READY_FOR_PAYMENT && record.status !== types_1.PayrollRecordStatus.APPROVED) {
            throw ApiError_1.ApiError.badRequest('Record must be READY_FOR_PAYMENT or APPROVED');
        }
        record.status = types_1.PayrollRecordStatus.PAID;
        record.paymentMethod = data.paymentMethod;
        record.bankReference = data.bankReference;
        record.paymentDate = data.paymentDate;
        record.paidBy = userId;
        record.paidAt = new Date();
        await record.save();
        await PayrollApproval_1.PayrollApproval.create({
            payrollRecordId: record._id,
            payrollType: 'GUARD',
            action: 'PAID',
            performedBy: userId,
        });
        const period = await PayrollPeriod_1.PayrollPeriod.findById(record.payrollPeriodId);
        const periodLabel = period ? `${period.monthName} ${period.year}` : 'Unknown Period';
        try {
            await payrollJournal_service_1.PayrollJournalService.postGuardPayroll(record, periodLabel, userId, auditCtx);
        }
        catch (journalErr) {
            console.error('[GuardPayroll] Failed to post journal entry:', journalErr);
        }
        AuditService_1.AuditService.log({
            userId,
            action: 'GUARD_PAYROLL_PAY',
            entity: 'GuardPayrollRecord',
            entityId: recordId,
            newValues: { paymentMethod: data.paymentMethod, paymentDate: data.paymentDate },
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.guardPayroll.paid', { recordId });
        return record;
    }
    static async returnForCorrection(recordId, userId, reason, auditCtx) {
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        record.status = types_1.PayrollRecordStatus.RETURNED;
        record.returnedBy = userId;
        record.returnedAt = new Date();
        record.returnReason = reason;
        await record.save();
        await PayrollApproval_1.PayrollApproval.create({
            payrollRecordId: record._id,
            payrollType: 'GUARD',
            action: 'RETURNED',
            performedBy: userId,
            notes: reason,
        });
        AuditService_1.AuditService.log({
            userId,
            action: 'GUARD_PAYROLL_RETURN',
            entity: 'GuardPayrollRecord',
            entityId: recordId,
            newValues: { reason },
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.guardPayroll.returned', { recordId, reason });
        return record;
    }
    static async updateHours(recordId, data, userId, auditCtx) {
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        if (record.status !== types_1.PayrollRecordStatus.DRAFT && record.status !== types_1.PayrollRecordStatus.RETURNED) {
            throw ApiError_1.ApiError.badRequest('Record must be DRAFT or RETURNED to edit');
        }
        const oldHours = { normalHours: record.normalHours, otHours: record.otHours, holidayHours: record.holidayHours };
        if (data.normalHours !== undefined)
            record.normalHours = data.normalHours;
        if (data.otHours !== undefined)
            record.otHours = data.otHours;
        if (data.holidayHours !== undefined)
            record.holidayHours = data.holidayHours;
        await record.save();
        AuditService_1.AuditService.log({
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
exports.GuardPayrollService = GuardPayrollService;
//# sourceMappingURL=guardPayroll.service.js.map