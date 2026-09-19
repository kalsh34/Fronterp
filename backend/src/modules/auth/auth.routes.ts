import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { loginValidation, registerValidation, changePasswordValidation, updateProfileValidation } from './auth.validation';
import { PERMISSIONS } from '../../types';

const router = Router();

router.post('/login', loginValidation, validate, AuthController.login);
// Public registration with bootstrap safety:
// - If no users exist yet, the first registered user gets their requested role (bootstrap).
// - After that, public registration only creates low-privilege (GUARD) accounts.
// Admin-only user creation with full role control remains available via
// authenticate + USER_CREATE permission on other user-management routes.
router.post('/register', registerValidation, validate, AuthController.register);
router.get('/me', authenticate, AuthController.getMe);
router.put('/change-password', authenticate, changePasswordValidation, validate, AuthController.changePassword);
router.put('/profile', authenticate, updateProfileValidation, validate, AuthController.updateProfile);

export default router;
