import express from 'express';
import reportingController from '../controllers/reportingController';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { body, query, param } from 'express-validator';

const router = express.Router();

// Middleware to ensure user is a planner
const ensurePlanner = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.user?.role !== 'planner') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'AUTHORIZATION_ERROR',
        message: '플래너 권한이 필요합니다.'
      }
    });
  }
  next();
};

// Get dashboard data
router.get(
  '/dashboard',
  auth,
  ensurePlanner,
  reportingController.getDashboardData
);

// Get performance trends
router.get(
  '/trends',
  auth,
  ensurePlanner,
  validate([
    query('period').optional().isIn(['weekly', 'monthly']).withMessage('기간은 weekly 또는 monthly여야 합니다.'),
    query('startDate').optional().isISO8601().withMessage('유효한 날짜 형식이 아닙니다.'),
    query('endDate').optional().isISO8601().withMessage('유효한 날짜 형식이 아닙니다.')
  ]),
  reportingController.getPerformanceTrends
);

// Get student performance detail
router.get(
  '/students/:studentId',
  auth,
  ensurePlanner,
  validate([
    param('studentId').isMongoId().withMessage('유효한 학생 ID가 아닙니다.')
  ]),
  reportingController.getStudentPerformanceDetail
);

// Generate report
router.post(
  '/generate',
  auth,
  ensurePlanner,
  validate([
    body('templateId').isString().notEmpty().withMessage('템플릿 ID가 필요합니다.'),
    body('studentIds').optional().isArray().withMessage('학생 ID는 배열이어야 합니다.'),
    body('studentIds.*').optional().isMongoId().withMessage('유효한 학생 ID가 아닙니다.'),
    body('startDate').optional().isISO8601().withMessage('유효한 날짜 형식이 아닙니다.'),
    body('endDate').optional().isISO8601().withMessage('유효한 날짜 형식이 아닙니다.'),
    body('format.format').optional().isIn(['pdf', 'excel', 'csv', 'json']).withMessage('지원되지 않는 형식입니다.')
  ]),
  reportingController.generateReport
);

// Schedule report
router.post(
  '/schedule',
  auth,
  ensurePlanner,
  validate([
    body('templateId').isString().notEmpty().withMessage('템플릿 ID가 필요합니다.'),
    body('name').isString().notEmpty().withMessage('보고서 이름이 필요합니다.'),
    body('recipients').isArray().notEmpty().withMessage('수신자 목록이 필요합니다.'),
    body('recipients.*').isEmail().withMessage('유효한 이메일 주소가 아닙니다.'),
    body('frequency').isIn(['daily', 'weekly', 'monthly']).withMessage('빈도는 daily, weekly, 또는 monthly여야 합니다.'),
    body('nextRunDate').isISO8601().withMessage('유효한 날짜 형식이 아닙니다.')
  ]),
  reportingController.scheduleReport
);

// Get students requiring attention
router.get(
  '/attention',
  auth,
  ensurePlanner,
  reportingController.getStudentsRequiringAttention
);

// Perform bulk operations
router.post(
  '/bulk',
  auth,
  ensurePlanner,
  validate([
    body('studentIds').isArray().notEmpty().withMessage('학생 ID 목록이 필요합니다.'),
    body('studentIds.*').isMongoId().withMessage('유효한 학생 ID가 아닙니다.'),
    body('operation').isIn(['send_notification', 'assign_homework', 'export_data']).withMessage('지원되지 않는 작업입니다.')
  ]),
  reportingController.performBulkOperation
);

export default router;