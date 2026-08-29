"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeService = void 0;
const Employee_1 = require("../../../models/Employee");
const ApiError_1 = require("../../../common/ApiError");
const types_1 = require("../../../types");
const AuditService_1 = require("../../../core/audit/AuditService");
const EventBus_1 = require("../../../core/events/EventBus");
class EmployeeService {
    static async getAll(query) {
        const { page = 1, limit = 20, category, status, search } = query;
        const skip = (page - 1) * limit;
        const filter = {};
        if (category)
            filter.category = category;
        if (status)
            filter.status = status;
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { employeeCode: { $regex: search, $options: 'i' } },
            ];
        }
        const [employees, total] = await Promise.all([
            Employee_1.Employee.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Employee_1.Employee.countDocuments(filter),
        ]);
        return { data: employees, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
    static async getById(id) {
        const employee = await Employee_1.Employee.findById(id);
        if (!employee)
            throw ApiError_1.ApiError.notFound('Employee not found');
        return employee;
    }
    static async create(data, auditCtx) {
        const existing = await Employee_1.Employee.findOne({ employeeCode: data.employeeCode });
        if (existing)
            throw ApiError_1.ApiError.conflict('Employee code already exists');
        const employee = await Employee_1.Employee.create(data);
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'EMPLOYEE_CREATE',
                entity: 'Employee',
                entityId: employee._id.toString(),
                newValues: data,
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.employee.created', { employeeId: employee._id, employeeCode: employee.employeeCode });
        return employee;
    }
    static async update(id, data, auditCtx) {
        const old = await Employee_1.Employee.findById(id);
        if (!old)
            throw ApiError_1.ApiError.notFound('Employee not found');
        const oldValues = old.toObject();
        const employee = await Employee_1.Employee.findByIdAndUpdate(id, data, { new: true, runValidators: true });
        if (!employee)
            throw ApiError_1.ApiError.notFound('Employee not found');
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'EMPLOYEE_UPDATE',
                entity: 'Employee',
                entityId: id,
                oldValues: { firstName: oldValues.firstName, lastName: oldValues.lastName, email: oldValues.email, status: oldValues.status },
                newValues: data,
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.employee.updated', { employeeId: id });
        return employee;
    }
    static async delete(id, auditCtx) {
        const employee = await Employee_1.Employee.findById(id);
        if (!employee)
            throw ApiError_1.ApiError.notFound('Employee not found');
        const snapshot = employee.toObject();
        await Employee_1.Employee.findByIdAndDelete(id);
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'EMPLOYEE_DELETE',
                entity: 'Employee',
                entityId: id,
                oldValues: { employeeCode: snapshot.employeeCode, firstName: snapshot.firstName, lastName: snapshot.lastName },
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.employee.deleted', { employeeId: id, employeeCode: snapshot.employeeCode });
    }
    static async getGuards(query) {
        return this.getAll({ ...query, category: types_1.EmployeeCategory.GUARD });
    }
    static async getOfficeStaff(query) {
        return this.getAll({ ...query, category: types_1.EmployeeCategory.OFFICE_STAFF });
    }
}
exports.EmployeeService = EmployeeService;
//# sourceMappingURL=employee.service.js.map