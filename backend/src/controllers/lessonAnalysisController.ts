import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorType, asyncHandler } from '../middleware/errorHandler';
import { LessonAnalysisService } from '../services/lessonAnalysisService';
import { Lesson } from '../models/Lesson';
import { validateAzureConfig } from '../config/azure';
import { validateOpenAIConfig } from '../config/openai';

/**
 * 수업 분석 시작 컨트롤러
 */
export const startLessonAnalysis = asyncHandler(async (req: Request, res: Response) => {
  const { lessonId } = req.params;
  const userId = req.user?.id;
  
  if (!userId) {
    throw new AppError(
      '인증되지 않은 사용자입니다.',
      ErrorType.AUTHENTICATION_ERROR,
      401
    );
  }
  
  // Azure 설정 유효성 검사
  if (!validateAzureConfig()) {
    throw new AppError(
      'Azure Speech Service 설정이 올바르지 않습니다.',
      ErrorType.SYSTEM_ERROR,
      500
    );
  }
  
  // OpenAI 설정 유효성 검사
  if (!validateOpenAIConfig()) {
    throw new AppError(
      'OpenAI API 설정이 올바르지 않습니다.',
      ErrorType.SYSTEM_ERROR,
      500
    );
  }
  
  // 수업 정보 조회
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    throw new AppError(
      '수업을 찾을 수 없습니다.',
      ErrorType.VALIDATION_ERROR,
      404
    );
  }
  
  // 수업 소유권 확인
  if (lesson.plannerId.toString() !== userId) {
    throw new AppError(
      '수업에 접근할 권한이 없습니다.',
      ErrorType.AUTHORIZATION_ERROR,
      403
    );
  }
  
  // 이미 분석 중이거나 완료된 경우 에러
  if (lesson.status === 'analyzing' || lesson.status === 'analyzed') {
    throw new AppError(
      `수업이 이미 ${lesson.status === 'analyzing' ? '분석 중' : '분석 완료'}되었습니다.`,
      ErrorType.VALIDATION_ERROR,
      400
    );
  }
  
  // 오디오 파일이 없는 경우 에러
  if (!lesson.extractedAudioFile) {
    throw new AppError(
      '추출된 오디오 파일이 없습니다.',
      ErrorType.VALIDATION_ERROR,
      400
    );
  }
  
  // 수업 상태 업데이트
  lesson.status = 'analyzing';
  await lesson.save();
  
  // 비동기로 분석 시작 (응답은 즉시 반환)
  LessonAnalysisService.analyzeLessonAudio(lessonId)
    .then(() => {
      console.log(`수업 분석 완료: ${lessonId}`);
    })
    .catch(error => {
      console.error(`수업 분석 실패: ${lessonId}`, error);
    });
  
  res.status(202).json({
    success: true,
    message: '수업 분석이 시작되었습니다.',
    data: {
      lessonId,
      status: 'analyzing'
    }
  });
});

/**
 * 수업 분석 결과 조회 컨트롤러
 */
export const getLessonAnalysis = asyncHandler(async (req: Request, res: Response) => {
  const { lessonId } = req.params;
  const userId = req.user?.id;
  
  if (!userId) {
    throw new AppError(
      '인증되지 않은 사용자입니다.',
      ErrorType.AUTHENTICATION_ERROR,
      401
    );
  }
  
  // 수업 정보 조회
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    throw new AppError(
      '수업을 찾을 수 없습니다.',
      ErrorType.VALIDATION_ERROR,
      404
    );
  }
  
  // 수업 소유권 확인 (플래너 또는 해당 학생만 접근 가능)
  if (lesson.plannerId.toString() !== userId && lesson.studentId.toString() !== userId) {
    throw new AppError(
      '수업에 접근할 권한이 없습니다.',
      ErrorType.AUTHORIZATION_ERROR,
      403
    );
  }
  
  // 분석 결과가 없는 경우
  if (!lesson.analysisResult) {
    throw new AppError(
      '수업 분석 결과가 없습니다.',
      ErrorType.VALIDATION_ERROR,
      404
    );
  }
  
  res.status(200).json({
    success: true,
    data: {
      lessonId: lesson._id,
      status: lesson.status,
      analysisResult: lesson.analysisResult,
      metadata: lesson.metadata
    },
    message: '수업 분석 결과를 조회했습니다.'
  });
});

/**
 * 구조화된 수업 요약 조회 컨트롤러
 */
