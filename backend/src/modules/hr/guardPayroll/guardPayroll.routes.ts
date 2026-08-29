import { Router } from 'express';
import { GuardPayrollController } from './guardPayroll.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();
router.use(authenticate);

router.get('/', authorize(PERMISSIONS.GUARD_PAYROLL_READ), GuardPayrollController.getAll);
router.get('/:id', authorize(PERMISSIONS.GUARD_PAYROLL_READ), GuardPayrollController.getById);
router.post('/generate/:periodId', authorize(PERMISSIONS.GUARD_PAYROLL_CALCULATE), GuardPayrollController.generateRecords);
router.put('/:id/hours', authorize(PERMISSIONS.GUARD_MODIFY_HOURS), GuardPayrollController.updateHours);
router.post('/:id/submit', authorize(PERMISSIONS.GUARD_PAYROLL_READ), GuardPayrollController.submit);
router.put('/:id/rates', authorize(PERMISSIONS.GUARD_PAYROLL_RATES), GuardPayrollController.enterRates);
router.post('/:id/calculate', authorize(PERMISSIONS.GUARD_PAYROLL_CALCULATE), GuardPayrollController.calculate);
router.post('/:id/check', authorize(PERMISSIONS.GUARD_PAYROLL_CHECK), GuardPayrollController.check);
router.post('/:id/approve', authorize(PERMISSIONS.GUARD_PAYROLL_APPROVE), GuardPayrollController.approve);
router.post('/:id/pay', authorize(PERMISSIONS.GUARD_PAYROLL_PAY), GuardPayrollController.pay);
router.post('/:id/return', authorize(PERMISSIONS.GUARD_PAYROLL_RETURN), GuardPayrollController.returnForCorrection);

export default router;
