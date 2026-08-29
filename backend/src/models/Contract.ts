import mongoose, { Schema, Document } from 'mongoose';

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

const contractSchema = new Schema<IContract>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    contractStartDate: { type: Date, required: true },
    contractEndDate: { type: Date },
    workingSchedule: { type: String, required: true, default: 'Monday-Friday (9AM-6PM)' },
    salaryStructureType: { type: String, required: true, default: 'Basic' },
    department: { type: String, trim: true },
    salaryStructure: { type: String, trim: true },
    jobPosition: { type: String, trim: true },
    contractType: { type: String, required: true, default: 'Full-Time' },
    wage: { type: Number, required: true, default: 0 },
    monthlyAdvantagesInCash: { type: Number, default: 0 },
    allowances: {
      hra: { type: Number, default: 0 },
      da: { type: Number, default: 0 },
      travelAllowance: { type: Number, default: 0 },
      mealAllowance: { type: Number, default: 0 },
      medicalAllowance: { type: Number, default: 0 },
      otherAllowance: { type: Number, default: 0 },
    },
    notes: { type: String, trim: true },
    status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'TERMINATED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

contractSchema.index({ employeeId: 1 });
contractSchema.index({ status: 1 });

export const Contract = mongoose.model<IContract>('Contract', contractSchema);
