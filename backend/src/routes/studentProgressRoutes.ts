import express from 'express';
import studentProgressController from '../controllers/studentProgressController';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = express.Router();

// Get my progress (for students)
router.get(
  '/my-progress',
  authenticate,
  studentProgressController.getMyProgress
);

// Get progress for a specific student (for planners)
router.get(
  '/student/:studentId',
  authenticate,
  studentProgressController.getStudentProgress
);

// Get progress for all students (for planners)
router.get(
  '/all-students',
  authenticate,
  studentProgressController.getAllStudentsProgress
);

// Add or update a goal
router.post(
  '/goals',
  authenticate,
  validateRequest({
    body: {
      goal: {
        id: { type: 'string', required: true },
        title: { type: 'string', required: true },
        description: { type: 'string', required: true },
        targetValue: { type: 'number', required: true },
        currentValue: { type: 'number', required: false },
        deadline: { type: 'string', required: false },
        isCompleted: { type: 'boolean', required: false }
      }
    }
  }),
  studentProgressController.addOrUpdateGoal
);

// Share progress with another user
router.post(
  '/share',
  authenticate,
  validateRequest({
    body: {
      shareWithEmail: { type: 'string', required: true }
    }
  }),
  studentProgressController.shareProgress
);

// Get shared progress (for parents or planners)
router.get(
  '/shared',
  authenticate,
  studentProgressController.getSharedProgress
);

export default router;