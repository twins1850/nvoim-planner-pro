import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { File, IFile, FileType } from '../models/File';
import { AppError, ErrorType } from '../middleware/errorHandler';
import { s3ClientV3, S3_CONFIG, getS3FileUrl } from '../config/aws-v3';
import { extractMetadataFromFilename } from '../utils/fileUtils';
import { FileReference } from '../../../shared/types';

const unlinkAsync = promisify(fs.unlink);
const writeFileAsync = promisify(fs.writeFile);

/**
 * 파일 업로드 서비스 (AWS SDK v3)
 */
export class FileServiceV3 {
  /**
   * 파일 정보를 데이터베이스에 저장
   */
  static async saveFileInfo(
    file: Express.Multer.File,
    userId: string,
    fileType: FileType
  ): Promise<IFile> {
    try {
      // 파일명에서 학생 이름과 수업 날짜 추출 시도
      const { studentName, lessonDate, extractedFromFilename } = extractMetadataFromFilename(file.originalname);

      // 파일 정보 생성
      const fileInfo = new File({
        originalName: file.originalname,
        filename: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        type: fileType,
        status: 'uploaded',
        metadata: {
          studentName,
          lessonDate,
          extractedFromFilename,
          format: path.extname(file.originalname).substring(1),
        },
        uploadedBy: userId,
      });

      // 데이터베이스에 저장
      await fileInfo.save();
      return fileInfo;
    } catch (error) {
      throw new AppError(
        '파일 정보 저장 중 오류가 발생했습니다.',
        ErrorType.DATABASE_ERROR,
        500,
        false,
        error
      );
    }
  }

  /**
   * 파일을 S3에 업로드 (AWS SDK v3)
   */
  static async uploadFileToS3(fileId: string): Promise<IFile> {
    try {
      // 파일 정보 조회
      const fileInfo = await File.findById(fileId);
      if (!fileInfo) {
        throw new AppError(
          '파일을 찾을 수 없습니다.',
          ErrorType.VALIDATION_ERROR,
          404
        );
      }

      // 파일 타입에 따른 S3 폴더 결정
      let folder = '';
      switch (fileInfo.type) {
        case 'video':
          folder = S3_CONFIG.FOLDERS.ORIGINAL_VIDEOS;
          break;
        case 'audio':
          folder = S3_CONFIG.FOLDERS.EXTRACTED_AUDIO;
          break;
        case 'image':
          folder = S3_CONFIG.FOLDERS.PROFILE_IMAGES;
          break;
      }

      // S3 키 생성 (폴더/사용자ID/파일명)
      const s3Key = `${folder}${fileInfo.uploadedBy}/${fileInfo.filename}`;

      // 파일 읽기
      const fileContent = fs.readFileSync(fileInfo.path);

      // S3 업로드 명령 생성
      const uploadCommand = new PutObjectCommand({
        Bucket: S3_CONFIG.BUCKET_NAME,
        Key: s3Key,
        Body: fileContent,
        ContentType: fileInfo.mimeType,
        ServerSideEncryption: 'AES256',
        Metadata: {
          'uploaded-at': new Date().toISOString(),
          'service': 'english-conversation-management',
          'file-type': fileInfo.type,
          'original-name': fileInfo.originalName
        }
      });

      // S3에 업로드
      await s3ClientV3.send(uploadCommand);

      // S3 URL 생성
      const s3Url = getS3FileUrl(s3Key);

      // 파일 정보 업데이트
      fileInfo.s3Key = s3Key;
      fileInfo.s3Url = s3Url;
      await fileInfo.save();

      // 로컬 파일 삭제
      await unlinkAsync(fileInfo.path);

      return fileInfo;
    } catch (error) {
      throw new AppError(
        'S3 업로드 중 오류가 발생했습니다.',
        ErrorType.FILE_PROCESSING_ERROR,
        500,
        false,
        error
      );
    }
  }

  /**
   * 파일 상태 업데이트
   */
  static async updateFileStatus(
    fileId: string,
    status: 'processing' | 'processed' | 'failed',
    error?: string
  ): Promise<IFile> {
    try {
      const updateData: any = { status };
      if (error) {
        updateData.processingError = error;
      }

      const fileInfo = await File.findByIdAndUpdate(
        fileId,
        { $set: updateData },
        { new: true }
      );

      if (!fileInfo) {
        throw new AppError(
          '파일을 찾을 수 없습니다.',
          ErrorType.VALIDATION_ERROR,
          404
        );
      }

      return fileInfo;
    } catch (error) {
      throw new AppError(
        '파일 상태 업데이트 중 오류가 발생했습니다.',
        ErrorType.DATABASE_ERROR,
        500,
        false,
        error
      );
    }
  }

