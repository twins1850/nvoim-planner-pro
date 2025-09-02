import { Request, Response, NextFunction } from 'express';
import { homeworkSubmissionService } from '../services/homeworkSubmissionService';
import { homeworkEvaluationService } from '../services/homeworkEvaluationService';
import { fileService } from '../services/fileService';
import { validateObjectId } from '../middleware/validation';
import { BadRequestError, NotFoundError } from '../utils/errors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const mkdirAsync = promisify(fs.mkdir);

// 임시 파일 저장 디렉토리 설정
const TEMP_DIR = path.join(process.cwd(), 'temp', 'uploads');

// 디렉토리가 없으면 생성
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Multer 설정
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await mkdirAsync(TEMP_DIR, { recursive: true });
      cb(null, TEMP_DIR);
    } catch (error) {
      cb(error as Error, TEMP_DIR);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const fileExtension = path.extname(file.originalname);
    cb(null, `${timestamp}-${randomString}${fileExtension}`);
  }
});

// 파일 필터
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 오디오 파일 허용
  if (file.fieldname === 'audio') {
    if (
      file.mimetype === 'audio/mp3' ||
      file.mimetype === 'audio/mpeg' ||
      file.mimetype === 'audio/wav' ||
      file.mimetype === 'audio/webm'
    ) {
      cb(null, true);
    } else {
      cb(new Error('지원되지 않는 오디오 파일 형식입니다.'));
    }
  }
  // 이미지 파일 허용
  else if (file.fieldname === 'image') {
    if (
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/webp'
    ) {
      cb(null, true);
    } else {
      cb(new Error('지원되지 않는 이미지 파일 형식입니다.'));
    }
  }
  // 기타 파일 타입은 거부
  else {
    cb(new Error('지원되지 않는 파일 필드입니다.'));
  }
};

// Multer 업로드 설정
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  }
});

/**
 * Homework Submission Controller
 */
export class HomeworkSubmissionController {
  /**
   * Evaluate a homework submission using AI
   * @route POST /api/homework-submissions/:id/evaluate
   */
  async evaluateSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      validateObjectId(id);
      
      const evaluation = await homeworkEvaluationService.evaluateSubmission(id);
      
      res.status(200).json({
        success: true,
        data: evaluation,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Batch evaluate multiple submissions
   * @route POST /api/homework-submissions/batch-evaluate
   */
  async batchEvaluateSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { submissionIds } = req.body;
      
      if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
        throw new BadRequestError('평가할 제출물 ID 목록이 필요합니다.');
      }
      
      // Validate all IDs
      submissionIds.forEach(id => validateObjectId(id));
      
      const result = await homeworkEvaluationService.batchEvaluateSubmissions(submissionIds);
      
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Submit homework answers
   * @route POST /api/homework-submissions
   */
  async submitHomework(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { homeworkId, answers } = req.body;
      const studentId = req.user?._id;
      
      if (!studentId) {
        throw new BadRequestError('학생 ID가 필요합니다.');
      }
      
      if (!homeworkId) {
        throw new BadRequestError('숙제 ID가 필요합니다.');
      }
      
      validateObjectId(homeworkId);
      
      if (!answers || !Array.isArray(answers) || answers.length === 0) {
        throw new BadRequestError('답변이 필요합니다.');
      }
      
      const submission = await homeworkSubmissionService.submitHomework(
        homeworkId,
        studentId,
        answers
      );
      
      res.status(201).json({
        success: true,
        data: submission,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload audio submission
   * @route POST /api/homework-submissions/audio
   */
  async uploadAudioSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Multer 미들웨어 적용
    upload.single('audio')(req, res, async (err) => {
      try {
        if (err) {
          return next(new BadRequestError(err.message));
        }
        
        const file = req.file;
        if (!file) {
          throw new BadRequestError('오디오 파일이 필요합니다.');
        }
        
        const { questionId } = req.body;
        if (!questionId) {
          throw new BadRequestError('질문 ID가 필요합니다.');
        }
        
        const recordingDuration = req.body.recordingDuration ? 
          parseFloat(req.body.recordingDuration) : undefined;
        
        const answer = await homeworkSubmissionService.processAudioSubmission(
          file,
          questionId,
          { recordingDuration }
        );
        
        res.status(201).json({
          success: true,
          data: answer,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        next(error);
      }
    });
  }

  /**
   * Submit text answer
   * @route POST /api/homework-submissions/text
   */
  async submitTextAnswer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { questionId, text } = req.body;
      
      if (!questionId) {
        throw new BadRequestError('질문 ID가 필요합니다.');
      }
      
      if (!text) {
        throw new BadRequestError('텍스트 답변이 필요합니다.');
      }
      
      const answer = await homeworkSubmissionService.processTextSubmission(
        text,
        questionId
      );
      
      res.status(201).json({
        success: true,
        data: answer,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload image submission
   * @route POST /api/homework-submissions/image
   */
  async uploadImageSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Multer 미들웨어 적용
    upload.single('image')(req, res, async (err) => {
      try {
        if (err) {
          return next(new BadRequestError(err.message));
        }
        
        const file = req.file;
        if (!file) {
          throw new BadRequestError('이미지 파일이 필요합니다.');
        }
        
        const { questionId } = req.body;
        if (!questionId) {
          throw new BadRequestError('질문 ID가 필요합니다.');
        }
        
        const answer = await homeworkSubmissionService.processImageSubmission(
          file,
          questionId
        );
        
        res.status(201).json({
          success: true,
          data: answer,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        next(error);
      }
    });
  }

  /**
   * Get submission by ID
   * @route GET /api/homework-submissions/:id
   */
  async getSubmissionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      validateObjectId(id);
      
      const submission = await homeworkSubmissionService.getSubmissionById(id);
      
      res.status(200).json({
        success: true,
        data: submission,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get submissions by homework ID
   * @route GET /api/homework-submissions/homework/:homeworkId
   */
  async getSubmissionsByHomeworkId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { homeworkId } = req.params;
      validateObjectId(homeworkId);
      
      const submissions = await homeworkSubmissionService.getSubmissionsByHomeworkId(homeworkId);
      
      res.status(200).json({
        success: true,
        data: submissions,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get submissions by student ID
   * @route GET /api/homework-submissions/student/:studentId
   */
  async getSubmissionsByStudentId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId } = req.params;
      validateObjectId(studentId);
      
      const submissions = await homeworkSubmissionService.getSubmissionsByStudentId(studentId);
      
      res.status(200).json({
        success: true,
        data: submissions,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get submission status and deadline information
   * @route GET /api/homework-submissions/status/:homeworkId
   */
  async getSubmissionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { homeworkId } = req.params;
      const studentId = req.user?._id;
      
      if (!studentId) {
        throw new BadRequestError('학생 ID가 필요합니다.');
      }
      
      validateObjectId(homeworkId);
      
      const status = await homeworkSubmissionService.getSubmissionStatus(homeworkId, studentId);
      
      res.status(200).json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync offline submissions
   * @route POST /api/homework-submissions/sync
   */
  async syncOfflineSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { submissions } = req.body;
      
      if (!submissions || !Array.isArray(submissions) || submissions.length === 0) {
        throw new BadRequestError('동기화할 제출 데이터가 필요합니다.');
      }
      
      const result = await homeworkSubmissionService.syncOfflineSubmissions(submissions);
      
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}

export const homeworkSubmissionController = new HomeworkSubmissionController();