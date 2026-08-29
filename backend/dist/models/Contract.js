"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Contract = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const contractSchema = new mongoose_1.Schema({
    employeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
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
}, { timestamps: true });
contractSchema.index({ employeeId: 1 });
contractSchema.index({ status: 1 });
exports.Contract = mongoose_1.default.model('Contract', contractSchema);
//# sourceMappingURL=Contract.js.map