  /**
   * 파일 메타데이터 업데이트
   */
  static async updateFileMetadata(
    fileId: string,
    metadata: Partial<IFile['metadata']>
  ): Promise<IFile> {
    try {
      const fileInfo = await File.findById(fileId);
      if (!fileInfo) {
        throw new AppError(
          '파일을 찾을 수 없습니다.',
          ErrorType.VALIDATION_ERROR,
          404
        );
      }

      // 메타데이터 업데이트
      Object.assign(fileInfo.metadata, metadata);
      await fileInfo.save();

      return fileInfo;
    } catch (error) {
      throw new AppError(
        '파일 메타데이터 업데이트 중 오류가 발생했습니다.',
        ErrorType.DATABASE_ERROR,
        500,
        false,
        error
      );
    }
  }

  /**
   * 파일 삭제 (S3 및 데이터베이스) - AWS SDK v3
   */
  static async deleteFile(fileId: string): Promise<void> {
    try {
      const fileInfo = await File.findById(fileId);
      if (!fileInfo) {
        throw new AppError(
          '파일을 찾을 수 없습니다.',
          ErrorType.VALIDATION_ERROR,
          404
        );
      }

      // S3에서 파일 삭제
      if (fileInfo.s3Key) {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: S3_CONFIG.BUCKET_NAME,
          Key: fileInfo.s3Key,
        });

        await s3ClientV3.send(deleteCommand);
      }

      // 로컬 파일이 있으면 삭제
      if (fs.existsSync(fileInfo.path)) {
        await unlinkAsync(fileInfo.path);
      }

