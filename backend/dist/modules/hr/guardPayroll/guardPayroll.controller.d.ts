import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../../../middleware/auth';
interface AuthenticatedRequest extends Request {
    user?: AuthUser;
}
export declare class GuardPayrollController {
    static getAll(req: any, res: Response, next: NextFunction): Promise<void>;
    static getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    static generateRecords(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static enterRates(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static calculate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static submit(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static check(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static approve(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static pay(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static returnForCorrection(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static updateHours(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}
export {};
//# sourceMappingURL=guardPayroll.controller.d.ts.map