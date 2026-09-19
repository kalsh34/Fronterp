"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../../models/User");
const Employee_1 = require("../../models/Employee");
const env_1 = require("../../config/env");
const ApiError_1 = require("../../common/ApiError");
const types_1 = require("../../types");
class AuthService {
    /**
     * Public registration with bootstrap safety:
     * - If NO users exist yet (fresh database, e.g. first deploy on Render),
     *   the first registered user gets the role they request (bootstrap admin).
     * - Once at least one user exists, public registration can only create
     *   low-privilege GUARD accounts regardless of the requested role.
     *   Higher-privilege users must be created by an authenticated admin
     *   (USER_CREATE permission) via the user-management routes.
     */
    static async register(data) {
        const existing = await User_1.User.findOne({ email: data.email });
        if (existing) {
            throw ApiError_1.ApiError.conflict('Email already registered');
        }
        const userCount = await User_1.User.countDocuments();
        let role;
        if (userCount === 0) {
            // Bootstrap: first user on an empty database gets the requested role
            // (defaults to SUPER_ADMIN when no role is provided).
            role = data.role ?? types_1.UserRole.SUPER_ADMIN;
        }
        else {
            // Database already initialized: public signups are low-privilege only.
            role = types_1.UserRole.GUARD;
        }
        const hashedPassword = await bcryptjs_1.default.hash(data.password, 12);
        const user = await User_1.User.create({
            email: data.email,
            password: hashedPassword,
            firstName: data.firstName,
            lastName: data.lastName,
            role,
        });
        return user;
    }
    static async login(email, password) {
        const user = await User_1.User.findOne({ email }).select('+password');
        if (!user) {
            throw ApiError_1.ApiError.unauthorized('Invalid email or password');
        }
        if (!user.isActive) {
            throw ApiError_1.ApiError.forbidden('Account is deactivated');
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            throw ApiError_1.ApiError.unauthorized('Invalid email or password');
        }
        const tokenPayload = {
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        };
        const token = jsonwebtoken_1.default.sign(tokenPayload, env_1.config.jwtSecret, {
            expiresIn: 86400,
        });
        user.lastLogin = new Date();
        await user.save();
        const userObj = user.toObject();
        const { password: _, ...userWithoutPassword } = userObj;
        return { user: userWithoutPassword, token };
    }
    static async getMe(userId) {
        const user = await User_1.User.findById(userId);
        if (!user) {
            throw ApiError_1.ApiError.notFound('User not found');
        }
        return user;
    }
    static async changePassword(userId, currentPassword, newPassword) {
        const user = await User_1.User.findById(userId).select('+password');
        if (!user) {
            throw ApiError_1.ApiError.notFound('User not found');
        }
        const isMatch = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isMatch) {
            throw ApiError_1.ApiError.unauthorized('Current password is incorrect');
        }
        user.password = await bcryptjs_1.default.hash(newPassword, 12);
        await user.save();
    }
    static async updateProfile(userId, data) {
        const user = await User_1.User.findById(userId);
        if (!user)
            throw ApiError_1.ApiError.notFound('User not found');
        if (data.firstName)
            user.firstName = data.firstName;
        if (data.lastName)
            user.lastName = data.lastName;
        await user.save();
        if (data.phone !== undefined && user.employeeId) {
            await Employee_1.Employee.findByIdAndUpdate(user.employeeId, { phone: data.phone });
        }
        return user;
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map