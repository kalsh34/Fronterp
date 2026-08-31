import mongoose, { Schema, Document } from 'mongoose';

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

const shiftTemplateSchema = new Schema<IShiftTemplate>(
  {
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    name: { type: String, required: true, trim: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    daysOfWeek: { type: [Number], required: true, default: [0, 1, 2, 3, 4, 5, 6] },
    color: { type: String, default: '#3B82F6' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

shiftTemplateSchema.index({ siteId: 1, active: 1 });

export const ShiftTemplate = mongoose.model<IShiftTemplate>('ShiftTemplate', shiftTemplateSchema);
