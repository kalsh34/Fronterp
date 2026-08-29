import mongoose, { Document } from 'mongoose';
export interface IContract extends Document {
    employeeId: mongoose.Types.ObjectId;
    contractStartDate: Date;
    contractEndDate?: Date;
    workingSchedule: string;
    salaryStructureType: string;
    department?: string;
    salaryStructure?: string;
    jobPosition?: string;
    contractType: string;
    wage: number;
    monthlyAdvantagesInCash: number;
    allowances: {
        hra: number;
        da: number;
        travelAllowance: number;
        mealAllowance: number;
        medicalAllowance: number;
        otherAllowance: number;
    };
    notes?: string;
    status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
    createdAt: Date;
    updatedAt: Date;
}
export declare const Contract: mongoose.Model<IContract, {}, {}, {}, mongoose.Document<unknown, {}, IContract, {}, {}> & IContract & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Contract.d.ts.map