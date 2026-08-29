import { Router } from 'express';
import { SiteController } from './site.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();
router.use(authenticate);

router.get('/', authorize(PERMISSIONS.SITE_READ), SiteController.getAll);
router.get('/:id', authorize(PERMISSIONS.SITE_READ), SiteController.getById);
router.post('/', authorize(PERMISSIONS.SITE_CREATE), SiteController.create);
router.put('/:id', authorize(PERMISSIONS.SITE_UPDATE), SiteController.update);

export default router;
