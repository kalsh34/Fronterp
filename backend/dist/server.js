"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const hr_permissions_1 = require("./modules/hr/permissions/hr.permissions");
const payroll_permissions_1 = require("./modules/hr/permissions/payroll.permissions");
const core_permissions_1 = require("./core/permissions/core.permissions");
const User_1 = require("./models/User");
const types_1 = require("./types");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const registerAllPermissions = () => {
    (0, core_permissions_1.registerCorePermissions)();
    (0, hr_permissions_1.registerHRPermissions)();
    (0, payroll_permissions_1.registerPayrollPermissions)();
    console.log('[PERMISSIONS] All module permissions registered');
};
/**
 * Auto-bootstrap: if the database has NO users at all (fresh deploy, e.g.
 * first launch on Render), create a default SUPER_ADMIN so someone can
 * always log in. Runs once per startup; a no-op when users already exist.
 */
const bootstrapDefaultAdmin = async () => {
    try {
        const userCount = await User_1.User.countDocuments();
        if (userCount > 0)
            return;
        const email = 'admin@vitalpayroll.com';
        const password = 'password123';
        const hashed = await bcryptjs_1.default.hash(password, 12);
        await User_1.User.create({
            email,
            password: hashed,
            firstName: 'System',
            lastName: 'Admin',
            role: types_1.UserRole.SUPER_ADMIN,
            isActive: true,
        });
        console.log(`[BOOTSTRAP] No users found — created default admin ${email} (password: ${password}). Change this password after first login!`);
    }
    catch (error) {
        console.error('[BOOTSTRAP] Failed to create default admin:', error);
    }
};
const start = async () => {
    try {
        await (0, database_1.connectDatabase)();
        registerAllPermissions();
        await bootstrapDefaultAdmin();
        app_1.default.listen(env_1.config.port, () => {
            console.log(`[SERVER] Running on port ${env_1.config.port} in ${env_1.config.nodeEnv} mode`);
        });
    }
    catch (error) {
        console.error('[SERVER] Failed to start:', error);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=server.js.map