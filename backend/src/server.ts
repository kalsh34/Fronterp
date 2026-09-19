import app from './app';
import { config } from './config/env';
import { connectDatabase } from './config/database';
import { registerHRPermissions } from './modules/hr/permissions/hr.permissions';
import { registerPayrollPermissions } from './modules/hr/permissions/payroll.permissions';
import { registerCorePermissions } from './core/permissions/core.permissions';
import { User } from './models/User';
import { UserRole } from './types';
import bcrypt from 'bcryptjs';

const registerAllPermissions = () => {
  registerCorePermissions();
  registerHRPermissions();
  registerPayrollPermissions();
  console.log('[PERMISSIONS] All module permissions registered');
};

/**
 * Auto-bootstrap: if the database has NO users at all (fresh deploy, e.g.
 * first launch on Render), create a default SUPER_ADMIN so someone can
 * always log in. Runs once per startup; a no-op when users already exist.
 */
const bootstrapDefaultAdmin = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) return;

    const email = 'admin@vitalpayroll.com';
    const password = 'password123';
    const hashed = await bcrypt.hash(password, 12);
    await User.create({
      email,
      password: hashed,
      firstName: 'System',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    });
    console.log(`[BOOTSTRAP] No users found — created default admin ${email} (password: ${password}). Change this password after first login!`);
  } catch (error) {
    console.error('[BOOTSTRAP] Failed to create default admin:', error);
  }
};

const start = async () => {
  try {
    await connectDatabase();
    registerAllPermissions();
    await bootstrapDefaultAdmin();
    app.listen(config.port, () => {
      console.log(`[SERVER] Running on port ${config.port} in ${config.nodeEnv} mode`);
    });
  } catch (error) {
    console.error('[SERVER] Failed to start:', error);
    process.exit(1);
  }
};

start();
