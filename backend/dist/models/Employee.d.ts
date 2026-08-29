import mongoose, { Document } from 'mongoose';
import { EmployeeCategory, EmployeeStatus, Gender, EmploymentType } from '../types';
export interface IEmployee extends Document {
    employeeCode: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    category: EmployeeCategory;
    status: EmployeeStatus;
    companyId?: mongoose.Types.ObjectId;
    partyId?: mongoose.Types.ObjectId;
    dateOfBirth?: Date;
    gender?: Gender;
    phone?: string;
    email?: string;
    address?: string;
    hireDate: Date;
    department?: string;
    position?: string;
    bankName?: string;
    bankBranch?: string;
    accountNumber?: string;
    salary?: number;
    transportAllowance?: number;
    guardInfo?: {
        employmentType: EmploymentType;
        idCardNumber?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const Employee: mongoose.Model<IEmployee, {}, {}, {}, mongoose.Document<unknown, {}, IEmployee, {}, {}> & IEmployee & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Employee.d.ts.map