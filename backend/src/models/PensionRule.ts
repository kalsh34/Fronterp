import mongoose, { Schema, Document } from 'mongoose';

export interface IPensionRule extends Document {
  label: string;
  employeeRate: number;
  employerRate: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pensionRuleSchema = new Schema<IPensionRule>(
  {
    label: { type: String, required: true },
    employeeRate: { type: Number, required: true },
    employerRate: { type: Number, required: true },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },
    isCurrent: { type: Boolean, default: true },
  },
  { timestamps: true }
);

pensionRuleSchema.index({ isCurrent: 1 });

export const PensionRule = mongoose.model<IPensionRule>('PensionRule', pensionRuleSchema);
