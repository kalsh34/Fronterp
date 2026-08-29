import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from './employee.service';
import { AuthUser } from '../../../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export class EmployeeController {
  static async getAll(req: QueryRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, category, status, search } = req.query;
      const result = await EmployeeService.getAll({
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
        category: category as any,
        status: status as any,
        search: search as string,
      });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const employee = await EmployeeService.getById(req.params.id);
      res.json({ success: true, data: employee });
    } catch (error) { next(error); }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const employee = await EmployeeService.create(req.body, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: employee });
    } catch (error) { next(error); }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const employee = await EmployeeService.update(req.params.id, req.body, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: employee });
    } catch (error) { next(error); }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await EmployeeService.delete(req.params.id, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, message: 'Employee deleted' });
    } catch (error) { next(error); }
  }

  static async getGuards(req: QueryRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, search } = req.query;
      const result = await EmployeeService.getGuards({
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
        search: search as string,
      });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  static async getOfficeStaff(req: QueryRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, search } = req.query;
      const result = await EmployeeService.getOfficeStaff({
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
        search: search as string,
      });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }
}

interface QueryRequest extends Request {
  query: Record<string, string>;
}
