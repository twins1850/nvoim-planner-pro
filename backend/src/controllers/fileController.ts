import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { FileService } from '../services/fileService';
import { AudioService } from '../services/audioService';
import { AppError, ErrorType, asyncHandler } from '../middleware/errorHandler';
import { getQueue } from '../config/queue';
import { getFileTypeFromMimeType, generateUniqueFilename } from '../utils/fileUtils';
import { S3_CONFIG } from '../config/aws';

const mkdirAsync = promisify(fs.mkdir);

// 업로드 디렉토리 설정
const uploadDir = path.join(process.cwd(), 'uploads');

// 디렉토리 생성 (없는 경우)
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 스토리지 설정
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // 파일 타입에 따른 디렉토리 설정
      const fileType = getFileTypeFromMimeType(file.mimetype);
      const typeDir = path.join(uploadDir, fileType || 'other');
      
      // 디렉토리 생성 (없는 경우)
      if (!fs.existsSync(typeDir)) {
        await mkdirAsync(typeDir, { recursive: true });
      }
      
      cb(null, typeDir);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    // 고유한 파일명 생성
    const uniqueFilename = generateUniqueFilename(file.originalname);
    cb(null, uniqueFilename);
  }
});

// 파일 필터 설정
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 파일 타입 확인
  const fileType = getFileTypeFromMimeType(file.mimetype);
  
  if (!fileType) {
    return cb(new AppError(
      '지원하지 않는 파일 형식입니다.',
      ErrorType.VALIDATION_ERROR,
      400
    ));
  }
  
  // 파일 타입별 허용된 MIME 타입 확인
  const allowedMimeTypes = S3_CONFIG.ALLOWED_MIME_TYPES[fileType.toUpperCase() as keyof typeof S3_CONFIG.ALLOWED_MIME_TYPES];
  
  if (!allowedMimeTypes || !allowedMimeTypes.includes(file.mimetype)) {
    return cb(new AppError(
      `지원하지 않는 ${fileType} 파일 형식입니다.`,
      ErrorType.VALIDATION_ERROR,
      400
    ));
  }
  
  // 파일 크기 제한 확인
  const maxSize = S3_CONFIG.MAX_FILE_SIZE[fileType.toUpperCase() as keyof typeof S3_CONFIG.MAX_FILE_SIZE];
  
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
    return cb(new AppError(
      `파일 크기가 너무 큽니다. 최대 ${maxSize / (1024 * 1024)}MB까지 업로드 가능합니다.`,
      ErrorType.VALIDATION_ERROR,
      400
    ));
  }
  
  cb(null, true);
};

// Multer 업로드 설정
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Math.max(
      S3_CONFIG.MAX_FILE_SIZE.VIDEO,
      S3_CONFIG.MAX_FILE_SIZE.AUDIO,
      S3_CONFIG.MAX_FILE_SIZE.IMAGE
    )
  }
});

/**
 * 파일 업로드 컨트롤러
 */
