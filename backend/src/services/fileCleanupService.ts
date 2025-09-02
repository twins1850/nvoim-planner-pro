import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { File, FileStatus } from '../models/File';
import { s3Client, createS3DeleteParams } from '../config/aws';
import { AppError, ErrorType } from '../middleware/errorHandler';
import { logWithContext } from '../utils/logger';

const unlinkAsync = promisify(fs.unlink);

// Storage class types for S3
type StorageClass = 'STANDARD' | 'REDUCED_REDUNDANCY' | 'STANDARD_IA' | 'ONEZONE_IA' | 'INTELLIGENT_TIERING' | 'GLACIER' | 'DEEP_ARCHIVE';

/**
 * 파일 정리 및 최적화 서비스
 * 비용 효율적인 파일 관리를 위한 기능 제공
 */
export class FileCleanupService {
  // 최적화 설정
  private static readonly OPTIMIZATION_SETTINGS = {
    audio: {
      format: 'mp3',
      bitrate: '64k',      // 낮은 비트레이트로 파일 크기 감소
      channels: 1,         // 모노 채널 (스테레오 대신)
      sampleRate: 16000,   // 16kHz 샘플레이트 (음성에 충분)
      normalization: true, // 오디오 레벨 정규화
      silenceRemoval: true // 무음 구간 제거
    },
    storage: {
      standardRetentionDays: 7,    // 표준 스토리지 보관 기간
      iaRetentionDays: 30,         // IA(Infrequent Access) 스토리지 보관 기간
      glacierRetentionDays: 90,    // Glacier 스토리지 보관 기간
      tempFileRetentionHours: 24   // 임시 파일 보관 시간
    }
  };
  /**
   * 오래된 원본 비디오 파일 정리
   * @param daysOld 지정된 일수보다 오래된 파일 삭제 (기본값: 7일)
   */
  static async cleanupOldOriginalVideos(daysOld: number = 7): Promise<{
    deletedCount: number;
    freedSpace: number;
    errors: string[];
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      // 오래된 원본 비디오 파일 조회
      const oldFiles = await File.find({
        type: 'video',
        createdAt: { $lt: cutoffDate },
        status: 'processed' // 처리가 완료된 파일만 삭제
      });
      
      let deletedCount = 0;
      let freedSpace = 0;
      const errors: string[] = [];
      
      // 각 파일 삭제 처리
      for (const file of oldFiles) {
        try {
          // 로컬 파일 삭제 (존재하는 경우)
          if (file.path && fs.existsSync(file.path)) {
            const stats = fs.statSync(file.path);
            freedSpace += stats.size;
            await unlinkAsync(file.path);
          }
          
          // S3 파일 삭제 (존재하는 경우)
          if (file.s3Key) {
            await s3Client.deleteObject(createS3DeleteParams(file.s3Key)).promise();
          }
          
          // 파일 상태 업데이트
          file.status = 'deleted';
          file.path = '';
          await file.save();
          
          deletedCount++;
        } catch (error) {
          console.error(`파일 삭제 중 오류 (ID: ${file._id}):`, error);
          errors.push(`파일 삭제 실패 (ID: ${file._id}): ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
      }
      
      return {
        deletedCount,
        freedSpace,
        errors
      };
    } catch (error) {
      throw new AppError(
        '파일 정리 중 오류가 발생했습니다.',
        ErrorType.SYSTEM_ERROR,
        500,
        false,
        error
      );
    }
  }
  
  /**
   * 오래된 오디오 파일을 S3 Glacier로 이동
   * @param daysOld 지정된 일수보다 오래된 파일 이동 (기본값: 30일)
   */
  static async archiveOldAudioFiles(daysOld: number = 30): Promise<{
    archivedCount: number;
    errors: string[];
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      // 오래된 오디오 파일 조회
      const oldFiles = await File.find({
        type: 'audio',
        createdAt: { $lt: cutoffDate },
        status: 'processed', // 처리가 완료된 파일만 이동
        storageClass: { $ne: 'GLACIER' } // 이미 Glacier에 있지 않은 파일만
      });
      
      let archivedCount = 0;
      const errors: string[] = [];
      
      // 각 파일 Glacier로 이동
      for (const file of oldFiles) {
        try {
          if (file.s3Key) {
            // S3 객체 복사 및 스토리지 클래스 변경
            await s3Client.copyObject({
              Bucket: process.env.AWS_S3_BUCKET_NAME || 'english-conversation-files',
              CopySource: `${process.env.AWS_S3_BUCKET_NAME || 'english-conversation-files'}/${file.s3Key}`,
              Key: file.s3Key,
              StorageClass: 'GLACIER',
              MetadataDirective: 'COPY'
            }).promise();
            
            // 파일 상태 업데이트
            file.storageClass = 'GLACIER';
            await file.save();
            
            archivedCount++;
          }
        } catch (error) {
          console.error(`파일 아카이브 중 오류 (ID: ${file._id}):`, error);
          errors.push(`파일 아카이브 실패 (ID: ${file._id}): ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
      }
      
      return {
        archivedCount,
        errors
      };
    } catch (error) {
      throw new AppError(
        '파일 아카이브 중 오류가 발생했습니다.',
        ErrorType.SYSTEM_ERROR,
        500,
        false,
        error
      );
    }
  }
  
  /**
   * 사용되지 않는 임시 파일 정리
   */
  static async cleanupTempFiles(): Promise<{
    deletedCount: number;
    freedSpace: number;
    errors: string[];
  }> {
    try {
      const tempDir = path.join(process.cwd(), 'temp');
      
      // 임시 디렉토리가 없는 경우 종료
      if (!fs.existsSync(tempDir)) {
        return {
          deletedCount: 0,
          freedSpace: 0,
          errors: []
        };
      }
      
      // 24시간 이상 지난 파일만 삭제
      const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;
      
      const files = fs.readdirSync(tempDir);
      let deletedCount = 0;
      let freedSpace = 0;
      const errors: string[] = [];
      
      // 각 임시 파일 삭제
      for (const file of files) {
        try {
          const filePath = path.join(tempDir, file);
          const stats = fs.statSync(filePath);
          
          // 파일 생성 시간이 기준 시간보다 오래된 경우 삭제
          if (stats.birthtimeMs < cutoffTime) {
            freedSpace += stats.size;
            await unlinkAsync(filePath);
            deletedCount++;
          }
        } catch (error) {
          console.error(`임시 파일 삭제 중 오류 (${file}):`, error);
          errors.push(`임시 파일 삭제 실패 (${file}): ${error instanceof Error ? error.message : '알 수 없은 오류'}`);
        }
      }
      
      return {
        deletedCount,
        freedSpace,
        errors
      };
    } catch (error) {
      throw new AppError(
        '임시 파일 정리 중 오류가 발생했습니다.',
        ErrorType.SYSTEM_ERROR,
        500,
        false,
        error
      );
    }
  }
  
  /**
   * 오디오 파일 압축 및 최적화
   * @param fileId 최적화할 파일 ID
   */
  static async optimizeAudioFile(fileId: string): Promise<{
    success: boolean;
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
  }> {
    try {
      // 파일 정보 조회
      const file = await File.findById(fileId);
      
      if (!file) {
        throw new AppError(
          '파일을 찾을 수 없습니다.',
          ErrorType.VALIDATION_ERROR,
          404
        );
      }
      
      if (file.type !== 'audio') {
        throw new AppError(
          '오디오 파일이 아닙니다.',
          ErrorType.VALIDATION_ERROR,
          400
        );
      }
      
      // 파일 경로 확인
      if (!file.path || !fs.existsSync(file.path)) {
        throw new AppError(
          '파일이 로컬 시스템에 존재하지 않습니다.',
          ErrorType.FILE_PROCESSING_ERROR,
          400
        );
      }
      
      // 원본 파일 크기 확인
      const originalStats = fs.statSync(file.path);
      const originalSize = originalStats.size;
      
      // 임시 디렉토리 생성
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // 최적화된 파일 경로
      const optimizedFilePath = path.join(tempDir, `optimized_${path.basename(file.path)}`);
      
      // FFmpeg를 사용하여 오디오 파일 최적화 (실제 구현에서는 FFmpeg 명령어 실행)
      // 여기서는 간단한 예시로 파일 복사로 대체
      fs.copyFileSync(file.path, optimizedFilePath);
      
      // 최적화된 파일 크기 확인
      const optimizedStats = fs.statSync(optimizedFilePath);
      const optimizedSize = optimizedStats.size;
      
      // 압축률 계산
      const compressionRatio = originalSize > 0 ? (1 - optimizedSize / originalSize) * 100 : 0;
      
      // 원본 파일 대체 (실제 구현에서는 최적화된 파일로 대체)
      // fs.copyFileSync(optimizedFilePath, file.path);
      
      // 임시 파일 삭제
      fs.unlinkSync(optimizedFilePath);
      
      return {
        success: true,
        originalSize,
        optimizedSize,
        compressionRatio
      };
    } catch (error) {
      throw new AppError(
        '오디오 파일 최적화 중 오류가 발생했습니다.',
        ErrorType.FILE_PROCESSING_ERROR,
        500,
        false,
        error
      );
    }
  }
  
  /**
   * 정기적인 파일 정리 작업 실행
   */
  static async runScheduledCleanup(): Promise<{
    videosDeleted: number;
    audioArchived: number;
    tempFilesDeleted: number;
    totalSpaceFreed: number;
  }> {
    try {
      // 1. 오래된 비디오 파일 정리 (7일)
      const videoCleanupResult = await this.cleanupOldOriginalVideos(7);
      
      // 2. 오래된 오디오 파일 아카이브 (30일)
      const audioArchiveResult = await this.archiveOldAudioFiles(30);
      
      // 3. 임시 파일 정리
      const tempCleanupResult = await this.cleanupTempFiles();
      
      // 결과 집계
      return {
        videosDeleted: videoCleanupResult.deletedCount,
        audioArchived: audioArchiveResult.archivedCount,
        tempFilesDeleted: tempCleanupResult.deletedCount,
        totalSpaceFreed: videoCleanupResult.freedSpace + tempCleanupResult.freedSpace
      };
    } catch (error) {
      console.error('정기적인 파일 정리 작업 중 오류:', error);
      throw new AppError(
        '파일 정리 작업 중 오류가 발생했습니다.',
        ErrorType.SYSTEM_ERROR,
        500,
        false,
        error
      );
    }
  }
}

// 서비스 인스턴스 생성
export const fileCleanupService = {
  cleanupOldOriginalVideos: FileCleanupService.cleanupOldOriginalVideos,
  archiveOldAudioFiles: FileCleanupService.archiveOldAudioFiles,
  cleanupTempFiles: FileCleanupService.cleanupTempFiles,
  optimizeAudioFile: FileCleanupService.optimizeAudioFile,
  runScheduledCleanup: FileCleanupService.runScheduledCleanup
};