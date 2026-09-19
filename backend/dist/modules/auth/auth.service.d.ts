import { IUser } from '../../models/User';
import { UserRole } from '../../types';
interface LoginResult {
    user: Omit<IUser, 'password'>;
    token: string;
}
export declare class AuthService {
    /**
     * Public registration with bootstrap safety:
     * - If NO users exist yet (fresh database, e.g. first deploy on Render),
     *   the first registered user gets the role they request (bootstrap admin).
     * - Once at least one user exists, public registration can only create
     *   low-privilege GUARD accounts regardless of the requested role.
     *   Higher-privilege users must be created by an authenticated admin
     *   (USER_CREATE permission) via the user-management routes.
     */
    static register(data: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        role?: UserRole;
    }): Promise<IUser>;
    static login(email: string, password: string): Promise<LoginResult>;
    static getMe(userId: string): Promise<IUser>;
    static changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    static updateProfile(userId: string, data: {
        firstName?: string;
        lastName?: string;
        phone?: string;
    }): Promise<IUser>;
}
export {};
//# sourceMappingURL=auth.service.d.ts.map