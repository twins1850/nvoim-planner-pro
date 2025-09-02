import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorType, asyncHandler } from '../middleware/errorHandler';
import { AzureSpeechService } from '../services/azureSpeechService';
import { FileService } from '../services/fileService';
import { validateAzureConfig } from '../config/azure';

/**
 * 음성 텍스트 변환 컨트롤러
 */
export const speechToText = asyncHandler(async (req: Request, res: Response) => {
  const { fileId } = req.params;
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
  
  // 파일 소유권 확인
  const fileInfo = await FileService.getFileById(fileId);
  if (fileInfo.uploadedBy.toString() !== userId) {
    throw new AppError(
      '파일에 접근할 권한이 없습니다.',
      ErrorType.AUTHORIZATION_ERROR,
      403
    );
  }
  
  // 음성 텍스트 변환 실행
  const result = await AzureSpeechService.speechToText(fileId);
  
  res.status(200).json({
    success: true,
    data: result,
    message: '음성 텍스트 변환이 완료되었습니다.'
  });
});

/**
 * 화자 분리 컨트롤러
 */
export const separateSpeakers = asyncHandler(async (req: Request, res: Response) => {
  const { fileId } = req.params;
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
  
  // 파일 소유권 확인
  const fileInfo = await FileService.getFileById(fileId);
  if (fileInfo.uploadedBy.toString() !== userId) {
    throw new AppError(
      '파일에 접근할 권한이 없습니다.',
      ErrorType.AUTHORIZATION_ERROR,
      403
    );
  }
  
  // 화자 분리 실행
  const segments = await AzureSpeechService.separateSpeakers(fileId);
  
  res.status(200).json({
    success: true,
    data: {
      segments,
      count: segments.length
    },
    message: '화자 분리가 완료되었습니다.'
  });
});

/**
 * 발음 평가 컨트롤러
 */
export const evaluatePronunciation = asyncHandler(async (req: Request, res: Response) => {
  const { fileId } = req.params;
  const { referenceText } = req.body;
  const userId = req.user?.id;
  
  if (!userId) {
    throw new AppError(
      '인증되지 않은 사용자입니다.',
      ErrorType.AUTHENTICATION_ERROR,
      401
    );
  }
  
  if (!referenceText) {
    throw new AppError(
      '참조 텍스트가 필요합니다.',
      ErrorType.VALIDATION_ERROR,
      400
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
  
  // 파일 소유권 확인
  const fileInfo = await FileService.getFileById(fileId);
  if (fileInfo.uploadedBy.toString() !== userId) {
    throw new AppError(
      '파일에 접근할 권한이 없습니다.',
      ErrorType.AUTHORIZATION_ERROR,
      403
    );
  }
  
  // 발음 평가 실행
  const result = await AzureSpeechService.evaluatePronunciation(fileId, referenceText);
  
  res.status(200).json({
    success: true,
    data: result,
    message: '발음 평가가 완료되었습니다.'
  });
});

/**
 * 화자 인식 컨트롤러
 */
export const identifySpeaker = asyncHandler(async (req: Request, res: Response) => {
  const { fileId } = req.params;
  const { speakerIds } = req.body;
  const userId = req.user?.id;
  
  if (!userId) {
    throw new AppError(
      '인증되지 않은 사용자입니다.',
      ErrorType.AUTHENTICATION_ERROR,
      401
    );
  }
  
  if (!speakerIds || !Array.isArray(speakerIds) || speakerIds.length === 0) {
    throw new AppError(
      '화자 ID 목록이 필요합니다.',
      ErrorType.VALIDATION_ERROR,
      400
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
  
  // 파일 소유권 확인
  const fileInfo = await FileService.getFileById(fileId);
  if (fileInfo.uploadedBy.toString() !== userId) {
    throw new AppError(
      '파일에 접근할 권한이 없습니다.',
      ErrorType.AUTHORIZATION_ERROR,
      403
    );
  }
  
  // 화자 인식 실행
  const result = await AzureSpeechService.identifySpeaker(fileId, speakerIds);
  
  res.status(200).json({
    success: true,
    data: result,
    message: '화자 인식이 완료되었습니다.'
  });
});

/**
 * 종합 오디오 분석 컨트롤러
 */
export const analyzeAudio = asyncHandler(async (req: Request, res: Response) => {
  const { fileId } = req.params;
  const {
    separateSpeakers = false,
    evaluatePronunciation = false,
    referenceText,
    identifySpeaker = false,
    speakerIds
  } = req.body;
  
  const userId = req.user?.id;
  
  if (!userId) {
    throw new AppError(
      '인증되지 않은 사용자입니다.',
      ErrorType.AUTHENTICATION_ERROR,
      401
    );
  }
  
  // 필수 파라미터 검증
  if (evaluatePronunciation && !referenceText) {
    throw new AppError(
      '발음 평가를 위한 참조 텍스트가 필요합니다.',
      ErrorType.VALIDATION_ERROR,
      400
    );
  }
  
  if (identifySpeaker && (!speakerIds || !Array.isArray(speakerIds) || speakerIds.length === 0)) {
    throw new AppError(
      '화자 인식을 위한 화자 ID 목록이 필요합니다.',
      ErrorType.VALIDATION_ERROR,
      400
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
  
  // 파일 소유권 확인
  const fileInfo = await FileService.getFileById(fileId);
  if (fileInfo.uploadedBy.toString() !== userId) {
    throw new AppError(
      '파일에 접근할 권한이 없습니다.',
      ErrorType.AUTHORIZATION_ERROR,
      403
    );
  }
  
  // 종합 오디오 분석 실행
  const result = await AzureSpeechService.analyzeAudio(fileId, {
    separateSpeakers,
    evaluatePronunciation,
    referenceText,
    identifySpeaker,
    speakerIds
  });
  
  res.status(200).json({
    success: true,
    data: result,
    message: '오디오 분석이 완료되었습니다.'
  });
});