"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeController = void 0;
const employee_service_1 = require("./employee.service");
class EmployeeController {
    static async getAll(req, res, next) {
        try {
            const { page, limit, category, status, search } = req.query;
            const result = await employee_service_1.EmployeeService.getAll({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
                category: category,
                status: status,
                search: search,
            });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getById(req, res, next) {
        try {
            const employee = await employee_service_1.EmployeeService.getById(req.params.id);
            res.json({ success: true, data: employee });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const employee = await employee_service_1.EmployeeService.create(req.body, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.status(201).json({ success: true, data: employee });
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const employee = await employee_service_1.EmployeeService.update(req.params.id, req.body, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: employee });
        }
        catch (error) {
            next(error);
        }
    }
    static async delete(req, res, next) {
        try {
            await employee_service_1.EmployeeService.delete(req.params.id, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, message: 'Employee deleted' });
        }
        catch (error) {
            next(error);
        }
    }
    static async getGuards(req, res, next) {
        try {
            const { page, limit, search } = req.query;
            const result = await employee_service_1.EmployeeService.getGuards({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
                search: search,
            });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getOfficeStaff(req, res, next) {
        try {
            const { page, limit, search } = req.query;
            const result = await employee_service_1.EmployeeService.getOfficeStaff({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
                search: search,
            });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.EmployeeController = EmployeeController;
//# sourceMappingURL=employee.controller.js.map