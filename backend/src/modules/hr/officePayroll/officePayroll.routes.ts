import { Router } from 'express';
import { OfficePayrollController } from './officePayroll.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();
router.use(authenticate);

router.get('/', authorize(PERMISSIONS.GUARD_PAYROLL_READ), OfficePayrollController.getAll);
router.get('/:id', authorize(PERMISSIONS.GUARD_PAYROLL_READ), OfficePayrollController.getById);
router.post('/generate/:periodId', authorize(PERMISSIONS.OFFICE_PAYROLL_CREATE), OfficePayrollController.generate);
router.put('/:id/salary', authorize(PERMISSIONS.OFFICE_PAYROLL_CREATE), OfficePayrollController.updateSalaryInputs);
router.post('/:id/calculate', authorize(PERMISSIONS.GUARD_PAYROLL_CALCULATE), OfficePayrollController.calculate);
router.post('/:id/submit', authorize(PERMISSIONS.OFFICE_PAYROLL_CREATE), OfficePayrollController.submit);
router.post('/:id/check', authorize(PERMISSIONS.GUARD_PAYROLL_CHECK), OfficePayrollController.check);
router.post('/:id/approve', authorize(PERMISSIONS.OFFICE_PAYROLL_APPROVE), OfficePayrollController.approve);
router.post('/:id/pay', authorize(PERMISSIONS.OFFICE_PAYROLL_PAY), OfficePayrollController.pay);
router.post('/:id/return', authorize(PERMISSIONS.GUARD_PAYROLL_RETURN), OfficePayrollController.returnForCorrection);

export default router;
