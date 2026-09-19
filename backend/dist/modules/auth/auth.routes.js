"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const auth_validation_1 = require("./auth.validation");
const router = (0, express_1.Router)();
router.post('/login', auth_validation_1.loginValidation, validate_1.validate, auth_controller_1.AuthController.login);
// Public registration with bootstrap safety:
// - If no users exist yet, the first registered user gets their requested role (bootstrap).
// - After that, public registration only creates low-privilege (GUARD) accounts.
// Admin-only user creation with full role control remains available via
// authenticate + USER_CREATE permission on other user-management routes.
router.post('/register', auth_validation_1.registerValidation, validate_1.validate, auth_controller_1.AuthController.register);
router.get('/me', auth_1.authenticate, auth_controller_1.AuthController.getMe);
router.put('/change-password', auth_1.authenticate, auth_validation_1.changePasswordValidation, validate_1.validate, auth_controller_1.AuthController.changePassword);
router.put('/profile', auth_1.authenticate, auth_validation_1.updateProfileValidation, validate_1.validate, auth_controller_1.AuthController.updateProfile);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map