import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';
import { ShiftTemplate } from '../../../models/ShiftTemplate';
import { ShiftAssignment } from '../../../models/ShiftAssignment';
import { ApiError } from '../../../common/ApiError';

const router = Router();
router.use(authenticate);

// ==================== Shift Templates ====================

router.get('/templates', authorize(PERMISSIONS.ATTENDANCE_READ), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter: any = { active: true };
    if (req.query.siteId) filter.siteId = req.query.siteId;
    const templates = await ShiftTemplate.find(filter).populate('siteId', 'siteName siteCode').sort({ createdAt: -1 });
    res.json({ success: true, data: templates });
  } catch (error) { next(error); }
});

router.get('/templates/:id', authorize(PERMISSIONS.ATTENDANCE_READ), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const template = await ShiftTemplate.findById(req.params.id).populate('siteId', 'siteName siteCode');
    if (!template) throw ApiError.notFound('Shift template not found');
    res.json({ success: true, data: template });
  } catch (error) { next(error); }
});

router.post('/templates', authorize(PERMISSIONS.SITE_CREATE), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { siteId, name, startTime, endTime, daysOfWeek, color } = req.body;
    if (!siteId || !name || !startTime || !endTime) {
      throw ApiError.badRequest('siteId, name, startTime, and endTime are required');
    }
    const template = await ShiftTemplate.create({
      siteId, name, startTime, endTime,
      daysOfWeek: daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
      color: color || '#3B82F6',
    });
    res.status(201).json({ success: true, data: template });
  } catch (error) { next(error); }
});

router.put('/templates/:id', authorize(PERMISSIONS.SITE_UPDATE), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const template = await ShiftTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!template) throw ApiError.notFound('Shift template not found');
    res.json({ success: true, data: template });
  } catch (error) { next(error); }
});

router.delete('/templates/:id', authorize(PERMISSIONS.SITE_UPDATE), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const template = await ShiftTemplate.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!template) throw ApiError.notFound('Shift template not found');
    res.json({ success: true, message: 'Template deactivated' });
  } catch (error) { next(error); }
});

// ==================== Shift Assignments ====================

router.get('/assignments', authorize(PERMISSIONS.ATTENDANCE_READ), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter: any = {};
    if (req.query.siteId) filter.siteId = req.query.siteId;
    if (req.query.guardId) filter.guardId = req.query.guardId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.date) {
      const d = new Date(req.query.date as string);
      filter.startDate = { $lte: d };
      filter.$or = [{ endDate: { $gte: d } }, { endDate: { $exists: false } }, { endDate: null }];
    }
    const assignments = await ShiftAssignment.find(filter)
      .populate('guardId', 'firstName lastName employeeCode')
      .populate('siteId', 'siteName siteCode')
      .populate('shiftTemplateId', 'name startTime endTime color daysOfWeek')
      .sort({ startDate: -1 });
    res.json({ success: true, data: assignments });
  } catch (error) { next(error); }
});

router.post('/assignments', authorize(PERMISSIONS.GUARD_ASSIGN_SITE), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { guardId, siteId, shiftTemplateId, startDate, endDate } = req.body;
    if (!guardId || !siteId || !shiftTemplateId || !startDate) {
      throw ApiError.badRequest('guardId, siteId, shiftTemplateId, and startDate are required');
    }
    const template = await ShiftTemplate.findById(shiftTemplateId);
    if (!template) throw ApiError.notFound('Shift template not found');
    if (template.siteId.toString() !== siteId) {
      throw ApiError.badRequest('Shift template does not belong to the specified site');
    }
    const existing = await ShiftAssignment.findOne({
      guardId, siteId, status: 'ACTIVE',
      $or: [{ endDate: { $exists: false } }, { endDate: null }],
    });
    if (existing) {
      throw ApiError.badRequest('This guard already has an active shift assignment at this site. Remove it first.');
    }
    const assignment = await ShiftAssignment.create({
      guardId, siteId, shiftTemplateId,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      assignedById: req.user?.userId,
    });
    res.status(201).json({ success: true, data: assignment });
  } catch (error) { next(error); }
});

router.put('/assignments/:id', authorize(PERMISSIONS.GUARD_ASSIGN_SITE), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assignment = await ShiftAssignment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!assignment) throw ApiError.notFound('Assignment not found');
    res.json({ success: true, data: assignment });
  } catch (error) { next(error); }
});

router.delete('/assignments/:id', authorize(PERMISSIONS.GUARD_ASSIGN_SITE), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assignment = await ShiftAssignment.findByIdAndUpdate(req.params.id, { status: 'INACTIVE' }, { new: true });
    if (!assignment) throw ApiError.notFound('Assignment not found');
    res.json({ success: true, message: 'Assignment deactivated' });
  } catch (error) { next(error); }
});

// ==================== Schedule View ====================

router.get('/schedule', authorize(PERMISSIONS.ATTENDANCE_READ), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { siteId, dateFrom, dateTo } = req.query;
    if (!siteId || !dateFrom || !dateTo) {
      throw ApiError.badRequest('siteId, dateFrom, and dateTo are required');
    }
    const from = new Date(dateFrom as string);
    const to = new Date(dateTo as string);
    const assignments = await ShiftAssignment.find({
      siteId,
      status: 'ACTIVE',
      startDate: { $lte: to },
      $or: [{ endDate: { $gte: from } }, { endDate: { $exists: false } }, { endDate: null }],
    })
      .populate('guardId', 'firstName lastName employeeCode')
      .populate('shiftTemplateId', 'name startTime endTime color daysOfWeek');
    res.json({ success: true, data: assignments });
  } catch (error) { next(error); }
});

export default router;
