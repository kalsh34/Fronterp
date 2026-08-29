import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../../../middleware/auth';
interface AuthenticatedRequest extends Request {
    user?: AuthUser;
}
export declare class EmployeeController {
    static getAll(req: QueryRequest, res: Response, next: NextFunction): Promise<void>;
    static getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    static create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static getGuards(req: QueryRequest, res: Response, next: NextFunction): Promise<void>;
    static getOfficeStaff(req: QueryRequest, res: Response, next: NextFunction): Promise<void>;
}
interface QueryRequest extends Request {
    query: Record<string, string>;
}
export {};
//# sourceMappingURL=employee.controller.d.ts.map