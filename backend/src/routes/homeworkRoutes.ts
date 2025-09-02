import { Router } from 'express';
import { homeworkController } from '../controllers/homeworkController';
import { authMiddleware } from '../middleware/auth';
import { validate, validationRules } from '../middleware/validation';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Planner routes
router.post('/', validate(validationRules.homework.create), homeworkController.createHomework.bind(homeworkController));
router.get('/planner', homeworkController.getHomeworkByPlanner.bind(homeworkController));
router.post('/personalized', homeworkController.generatePersonalizedHomework.bind(homeworkController));
router.post('/from-template', homeworkController.createHomeworkFromTemplate.bind(homeworkController));
router.post('/bulk-assign', homeworkController.assignHomeworkToMultipleStudents.bind(homeworkController));
router.get('/templates', homeworkController.getHomeworkTemplates.bind(homeworkController));
router.post('/:id/save-as-template', homeworkController.saveAsTemplate.bind(homeworkController));

// Student routes
router.get('/student', homeworkController.getHomeworkByStudent.bind(homeworkController));

// Common routes
router.get('/:id', homeworkController.getHomeworkById.bind(homeworkController));
router.put('/:id', homeworkController.updateHomework.bind(homeworkController));
router.delete('/:id', homeworkController.deleteHomework.bind(homeworkController));

export default router;