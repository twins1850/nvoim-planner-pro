import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { logWithContext } from '../utils/logger';
import { createAuditLog } from '../middleware/auditLogger';

const execAsync = promisify(exec);

/**
 * 백업 및 복구 서비스 (AWS SDK v3)
 */
export class BackupServiceV3 {
  private static s3Client: S3Client;
  private static backupBucket: string;
  private static backupPrefix: string;
  private static tempDir: string;
  private static mongoUri: string;

  /**
   * 백업 서비스 초기화
   */
  static initialize(): void {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-northeast-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });
    
    this.backupBucket = process.env.AWS_BACKUP_BUCKET || process.env.AWS_S3_BUCKET || '';
    this.backupPrefix = 'backups/';
    this.tempDir = path.join(__dirname, '../../temp');
    this.mongoUri = process.env.MONGODB_URI || '';
    
    // 임시 디렉토리 생성
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * 데이터베이스 백업 생성
   * @returns 백업 파일 S3 키
   */
  static async createDatabaseBackup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `mongodb-backup-${timestamp}.gz`;
      const localBackupPath = path.join(this.tempDir, backupFileName);
      const s3Key = this.backupPrefix + backupFileName;

      logWithContext('info', 'Database backup started', { timestamp });

      // MongoDB 백업 생성
      const dbName = this.getDbNameFromUri(this.mongoUri);
      const dumpCommand = `mongodump --uri="${this.mongoUri}" --archive="${localBackupPath}" --gzip`;
      
      await execAsync(dumpCommand);
      logWithContext('info', 'MongoDB dump completed', { localBackupPath });

      // S3에 백업 파일 업로드
      const fileBuffer = fs.readFileSync(localBackupPath);
      const uploadCommand = new PutObjectCommand({
        Bucket: this.backupBucket,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: 'application/gzip',
        Metadata: {
          'backup-type': 'mongodb',
          'database': dbName,
          'created-at': new Date().toISOString(),
          'file-size': fileBuffer.length.toString()
        },
        ServerSideEncryption: 'AES256'
      });

      await this.s3Client.send(uploadCommand);
      logWithContext('info', 'Backup uploaded to S3', { s3Key, bucket: this.backupBucket });

      // 로컬 임시 파일 삭제
      fs.unlinkSync(localBackupPath);

      // 감사 로그 생성
      await createAuditLog({
        userId: 'system',
        action: 'DATABASE_BACKUP_CREATED',
        resourceType: 'database',
        resourceId: dbName,
        details: {
          backupFile: s3Key,
          timestamp,
          fileSize: fileBuffer.length
        },
        ipAddress: 'system',
        userAgent: 'BackupService',
        status: 'success'
      });

      return s3Key;
    } catch (error: any) {
      logWithContext('error', 'Database backup failed', { error: error.message });
      throw new Error(`Database backup failed: ${error.message}`);
    }
  }

  /**
   * 데이터베이스 복구
   * @param backupKey S3 백업 파일 키
   */
  static async restoreDatabase(backupKey: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const restoreFileName = `restore-${timestamp}.gz`;
      const localRestorePath = path.join(this.tempDir, restoreFileName);

      logWithContext('info', 'Database restore started', { backupKey });

      // S3에서 백업 파일 다운로드
      const downloadCommand = new GetObjectCommand({
        Bucket: this.backupBucket,
        Key: backupKey
      });

      const response = await this.s3Client.send(downloadCommand);
      if (!response.Body) {
        throw new Error('Backup file is empty or corrupted');
      }

      // 파일 스트림을 버퍼로 변환
      const chunks: Buffer[] = [];
      const stream = response.Body as any;
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);
      
      fs.writeFileSync(localRestorePath, fileBuffer);
      logWithContext('info', 'Backup file downloaded', { localRestorePath });

      // 기존 데이터베이스 백업 (복구 전 안전장치)
      const preRestoreBackup = await this.createDatabaseBackup();
      logWithContext('info', 'Pre-restore backup created', { backup: preRestoreBackup });

      // 데이터베이스 복구
      const restoreCommand = `mongorestore --uri="${this.mongoUri}" --archive="${localRestorePath}" --gzip --drop`;
      await execAsync(restoreCommand);
      
      logWithContext('info', 'Database restore completed', { backupKey });

      // 로컬 임시 파일 삭제
      fs.unlinkSync(localRestorePath);

      // 감사 로그 생성
      await createAuditLog({
        userId: 'system',
        action: 'DATABASE_RESTORED',
        resourceType: 'database',
        resourceId: this.getDbNameFromUri(this.mongoUri),
        details: {
          restoredFrom: backupKey,
          preRestoreBackup,
          timestamp
        },
        ipAddress: 'system',
        userAgent: 'BackupService',
        status: 'success'
      });

    } catch (error: any) {
      logWithContext('error', 'Database restore failed', { error: error.message, backupKey });
      throw new Error(`Database restore failed: ${error.message}`);
    }
  }

  /**
   * 백업 목록 조회
   * @returns 백업 파일 목록
   */
  static async listBackups(): Promise<Array<{
    key: string;
    lastModified: Date;
    size: number;
    metadata?: Record<string, string>;
  }>> {
    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: this.backupBucket,
        Prefix: this.backupPrefix,
        MaxKeys: 100
      });

      const response = await this.s3Client.send(listCommand);
      
      if (!response.Contents) {
        return [];
      }

      return response.Contents
        .filter(obj => obj.Key && obj.LastModified && obj.Size)
        .map(obj => ({
          key: obj.Key!,
          lastModified: obj.LastModified!,
          size: obj.Size!
        }))
        .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    } catch (error: any) {
      logWithContext('error', 'Failed to list backups', { error: error.message });
      throw new Error(`Failed to list backups: ${error.message}`);
    }
  }

  /**
   * 오래된 백업 정리
   * @param retentionDays 보관 기간 (일)
   */
  static async cleanupOldBackups(retentionDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const backups = await this.listBackups();
      const oldBackups = backups.filter(backup => backup.lastModified < cutoffDate);

      let deletedCount = 0;
      for (const backup of oldBackups) {
        try {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: this.backupBucket,
            Key: backup.key
          });

          await this.s3Client.send(deleteCommand);
          deletedCount++;
          
          logWithContext('info', 'Old backup deleted', { 
            key: backup.key, 
            lastModified: backup.lastModified 
          });
        } catch (deleteError: any) {
          logWithContext('error', 'Failed to delete backup', { 
            key: backup.key, 
            error: deleteError.message 
          });
        }
      }

      // 감사 로그 생성
      await createAuditLog({
        userId: 'system',
        action: 'BACKUP_CLEANUP',
        resourceType: 'backup',
        resourceId: 'cleanup-job',
        details: {
          retentionDays,
          totalBackups: backups.length,
          deletedCount,
          cutoffDate: cutoffDate.toISOString()
        },
        ipAddress: 'system',
        userAgent: 'BackupService',
        status: 'success'
      });

      return deletedCount;
    } catch (error: any) {
      logWithContext('error', 'Backup cleanup failed', { error: error.message });
      throw new Error(`Backup cleanup failed: ${error.message}`);
    }
  }

  /**
   * MongoDB URI에서 데이터베이스 이름 추출
   */
  private static getDbNameFromUri(uri: string): string {
    try {
      const url = new URL(uri);
      return url.pathname.substring(1) || 'test';
    } catch {
      return 'unknown';
    }
  }

  /**
   * 백업 파일 유효성 검증
   */
  static async validateBackup(backupKey: string): Promise<boolean> {
    try {
      const downloadCommand = new GetObjectCommand({
        Bucket: this.backupBucket,
        Key: backupKey
      });

      const response = await this.s3Client.send(downloadCommand);
      
      // 파일 존재 및 크기 확인
      if (!response.Body || !response.ContentLength || response.ContentLength === 0) {
        return false;
      }

      // 압축 파일 헤더 확인 (gzip magic number)
      const stream = response.Body as any;
      const chunk = await stream.read();
      
      if (!chunk || chunk.length < 2) {
        return false;
      }

      // gzip 파일의 magic number 확인 (0x1f, 0x8b)
      return chunk[0] === 0x1f && chunk[1] === 0x8b;

    } catch (error: any) {
      logWithContext('error', 'Backup validation failed', { 
        backupKey, 
        error: error.message 
      });
      return false;
    }
  }
}

// 호환성을 위한 기본 내보내기
export { BackupServiceV3 as BackupService };