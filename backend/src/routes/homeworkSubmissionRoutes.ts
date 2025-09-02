import { Router } from 'express';
import { homeworkSubmissionController } from '../controllers/homeworkSubmissionController';
import { authMiddleware } from '../middleware/auth';
import { validate, validationRules } from '../middleware/validation';

const router = Router();

// 모든 라우트에 인증 미들웨어 적용
router.use(authMiddleware);

// 숙제 제출 라우트
router.post('/', validate(validationRules.homework.submit), homeworkSubmissionController.submitHomework.bind(homeworkSubmissionController));
router.post('/audio', homeworkSubmissionController.uploadAudioSubmission.bind(homeworkSubmissionController));
router.post('/text', homeworkSubmissionController.submitTextAnswer.bind(homeworkSubmissionController));
router.post('/image', homeworkSubmissionController.uploadImageSubmission.bind(homeworkSubmissionController));
router.post('/sync', homeworkSubmissionController.syncOfflineSubmissions.bind(homeworkSubmissionController));

// 숙제 제출 조회 라우트
router.get('/:id', homeworkSubmissionController.getSubmissionById.bind(homeworkSubmissionController));
router.get('/homework/:homeworkId', homeworkSubmissionController.getSubmissionsByHomeworkId.bind(homeworkSubmissionController));
router.get('/student/:studentId', homeworkSubmissionController.getSubmissionsByStudentId.bind(homeworkSubmissionController));
router.get('/status/:homeworkId', homeworkSubmissionController.getSubmissionStatus.bind(homeworkSubmissionController));

export default router;