export const getLessonSummary = asyncHandler(async (req: Request, res: Response) => {
  const { lessonId } = req.params;
  const userId = req.user?.id;
  
  if (!userId) {
    throw new AppError(
      '인증되지 않은 사용자입니다.',
      ErrorType.AUTHENTICATION_ERROR,
      401
    );
  }
  
  // 수업 정보 조회
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    throw new AppError(
      '수업을 찾을 수 없습니다.',
      ErrorType.VALIDATION_ERROR,
      404
    );
  }
  
  // 수업 소유권 확인 (플래너 또는 해당 학생만 접근 가능)
  if (lesson.plannerId.toString() !== userId && lesson.studentId.toString() !== userId) {
    throw new AppError(
      '수업에 접근할 권한이 없습니다.',
      ErrorType.AUTHORIZATION_ERROR,
      403
    );
  }
  
  // 분석 결과가 없는 경우
  if (!lesson.analysisResult) {
    throw new AppError(
      '수업 분석 결과가 없습니다.',
      ErrorType.VALIDATION_ERROR,
      404
    );
  }
  
  // 메타데이터에서 구조화된 요약 추출
  const analysisMetadata = lesson.metadata.analysisMetadata || {};
  
  const summary = {
    keyExpressions: analysisMetadata.keyExpressions || [],
    pronunciationPoints: analysisMetadata.pronunciationPoints || [],
    homeworkSuggestions: analysisMetadata.homeworkSuggestions || [],
    teacherFeedback: {
      corrections: analysisMetadata.teacherCorrections || [],
      suggestions: analysisMetadata.teacherSuggestions || [],
      praises: analysisMetadata.teacherPraises || []
    },
    contentCategories: {
      topics: analysisMetadata.topics || [],
      vocabulary: analysisMetadata.vocabulary || [],
      grammar: analysisMetadata.grammar || [],
      culturalNotes: analysisMetadata.culturalNotes || []
    }
  };
  
  res.status(200).json({
    success: true,
    data: summary,
    message: '구조화된 수업 요약을 조회했습니다.'
  });
});

/**
 * 수업 분석 재시도 컨트롤러
 */
export const retryLessonAnalysis = asyncHandler(async (req: Request, res: Response) => {
  const { lessonId } = req.params;
  const userId = req.user?.id;
  
  if (!userId) {
    throw new AppError(
      '인증되지 않은 사용자입니다.',
      ErrorType.AUTHENTICATION_ERROR,
      401
    );
  }
  
  // Azure 설정 유효성 검사
  if (!validateAzureConfig()) {
    throw new AppError(
      'Azure Speech Service 설정이 올바르지 않습니다.',
      ErrorType.SYSTEM_ERROR,
      500
    );
  }
  
  // OpenAI 설정 유효성 검사
  if (!validateOpenAIConfig()) {
    throw new AppError(
      'OpenAI API 설정이 올바르지 않습니다.',
      ErrorType.SYSTEM_ERROR,
      500
    );
  }
  
  // 수업 정보 조회
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    throw new AppError(
      '수업을 찾을 수 없습니다.',
      ErrorType.VALIDATION_ERROR,
      404
    );
  }
  
  // 수업 소유권 확인
  if (lesson.plannerId.toString() !== userId) {
    throw new AppError(
      '수업에 접근할 권한이 없습니다.',
      ErrorType.AUTHORIZATION_ERROR,
      403
    );
  }
  
  // 분석 중인 경우 에러
  if (lesson.status === 'analyzing') {
    throw new AppError(
      '수업이 이미 분석 중입니다.',
      ErrorType.VALIDATION_ERROR,
      400
    );
  }
  
  // 오디오 파일이 없는 경우 에러
  if (!lesson.extractedAudioFile) {
    throw new AppError(
      '추출된 오디오 파일이 없습니다.',
      ErrorType.VALIDATION_ERROR,
      400
    );
  }
  
  // 수업 상태 업데이트
  lesson.status = 'analyzing';
  lesson.errorMessage = undefined;
  await lesson.save();
  
  // 비동기로 분석 시작 (응답은 즉시 반환)
  LessonAnalysisService.analyzeLessonAudio(lessonId)
    .then(() => {
      console.log(`수업 분석 재시도 완료: ${lessonId}`);
    })
    .catch(error => {
      console.error(`수업 분석 재시도 실패: ${lessonId}`, error);
    });
  
  res.status(202).json({
    success: true,
    message: '수업 분석이 다시 시작되었습니다.',
    data: {
      lessonId,
      status: 'analyzing'
    }
  });
});