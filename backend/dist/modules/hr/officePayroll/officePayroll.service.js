"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffPayrollService = void 0;
const StaffPayrollRecord_1 = require("../../../models/StaffPayrollRecord");
const PayrollPeriod_1 = require("../../../models/PayrollPeriod");
const PayrollApproval_1 = require("../../../models/PayrollApproval");
const payrollCalculation_service_1 = require("../finance/payrollCalculation.service");
const payrollJournal_service_1 = require("../../finance-accounting/payrollJournal.service");
const ApiError_1 = require("../../../common/ApiError");
const types_1 = require("../../../types");
const AuditService_1 = require("../../../core/audit/AuditService");
const EventBus_1 = require("../../../core/events/EventBus");
class StaffPayrollService {
    static async getAll(query) {
        const { payrollPeriodId, status, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;
        const filter = {};
        if (payrollPeriodId)
            filter.payrollPeriodId = payrollPeriodId;
        if (status)
            filter.status = status;
        const [records, total] = await Promise.all([
            StaffPayrollRecord_1.StaffPayrollRecord.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('employeeId')
                .populate('payrollPeriodId'),
            StaffPayrollRecord_1.StaffPayrollRecord.countDocuments(filter),
        ]);
        return { data: records, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
    static async getById(id) {
        const record = await StaffPayrollRecord_1.StaffPayrollRecord.findById(id)
            .populate('employeeId')
            .populate('payrollPeriodId');
        if (!record)
            throw ApiError_1.ApiError.notFound('Staff payroll record not found');
        return record;
    }
    static async updateSalaryInputs(recordId, data, auditCtx) {
        const record = await StaffPayrollRecord_1.StaffPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        if (record.status !== types_1.PayrollRecordStatus.DRAFT && record.status !== types_1.PayrollRecordStatus.RETURNED) {
            throw ApiError_1.ApiError.badRequest('Record must be DRAFT or RETURNED');
        }
        Object.assign(record, data);
        await record.save();
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'STAFF_PAYROLL_UPDATE_INPUTS',
                entity: 'StaffPayrollRecord',
                entityId: recordId,
                newValues: data,
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.staffPayroll.inputsUpdated', { recordId });
        return record;
    }
    static async calculate(recordId, auditCtx) {
        const record = await StaffPayrollRecord_1.StaffPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        const calculated = await payrollCalculation_service_1.PayrollCalculationService.calculateStaffPayroll(recordId);
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'STAFF_PAYROLL_CALCULATE',
                entity: 'StaffPayrollRecord',
                entityId: recordId,
                newValues: { netPay: calculated.netPay, grossSalary: calculated.grossSalary },
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.staffPayroll.calculated', { recordId, netPay: calculated.netPay });
        return calculated;
    }
    static async submit(recordId, userId, auditCtx) {
        const record = await StaffPayrollRecord_1.StaffPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        if (record.status !== types_1.PayrollRecordStatus.DRAFT && record.status !== types_1.PayrollRecordStatus.RETURNED && record.status !== types_1.PayrollRecordStatus.CALCULATED) {
            throw ApiError_1.ApiError.badRequest('Record must be DRAFT, CALCULATED, or RETURNED');
        }
        record.status = types_1.PayrollRecordStatus.SUBMITTED;
        record.submittedBy = userId;
        record.submittedAt = new Date();
        await record.save();
        await PayrollApproval_1.PayrollApproval.create({ payrollRecordId: record._id, payrollType: 'STAFF', action: 'SUBMITTED', performedBy: userId });
        AuditService_1.AuditService.log({
            userId,
            action: 'STAFF_PAYROLL_SUBMIT',
            entity: 'StaffPayrollRecord',
            entityId: recordId,
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.staffPayroll.submitted', { recordId });
        return record;
    }
    static async check(recordId, userId, auditCtx) {
        const record = await StaffPayrollRecord_1.StaffPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        if (record.status !== types_1.PayrollRecordStatus.SUBMITTED)
            throw ApiError_1.ApiError.badRequest('Record must be SUBMITTED');
        record.status = types_1.PayrollRecordStatus.CHECKED;
        record.checkedBy = userId;
        record.checkedAt = new Date();
        await record.save();
        await PayrollApproval_1.PayrollApproval.create({ payrollRecordId: record._id, payrollType: 'STAFF', action: 'CHECKED', performedBy: userId });
        AuditService_1.AuditService.log({
            userId,
            action: 'STAFF_PAYROLL_CHECK',
            entity: 'StaffPayrollRecord',
            entityId: recordId,
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.staffPayroll.checked', { recordId });
        return record;
    }
    static async approve(recordId, userId, auditCtx) {
        const record = await StaffPayrollRecord_1.StaffPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        if (record.status !== types_1.PayrollRecordStatus.CHECKED)
            throw ApiError_1.ApiError.badRequest('Record must be CHECKED');
        record.status = types_1.PayrollRecordStatus.APPROVED;
        record.approvedBy = userId;
        record.approvedAt = new Date();
        await record.save();
        await PayrollApproval_1.PayrollApproval.create({ payrollRecordId: record._id, payrollType: 'STAFF', action: 'APPROVED', performedBy: userId });
        AuditService_1.AuditService.log({
            userId,
            action: 'STAFF_PAYROLL_APPROVE',
            entity: 'StaffPayrollRecord',
            entityId: recordId,
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.staffPayroll.approved', { recordId });
        return record;
    }
    static async pay(recordId, data, userId, auditCtx) {
        const record = await StaffPayrollRecord_1.StaffPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        if (record.status !== types_1.PayrollRecordStatus.APPROVED)
            throw ApiError_1.ApiError.badRequest('Record must be APPROVED');
        record.status = types_1.PayrollRecordStatus.PAID;
        record.paymentMethod = data.paymentMethod;
        record.bankReference = data.bankReference;
        record.paymentDate = data.paymentDate;
        record.paidBy = userId;
        record.paidAt = new Date();
        await record.save();
        await PayrollApproval_1.PayrollApproval.create({ payrollRecordId: record._id, payrollType: 'STAFF', action: 'PAID', performedBy: userId });
        const period = await PayrollPeriod_1.PayrollPeriod.findById(record.payrollPeriodId);
        const periodLabel = period ? `${period.monthName} ${period.year}` : 'Unknown Period';
        try {
            await payrollJournal_service_1.PayrollJournalService.postStaffPayroll(record, periodLabel, userId, auditCtx);
        }
        catch (journalErr) {
            console.error('[StaffPayroll] Failed to post journal entry:', journalErr);
        }
        AuditService_1.AuditService.log({
            userId,
            action: 'STAFF_PAYROLL_PAY',
            entity: 'StaffPayrollRecord',
            entityId: recordId,
            newValues: { paymentMethod: data.paymentMethod, paymentDate: data.paymentDate },
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.staffPayroll.paid', { recordId });
        return record;
    }
    static async returnForCorrection(recordId, userId, reason, auditCtx) {
        const record = await StaffPayrollRecord_1.StaffPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        record.status = types_1.PayrollRecordStatus.RETURNED;
        record.returnedBy = userId;
        record.returnedAt = new Date();
        record.returnReason = reason;
        await record.save();
        await PayrollApproval_1.PayrollApproval.create({ payrollRecordId: record._id, payrollType: 'STAFF', action: 'RETURNED', performedBy: userId, notes: reason });
        AuditService_1.AuditService.log({
            userId,
            action: 'STAFF_PAYROLL_RETURN',
            entity: 'StaffPayrollRecord',
            entityId: recordId,
            newValues: { reason },
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.staffPayroll.returned', { recordId, reason });
        return record;
    }
}
exports.StaffPayrollService = StaffPayrollService;
//# sourceMappingURL=officePayroll.service.js.map