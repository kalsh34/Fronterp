export declare class PayrollJournalService {
    static postGuardPayroll(record: any, periodLabel: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<import("../../models/JournalEntry").IJournalEntry>;
    static postStaffPayroll(record: any, periodLabel: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<import("../../models/JournalEntry").IJournalEntry>;
}
//# sourceMappingURL=payrollJournal.service.d.ts.map