export const uploadFile = [
  // 파일 업로드 미들웨어
  upload.single('file'),
  
  // 업로드 처리 핸들러
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError(
          '업로드할 파일이 없습니다.',
          ErrorType.VALIDATION_ERROR,
          400
        );
      }
      
      // 사용자 ID 확인
      const userId = req.user?.id;
      
      if (!userId) {
        throw new AppError(
          '인증되지 않은 사용자입니다.',
          ErrorType.AUTHENTICATION_ERROR,
          401
        );
      }
      
      // 파일 타입 확인
      const fileType = getFileTypeFromMimeType(req.file.mimetype);
      
      if (!fileType) {
        throw new AppError(
          '지원하지 않는 파일 형식입니다.',
          ErrorType.VALIDATION_ERROR,
          400
        );
      }
      
      // 파일 정보 저장
      const fileInfo = await FileService.saveFileInfo(req.file, userId, fileType);
      
      // 비디오 파일인 경우 오디오 추출 큐에 작업 추가
      if (fileType === 'video') {
        const audioExtractionQueue = getQueue('audio-extraction');
        
        await audioExtractionQueue.add(
          {
            fileId: fileInfo._id.toString(),
            userId
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000
            },
            removeOnComplete: true,
            removeOnFail: false
          }
        );
      } else {
        // 비디오가 아닌 경우 S3 업로드 큐에 작업 추가
        const fileUploadQueue = getQueue('file-upload');
        
        await fileUploadQueue.add(
          {
            fileId: fileInfo._id.toString(),
            userId
          },
          {
            attempts: 2,
            backoff: {
              type: 'fixed',
              delay: 3000
            },
            removeOnComplete: true,
            removeOnFail: false
          }
        );
      }
      
      // 응답 반환
      res.status(201).json({
        success: true,
        data: {
          fileId: fileInfo._id,
          originalName: fileInfo.originalName,
          type: fileInfo.type,
          size: fileInfo.size,
          status: fileInfo.status,
          metadata: fileInfo.metadata
        },
        message: '파일 업로드가 시작되었습니다.'
      });
    } catch (error) {
      // 업로드된 파일 삭제 (에러 발생 시)
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      next(error);
    }
  })
];

/**
 * 파일 상태 조회 컨트롤러
 */
export const getFileStatus = asyncHandler(async (req: Request, res: Response) => {
  const { fileId } = req.params;
  const userId = req.user?.id;
  
  if (!userId) {
    throw new AppError(
      '인증되지 않은 사용자입니다.',
      ErrorType.AUTHENTICATION_ERROR,
      401
    );
  }
  
  const fileInfo = await FileService.getFileById(fileId);
  
  // 파일 소유자 확인
  if (fileInfo.uploadedBy.toString() !== userId) {
    throw new AppError(
      '파일에 접근할 권한이 없습니다.',
      ErrorType.AUTHORIZATION_ERROR,
      403
    );
  }
  
  res.status(200).json({
    success: true,
    data: {
      fileId: fileInfo._id,
      originalName: fileInfo.originalName,
      type: fileInfo.type,
      size: fileInfo.size,
      status: fileInfo.status,
      s3Url: fileInfo.s3Url,
      metadata: fileInfo.metadata,
      createdAt: fileInfo.createdAt,
      updatedAt: fileInfo.updatedAt
    }
  });
});

/**
 * 파일 삭제 컨트롤러
 */
export const deleteFile = asyncHandler(async (req: Request, res: Response) => {
  const { fileId } = req.params;
  const userId = req.user?.id;
  
  if (!userId) {
    throw new AppError(
      '인증되지 않은 사용자입니다.',
      ErrorType.AUTHENTICATION_ERROR,
      401
    );
  }
  
  const fileInfo = await FileService.getFileById(fileId);
  
  // 파일 소유자 확인
  if (fileInfo.uploadedBy.toString() !== userId) {
    throw new AppError(
      '파일에 접근할 권한이 없습니다.',
      ErrorType.AUTHORIZATION_ERROR,
      403
    );
  }
  
  await FileService.deleteFile(fileId);
  
  res.status(200).json({
    success: true,
    message: '파일이 삭제되었습니다.'
  });
});

/**
 * 사용자 파일 목록 조회 컨트롤러
 */
export const getUserFiles = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    throw new AppError(
      '인증되지 않은 사용자입니다.',
      ErrorType.AUTHENTICATION_ERROR,
      401
    );
  }
  
  const { type, status, page = '1', limit = '10', sort = '-createdAt' } = req.query;
  
  const result = await FileService.getUserFiles(userId, {
    type: type as any,
    status: status as string,
    page: parseInt(page as string),
    limit: parseInt(limit as string),
    sort: sort as string
  });
  
  res.status(200).json({
    success: true,
    data: result.files,
    pagination: {
      total: result.total,
      pages: result.pages,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    }
  });
});