import { Employee, IEmployee } from '../../../models/Employee';
import { ApiError } from '../../../common/ApiError';
import { EmployeeCategory, EmployeeStatus } from '../../../types';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';

export class EmployeeService {
  static async getAll(query: { page?: number; limit?: number; category?: EmployeeCategory; status?: EmployeeStatus; search?: string }) {
    const { page = 1, limit = 20, category, status, search } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { employeeCode: { $regex: search, $options: 'i' } },
      ];
    }

    const [employees, total] = await Promise.all([
      Employee.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Employee.countDocuments(filter),
    ]);

    return { data: employees, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async getById(id: string): Promise<IEmployee> {
    const employee = await Employee.findById(id);
    if (!employee) throw ApiError.notFound('Employee not found');
    return employee;
  }

  static async create(data: Partial<IEmployee>, auditCtx?: { userId: string; ip?: string; ua?: string }): Promise<IEmployee> {
    const existing = await Employee.findOne({ employeeCode: data.employeeCode });
    if (existing) throw ApiError.conflict('Employee code already exists');
    const employee = await Employee.create(data);

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'EMPLOYEE_CREATE',
        entity: 'Employee',
        entityId: (employee._id as any).toString(),
        newValues: data as Record<string, unknown>,
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.employee.created', { employeeId: employee._id, employeeCode: employee.employeeCode });

    return employee;
  }

  static async update(id: string, data: Partial<IEmployee>, auditCtx?: { userId: string; ip?: string; ua?: string }): Promise<IEmployee> {
    const old = await Employee.findById(id);
    if (!old) throw ApiError.notFound('Employee not found');
    const oldValues = old.toObject();

    const employee = await Employee.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!employee) throw ApiError.notFound('Employee not found');

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'EMPLOYEE_UPDATE',
        entity: 'Employee',
        entityId: id,
        oldValues: { firstName: oldValues.firstName, lastName: oldValues.lastName, email: oldValues.email, status: oldValues.status },
        newValues: data as Record<string, unknown>,
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.employee.updated', { employeeId: id });

    return employee;
  }

  static async delete(id: string, auditCtx?: { userId: string; ip?: string; ua?: string }): Promise<void> {
    const employee = await Employee.findById(id);
    if (!employee) throw ApiError.notFound('Employee not found');
    const snapshot = employee.toObject();

    await Employee.findByIdAndDelete(id);

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'EMPLOYEE_DELETE',
        entity: 'Employee',
        entityId: id,
        oldValues: { employeeCode: snapshot.employeeCode, firstName: snapshot.firstName, lastName: snapshot.lastName },
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.employee.deleted', { employeeId: id, employeeCode: snapshot.employeeCode });
  }

  static async getGuards(query: { page?: number; limit?: number; search?: string }) {
    return this.getAll({ ...query, category: EmployeeCategory.GUARD });
  }

  static async getOfficeStaff(query: { page?: number; limit?: number; search?: string }) {
    return this.getAll({ ...query, category: EmployeeCategory.OFFICE_STAFF });
  }
}
