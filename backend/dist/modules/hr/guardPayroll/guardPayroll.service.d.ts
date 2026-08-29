import { IGuardPayrollRecord } from '../../../models/GuardPayrollRecord';
import { PensionTaxBase } from '../../../types';
export declare class GuardPayrollService {
    static getAll(query: {
        payrollPeriodId?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: (import("mongoose").Document<unknown, {}, IGuardPayrollRecord, {}, {}> & IGuardPayrollRecord & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    static getById(id: string): Promise<IGuardPayrollRecord>;
    static generateRecords(payrollPeriodId: string, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<IGuardPayrollRecord[]>;
    static enterRates(recordId: string, data: {
        normalRate: number;
        otRate: number;
        holidayRate: number;
    }, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IGuardPayrollRecord>;
    static calculate(recordId: string, pensionTaxBase?: PensionTaxBase, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<IGuardPayrollRecord>;
    static submit(recordId: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IGuardPayrollRecord>;
    static check(recordId: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IGuardPayrollRecord>;
    static approve(recordId: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IGuardPayrollRecord>;
    static markReadyForPayment(recordId: string): Promise<IGuardPayrollRecord>;
    static pay(recordId: string, data: {
        paymentMethod: string;
        bankReference?: string;
        paymentDate: Date;
    }, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IGuardPayrollRecord>;
    static returnForCorrection(recordId: string, userId: string, reason: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IGuardPayrollRecord>;
    static updateHours(recordId: string, data: {
        normalHours?: number;
        otHours?: number;
        holidayHours?: number;
    }, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IGuardPayrollRecord>;
}
//# sourceMappingURL=guardPayroll.service.d.ts.map