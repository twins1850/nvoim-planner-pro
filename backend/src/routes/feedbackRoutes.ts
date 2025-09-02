import express from 'express';
import { feedbackController } from '../controllers/feedbackController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { validationRules } from '../middleware/validation';
import multer from 'multer';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Routes that require authentication
router.use(authenticate);

// Generate AI evaluation for a homework submission
router.post(
  '/submissions/:submissionId/evaluate',
  feedbackController.generateAIEvaluation
);

// Add planner feedback to an existing AI evaluation
router.post(
  '/:feedbackId/planner-review',
  upload.array('attachments', 5), // Allow up to 5 file attachments
  validate(validationRules.feedback.addPlannerFeedback),
  feedbackController.addPlannerFeedback
);

// Send feedback to student
router.post(
  '/:feedbackId/send',
  feedbackController.sendFeedbackToStudent
);

// Mark feedback as viewed by student
router.post(
  '/:feedbackId/mark-viewed',
  feedbackController.markFeedbackAsViewed
);

// Get feedback by ID
router.get(
  '/:feedbackId',
  feedbackController.getFeedbackById
);

// Get all feedback for a student
router.get(
  '/student/:studentId?',
  feedbackController.getStudentFeedback
);

// Get all feedback created by a planner
router.get(
  '/planner/:plannerId?',
  feedbackController.getPlannerFeedback
);

// Get feedback pending planner review
router.get(
  '/pending',
  feedbackController.getPendingFeedback
);

// Get feedback analytics for a student
router.get(
  '/analytics/student/:studentId?',
  feedbackController.getStudentFeedbackAnalytics
);

export default router;