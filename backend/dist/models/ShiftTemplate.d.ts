import mongoose, { Document } from 'mongoose';
export interface IShiftTemplate extends Document {
    siteId: mongoose.Types.ObjectId;
    name: string;
    startTime: string;
    endTime: string;
    daysOfWeek: number[];
    color: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ShiftTemplate: mongoose.Model<IShiftTemplate, {}, {}, {}, mongoose.Document<unknown, {}, IShiftTemplate, {}, {}> & IShiftTemplate & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=ShiftTemplate.d.ts.map