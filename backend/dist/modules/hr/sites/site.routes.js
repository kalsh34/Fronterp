"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const site_controller_1 = require("./site.controller");
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.SITE_READ), site_controller_1.SiteController.getAll);
router.get('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SITE_READ), site_controller_1.SiteController.getById);
router.post('/', (0, rbac_1.authorize)(types_1.PERMISSIONS.SITE_CREATE), site_controller_1.SiteController.create);
router.put('/:id', (0, rbac_1.authorize)(types_1.PERMISSIONS.SITE_UPDATE), site_controller_1.SiteController.update);
exports.default = router;
//# sourceMappingURL=site.routes.js.map