      // 데이터베이스에서 파일 정보 삭제
      await File.findByIdAndDelete(fileId);
    } catch (error) {
      throw new AppError(
        '파일 삭제 중 오류가 발생했습니다.',
        ErrorType.FILE_PROCESSING_ERROR,
        500,
        false,
        error
      );
    }
  }

  /**
   * 사용자의 파일 목록 조회
   */
  static async getUserFiles(
    userId: string,
    options: {
      type?: FileType;
      status?: string;
      page?: number;
      limit?: number;
      sort?: string;
    } = {}
  ): Promise<{ files: IFile[]; total: number; pages: number }> {
    try {
      const { type, status, page = 1, limit = 10, sort = '-createdAt' } = options;

      // 검색 조건 구성
      const query: any = { uploadedBy: userId };
      if (type) query.type = type;
      if (status) query.status = status;

      // 페이지네이션
      const skip = (page - 1) * limit;

      // 파일 목록 조회
      const [files, total] = await Promise.all([
        File.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit),
        File.countDocuments(query),
      ]);

      return {
        files,
        total,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new AppError(
        '파일 목록 조회 중 오류가 발생했습니다.',
        ErrorType.DATABASE_ERROR,
        500,
        false,
        error
      );
    }
  }

  /**
   * 파일 상세 정보 조회
   */
  static async getFileById(fileId: string): Promise<IFile> {
    try {
      const fileInfo = await File.findById(fileId);
      if (!fileInfo) {
        throw new AppError(
          '파일을 찾을 수 없습니다.',
          ErrorType.VALIDATION_ERROR,
          404
        );
      }

      return fileInfo;
    } catch (error) {
      throw new AppError(
        '파일 정보 조회 중 오류가 발생했습니다.',
        ErrorType.DATABASE_ERROR,
        500,
        false,
        error
      );
    }
  }

  /**
   * S3에서 파일 다운로드 (AWS SDK v3)
   */
  static async downloadFileFromS3(s3Key: string, outputPath: string): Promise<void> {
    try {
      const downloadCommand = new GetObjectCommand({
        Bucket: S3_CONFIG.BUCKET_NAME,
        Key: s3Key
      });

      const response = await s3ClientV3.send(downloadCommand);
      
      if (!response.Body) {
        throw new Error('S3 응답이 비어있습니다.');
      }

      // 스트림을 버퍼로 변환
      const chunks: Buffer[] = [];
      const stream = response.Body as any;
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      const fileBuffer = Buffer.concat(chunks);
      await writeFileAsync(outputPath, fileBuffer);
    } catch (error) {
      throw new AppError(
        'S3에서 파일 다운로드 중 오류가 발생했습니다.',
        ErrorType.FILE_PROCESSING_ERROR,
        500,
        false,
        error
      );
    }
  }

  /**
   * 파일 업로드 (숙제 제출용) - AWS SDK v3
   */
  static async uploadFile(
    file: Express.Multer.File,
    options: {
      folder?: string;
      allowedTypes?: string[];
      maxSize?: number;
    } = {}
  ): Promise<FileReference> {
    try {
      const { folder = 'uploads', allowedTypes, maxSize } = options;
      
      // 파일 타입 검증
      if (allowedTypes && !allowedTypes.includes(file.mimetype)) {
        throw new AppError(
          `지원되지 않는 파일 형식입니다. 지원되는 형식: ${allowedTypes.join(', ')}`,
          ErrorType.VALIDATION_ERROR,
          400
        );
      }
      
      // 파일 크기 검증
      if (maxSize && file.size > maxSize) {
        throw new AppError(
          `파일 크기가 너무 큽니다. 최대 허용 크기: ${Math.round(maxSize / (1024 * 1024))}MB`,
          ErrorType.VALIDATION_ERROR,
          400
        );
      }
      
      // 파일명 생성 (중복 방지)
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 10);
      const fileExtension = path.extname(file.originalname);
      const filename = `${timestamp}-${randomString}${fileExtension}`;
      
      // S3 키 생성
      const s3Key = `${folder}/${filename}`;
      
      // 파일 읽기
      const fileBuffer = fs.readFileSync(file.path);
      
      // S3 업로드 명령 생성
      const uploadCommand = new PutObjectCommand({
        Bucket: S3_CONFIG.BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: file.mimetype,
        ServerSideEncryption: 'AES256',
        Metadata: {
          'uploaded-at': new Date().toISOString(),
          'service': 'english-conversation-management',
          'original-name': file.originalname
        }
      });
      
      await s3ClientV3.send(uploadCommand);
      
      // S3 URL 생성
      const s3Url = getS3FileUrl(s3Key);
      
      // 로컬 파일 삭제
      await unlinkAsync(file.path);
      
      // FileReference 객체 반환
      return {
        filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        s3Key,
        s3Url,
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      // 로컬 파일 삭제 시도
      try {
        if (file.path && fs.existsSync(file.path)) {
          await unlinkAsync(file.path);
        }
      } catch (unlinkError) {
        console.error('로컬 파일 삭제 중 오류:', unlinkError);
      }
      
      throw new AppError(
        '파일 업로드 중 오류가 발생했습니다.',
        ErrorType.FILE_PROCESSING_ERROR,
        500,
        false,
        error
      );
    }
  }

  /**
   * Presigned URL 생성 (다운로드용)
   */
  static async generatePresignedDownloadUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { generatePresignedUrlV3 } = await import('../config/aws-v3');
      return await generatePresignedUrlV3(s3Key, expiresIn);
    } catch (error) {
      throw new AppError(
        'Presigned URL 생성 중 오류가 발생했습니다.',
        ErrorType.FILE_PROCESSING_ERROR,
        500,
        false,
        error
      );
    }
  }

  /**
   * 여러 파일 일괄 삭제
   */
  static async deleteMultipleFiles(fileIds: string[]): Promise<{ deleted: number; failed: number }> {
    let deleted = 0;
    let failed = 0;

    for (const fileId of fileIds) {
      try {
        await this.deleteFile(fileId);
        deleted++;
      } catch (error) {
        console.error(`파일 삭제 실패 (ID: ${fileId}):`, error);
        failed++;
      }
    }

    return { deleted, failed };
  }
}

// 서비스 인스턴스 생성 (v3)
export const fileServiceV3 = {
  saveFileInfo: FileServiceV3.saveFileInfo,
  uploadFileToS3: FileServiceV3.uploadFileToS3,
  updateFileStatus: FileServiceV3.updateFileStatus,
  updateFileMetadata: FileServiceV3.updateFileMetadata,
  deleteFile: FileServiceV3.deleteFile,
  getUserFiles: FileServiceV3.getUserFiles,
  getFileById: FileServiceV3.getFileById,
  downloadFileFromS3: FileServiceV3.downloadFileFromS3,
  uploadFile: FileServiceV3.uploadFile,
  generatePresignedDownloadUrl: FileServiceV3.generatePresignedDownloadUrl,
  deleteMultipleFiles: FileServiceV3.deleteMultipleFiles
};

// 호환성을 위한 기본 내보내기
export { FileServiceV3 as FileService };