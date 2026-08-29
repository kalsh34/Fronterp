import mongoose from 'mongoose';
import { IEmployee } from '../../../models/Employee';
import { IGuardProfile } from '../../../models/GuardProfile';
import { IPrimarySiteAssignment } from '../../../models/PrimarySiteAssignment';
import { UserRole } from '../../../types';
export declare class GuardService {
    static registerGuard(data: {
        firstName: string;
        lastName: string;
        phone?: string;
        idCardNumber?: string;
        employmentType: string;
        email: string;
        password: string;
        rate?: number;
        transportAllowance?: number;
    }, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<{
        employee: IEmployee;
        user: any;
    }>;
    static assignSite(data: {
        guardId: string;
        siteId: string;
        role?: 'GUARD' | 'SUPERVISOR';
    }, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<IPrimarySiteAssignment>;
    static getGuardSites(guardId: string): Promise<(mongoose.Document<unknown, {}, IPrimarySiteAssignment, {}, {}> & IPrimarySiteAssignment & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static removeSiteAssignment(assignmentId: string, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, IPrimarySiteAssignment, {}, {}> & IPrimarySiteAssignment & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static getAllGuards(): Promise<{
        employee: mongoose.Document<unknown, {}, IEmployee, {}, {}> & IEmployee & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        profile: (mongoose.Document<unknown, {}, IGuardProfile, {}, {}> & IGuardProfile & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        }) | null;
        currentAssignments: (mongoose.Document<unknown, {}, IPrimarySiteAssignment, {}, {}> & IPrimarySiteAssignment & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }[]>;
    static getGuardDetail(employeeId: string): Promise<{
        employee: mongoose.Document<unknown, {}, IEmployee, {}, {}> & IEmployee & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        profile: (mongoose.Document<unknown, {}, IGuardProfile, {}, {}> & IGuardProfile & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        }) | null;
        assignments: (mongoose.Document<unknown, {}, IPrimarySiteAssignment, {}, {}> & IPrimarySiteAssignment & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        user: {
            email: string;
            role: UserRole;
            isActive: boolean;
        } | null;
    }>;
    static updateGuard(employeeId: string, data: Partial<IEmployee>, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, IEmployee, {}, {}> & IEmployee & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static updateGuardPayRate(assignmentId: string, hourlyRate: number, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<mongoose.Document<unknown, {}, IPrimarySiteAssignment, {}, {}> & IPrimarySiteAssignment & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
//# sourceMappingURL=guard.service.d.ts.map