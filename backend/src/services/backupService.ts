import { S3 } from 'aws-sdk';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { logWithContext } from '../utils/logger';
import { createAuditLog } from '../middleware/auditLogger';

const execAsync = promisify(exec);

/**
 * 백업 및 복구 서비스
 */
export class BackupService {
  private static s3: S3;
  private static backupBucket: string;
  private static backupPrefix: string;
  private static tempDir: string;
  private static mongoUri: string;

  /**
   * 백업 서비스 초기화
   */
  static initialize(): void {
    this.s3 = new S3({
      region: process.env.AWS_REGION || 'ap-northeast-2',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
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
   * @returns 백업 파일 경로
   */
  static async createDatabaseBackup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `mongodb-backup-${timestamp}.gz`;
      const backupFilePath = path.join(this.tempDir, backupFileName);
      
      logWithContext('info', 'Starting database backup', { backupFileName });
      
      // MongoDB 백업 명령 실행 (mongodump)
      await execAsync(`mongodump --uri="${this.mongoUri}" --gzip --archive="${backupFilePath}"`);
      
      logWithContext('info', 'Database backup completed', { backupFilePath });
      
      // 감사 로그 기록
      await createAuditLog({
        action: 'backup:create',
        resourceType: 'database',
        details: { backupFileName },
        ipAddress: 'system',
        status: 'success'
      });
      
      return backupFilePath;
    } catch (error) {
      logWithContext('error', 'Database backup failed', { error });
      
      // 감사 로그 기록
      await createAuditLog({
        action: 'backup:create',
        resourceType: 'database',
        details: { error: (error as Error).message },
        ipAddress: 'system',
        status: 'failure'
      });
      
      throw error;
    }
  }

  /**
   * S3에 백업 파일 업로드
   * @param backupFilePath 백업 파일 경로
   * @returns S3 객체 키
   */
  static async uploadBackupToS3(backupFilePath: string): Promise<string> {
    try {
      const fileName = path.basename(backupFilePath);
      const key = `${this.backupPrefix}${fileName}`;
      
      logWithContext('info', 'Uploading backup to S3', { bucket: this.backupBucket, key });
      
      // 파일 읽기
      const fileContent = fs.readFileSync(backupFilePath);
      
      // S3에 업로드
      await this.s3.putObject({
        Bucket: this.backupBucket,
        Key: key,
        Body: fileContent,
        ServerSideEncryption: 'AES256',
        Metadata: {
          'backup-date': new Date().toISOString(),
          'backup-type': 'mongodb'
        }
      }).promise();
      
      logWithContext('info', 'Backup uploaded to S3', { bucket: this.backupBucket, key });
      
      // 로컬 파일 삭제
      fs.unlinkSync(backupFilePath);
      
      return key;
    } catch (error) {
      logWithContext('error', 'Failed to upload backup to S3', { error, backupFilePath });
      throw error;
    }
  }

  /**
   * S3에서 백업 파일 다운로드
   * @param key S3 객체 키
   * @returns 로컬 파일 경로
   */
  static async downloadBackupFromS3(key: string): Promise<string> {
    try {
      const fileName = path.basename(key);
      const filePath = path.join(this.tempDir, fileName);
      
      logWithContext('info', 'Downloading backup from S3', { bucket: this.backupBucket, key });
      
      // S3에서 파일 가져오기
      const response = await this.s3.getObject({
        Bucket: this.backupBucket,
        Key: key
      }).promise();
      
      // 파일 저장
      fs.writeFileSync(filePath, response.Body as Buffer);
      
      logWithContext('info', 'Backup downloaded from S3', { filePath });
      
      return filePath;
    } catch (error) {
      logWithContext('error', 'Failed to download backup from S3', { error, key });
      throw error;
    }
  }

  /**
   * 데이터베이스 복원
   * @param backupFilePath 백업 파일 경로
   */
  static async restoreDatabase(backupFilePath: string): Promise<void> {
    try {
      logWithContext('info', 'Starting database restore', { backupFilePath });
      
      // MongoDB 복원 명령 실행 (mongorestore)
      await execAsync(`mongorestore --uri="${this.mongoUri}" --gzip --archive="${backupFilePath}"`);
      
      logWithContext('info', 'Database restore completed');
      
      // 감사 로그 기록
      await createAuditLog({
        action: 'backup:restore',
        resourceType: 'database',
        details: { backupFilePath },
        ipAddress: 'system',
        status: 'success'
      });
      
      // 로컬 파일 삭제
      fs.unlinkSync(backupFilePath);
    } catch (error) {
      logWithContext('error', 'Database restore failed', { error, backupFilePath });
      
      // 감사 로그 기록
      await createAuditLog({
        action: 'backup:restore',
        resourceType: 'database',
        details: { error: (error as Error).message, backupFilePath },
        ipAddress: 'system',
        status: 'failure'
      });
      
      throw error;
    }
  }

  /**
   * 사용 가능한 백업 목록 조회
   * @returns 백업 목록
   */
  static async listBackups(): Promise<Array<{ key: string; date: Date; size: number }>> {
    try {
      logWithContext('info', 'Listing available backups', { bucket: this.backupBucket, prefix: this.backupPrefix });
      
      // S3에서 백업 목록 가져오기
      const response = await this.s3.listObjectsV2({
        Bucket: this.backupBucket,
        Prefix: this.backupPrefix
      }).promise();
      
      // 백업 정보 매핑
      const backups = (response.Contents || []).map(item => ({
        key: item.Key || '',
        date: item.LastModified || new Date(),
        size: item.Size || 0
      }));
      
      return backups;
    } catch (error) {
      logWithContext('error', 'Failed to list backups', { error });
      throw error;
    }
  }

  /**
   * 백업 자동화 스케줄링
   * @param cronSchedule Cron 표현식 (예: '0 0 * * *' - 매일 자정)
   */
  static scheduleAutomaticBackups(cronSchedule: string): void {
    const cron = require('node-cron');
    
    if (!cron.validate(cronSchedule)) {
      throw new Error('Invalid cron schedule expression');
    }
    
    logWithContext('info', 'Scheduling automatic backups', { cronSchedule });
    
    cron.schedule(cronSchedule, async () => {
      try {
        logWithContext('info', 'Starting scheduled backup');
        
        // 백업 생성
        const backupFilePath = await this.createDatabaseBackup();
        
        // S3에 업로드
        await this.uploadBackupToS3(backupFilePath);
        
        // 오래된 백업 정리
        await this.cleanupOldBackups();
        
        logWithContext('info', 'Scheduled backup completed');
      } catch (error) {
        logWithContext('error', 'Scheduled backup failed', { error });
      }
    });
  }

  /**
   * 오래된 백업 정리
   * @param retentionDays 보관 기간 (일)
   */
  static async cleanupOldBackups(retentionDays: number = 30): Promise<void> {
    try {
      logWithContext('info', 'Cleaning up old backups', { retentionDays });
      
      // 백업 목록 가져오기
      const backups = await this.listBackups();
      
      // 보관 기간 계산
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      // 오래된 백업 필터링
      const oldBackups = backups.filter(backup => backup.date < cutoffDate);
      
      // 오래된 백업 삭제
      for (const backup of oldBackups) {
        logWithContext('info', 'Deleting old backup', { key: backup.key, date: backup.date });
        
        await this.s3.deleteObject({
          Bucket: this.backupBucket,
          Key: backup.key
        }).promise();
      }
      
      logWithContext('info', 'Cleanup completed', { deletedCount: oldBackups.length });
    } catch (error) {
      logWithContext('error', 'Failed to cleanup old backups', { error });
      throw error;
    }
  }
}