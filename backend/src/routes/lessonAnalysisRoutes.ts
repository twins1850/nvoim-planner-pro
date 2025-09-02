import express from 'express';
import { authenticate } from '../middleware/auth';
import { 
  startLessonAnalysis, 
  getLessonAnalysis, 
  getLessonSummary, 
  retryLessonAnalysis 
} from '../controllers/lessonAnalysisController';

const router = express.Router();

// 수업 분석 시작
router.post('/lessons/:lessonId/analyze', authenticate, startLessonAnalysis);

// 수업 분석 결과 조회
router.get('/lessons/:lessonId/analysis', authenticate, getLessonAnalysis);

// 구조화된 수업 요약 조회
router.get('/lessons/:lessonId/summary', authenticate, getLessonSummary);

// 수업 분석 재시도
router.post('/lessons/:lessonId/analyze/retry', authenticate, retryLessonAnalysis);

export default router;