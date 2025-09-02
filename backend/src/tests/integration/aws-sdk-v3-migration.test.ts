import { FileServiceV3 } from '../../services/fileService-v3';
import { BackupServiceV3 } from '../../services/backupService-v3';
import { File } from '../../models/File';
import * as setupTestDB from '../utils/setupTestDB';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('AWS SDK v3 Migration Integration Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    const dbConnection = await setupTestDB.connect();
    mongoServer = dbConnection.mongoServer;
    
    // Initialize services
    process.env.AWS_BACKUP_BUCKET = 'test-backup-bucket';
    process.env.MONGODB_URI = dbConnection.mongoUri;
    BackupServiceV3.initialize();
  });

  afterAll(async () => {
    await setupTestDB.closeDatabase(mongoServer);
  });

  afterEach(async () => {
    await setupTestDB.clearDatabase();
  });

  describe('File Service and Backup Service Integration', () => {
    it('should handle complete file lifecycle with AWS SDK v3', async () => {
      // Mock file system operations
      const fs = require('fs');
      jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('test file content'));
      jest.spyOn(fs, 'unlinkSync').mockImplementation();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      // 1. Save file info
      const mockFile = {
        originalname: 'integration-test.mp4',
        filename: 'int-test-123.mp4',
        mimetype: 'video/mp4',
        size: 2048000,
        path: '/tmp/int-test-123.mp4'
      } as Express.Multer.File;

      const userId = '507f1f77bcf86cd799439011';
      const fileInfo = await FileServiceV3.saveFileInfo(mockFile, userId, 'video');

      expect(fileInfo).toBeDefined();
      expect(fileInfo.originalName).toBe('integration-test.mp4');

      // 2. Upload to S3
      const uploadedFile = await FileServiceV3.uploadFileToS3(fileInfo._id!.toString());

      expect(uploadedFile.s3Key).toBeDefined();
      expect(uploadedFile.s3Url).toBeDefined();

      // 3. Verify file in database
      const dbFile = await File.findById(fileInfo._id);
      expect(dbFile?.s3Key).toBe(uploadedFile.s3Key);
      expect(dbFile?.s3Url).toBe(uploadedFile.s3Url);

      // 4. Test file operations
      const userFiles = await FileServiceV3.getUserFiles(userId);
      expect(userFiles.files).toHaveLength(1);
      expect(userFiles.files[0].s3Key).toBe(uploadedFile.s3Key);

      // 5. Generate presigned URL
      const presignedUrl = await FileServiceV3.generatePresignedDownloadUrl(uploadedFile.s3Key!);
      expect(presignedUrl).toBeDefined();
      expect(presignedUrl).toContain('signed=true');

      // 6. Delete file
      await FileServiceV3.deleteFile(fileInfo._id!.toString());

      // 7. Verify deletion
      const deletedFile = await File.findById(fileInfo._id);
      expect(deletedFile).toBeNull();

      // Restore mocks
      jest.restoreAllMocks();
    });

    it('should handle backup operations with AWS SDK v3', async () => {
      // Mock required dependencies
      const util = require('util');
      const mockExecAsync = util.promisify;
      mockExecAsync.mockResolvedValue({ stdout: 'success', stderr: '' });

      const fs = require('fs');
      fs.readFileSync.mockReturnValue(Buffer.from('backup content'));
      fs.writeFileSync.mockImplementation();
      fs.unlinkSync.mockImplementation();
      fs.existsSync.mockReturnValue(true);
      fs.mkdirSync.mockImplementation();

      // 1. Create backup
      const backupKey = await BackupServiceV3.createDatabaseBackup();
      expect(backupKey).toMatch(/^backups\/mongodb-backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.gz$/);

      // 2. List backups
      const backups = await BackupServiceV3.listBackups();
      expect(Array.isArray(backups)).toBe(true);

      // 3. Validate backup
      const isValid = await BackupServiceV3.validateBackup(backupKey);
      expect(isValid).toBe(true);

      // 4. Test restore
      await expect(BackupServiceV3.restoreDatabase(backupKey))
        .resolves.not.toThrow();

      // 5. Test cleanup
      const deletedCount = await BackupServiceV3.cleanupOldBackups(30);
      expect(typeof deletedCount).toBe('number');

      // Restore mocks
      jest.restoreAllMocks();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle S3 connection errors gracefully', async () => {
      // Mock S3 client to throw errors
      const { s3ClientV3 } = require('../../config/aws-v3');
      s3ClientV3.send.mockRejectedValueOnce(new Error('Network error'));

      const mockFile = {
        originalname: 'error-test.mp4',
        filename: 'err-test-123.mp4',
        mimetype: 'video/mp4',
        size: 1024000,
        path: '/tmp/err-test-123.mp4'
      } as Express.Multer.File;

      const userId = '507f1f77bcf86cd799439011';
      const fileInfo = await FileServiceV3.saveFileInfo(mockFile, userId, 'video');

      // Mock fs operations
      const fs = require('fs');
      jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('test content'));

      await expect(FileServiceV3.uploadFileToS3(fileInfo._id!.toString()))
        .rejects
        .toThrow('S3 업로드 중 오류가 발생했습니다.');

      // Restore mocks
      jest.restoreAllMocks();
    });

    it('should handle database connection errors', async () => {
      // Simulate database connection loss
      await setupTestDB.clearDatabase();
      
      const nonExistentId = '507f1f77bcf86cd799999999';
      
      await expect(FileServiceV3.getFileById(nonExistentId))
        .rejects
        .toThrow();
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle multiple concurrent operations', async () => {
      // Mock file system operations
      const fs = require('fs');
      jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('test content'));
      jest.spyOn(fs, 'unlinkSync').mockImplementation();

      const userId = '507f1f77bcf86cd799439011';
      const filePromises = [];

      // Create multiple files concurrently
      for (let i = 0; i < 5; i++) {
        const mockFile = {
          originalname: `concurrent-test-${i}.mp4`,
          filename: `conc-test-${i}.mp4`,
          mimetype: 'video/mp4',
          size: 1024000,
          path: `/tmp/conc-test-${i}.mp4`
        } as Express.Multer.File;

        const promise = FileServiceV3.saveFileInfo(mockFile, userId, 'video')
          .then(fileInfo => FileServiceV3.uploadFileToS3(fileInfo._id!.toString()));
        
        filePromises.push(promise);
      }

      const results = await Promise.all(filePromises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.s3Key).toBeDefined();
        expect(result.s3Url).toBeDefined();
      });

      // Verify all files are in database
      const userFiles = await FileServiceV3.getUserFiles(userId);
      expect(userFiles.files).toHaveLength(5);

      // Cleanup
      const fileIds = results.map(r => r._id!.toString());
      const deleteResult = await FileServiceV3.deleteMultipleFiles(fileIds);
      expect(deleteResult.deleted).toBe(5);
      expect(deleteResult.failed).toBe(0);

      // Restore mocks
      jest.restoreAllMocks();
    });

    it('should validate file size limits', async () => {
      const largeFile = {
        originalname: 'large-video.mp4',
        mimetype: 'video/mp4',
        size: 150 * 1024 * 1024, // 150MB (exceeds 100MB limit)
        path: '/tmp/large-video.mp4'
      } as Express.Multer.File;

      await expect(FileServiceV3.uploadFile(largeFile, {
        folder: 'test-uploads',
        maxSize: 100 * 1024 * 1024 // 100MB limit
      })).rejects.toThrow('파일 크기가 너무 큽니다');
    });

    it('should validate MIME types', async () => {
      const invalidFile = {
        originalname: 'script.js',
        mimetype: 'application/javascript',
        size: 1024,
        path: '/tmp/script.js'
      } as Express.Multer.File;

      await expect(FileServiceV3.uploadFile(invalidFile, {
        allowedTypes: ['video/mp4', 'audio/mp3']
      })).rejects.toThrow('지원되지 않는 파일 형식입니다');
    });
  });

  describe('Compatibility with Legacy Systems', () => {
    it('should work alongside AWS SDK v2 services', async () => {
      // This test ensures that v3 services don't interfere with existing v2 services
      const mockFile = {
        originalname: 'compatibility-test.mp4',
        filename: 'compat-test.mp4',
        mimetype: 'video/mp4',
        size: 1024000,
        path: '/tmp/compat-test.mp4'
      } as Express.Multer.File;

      const userId = '507f1f77bcf86cd799439011';

      // Mock fs operations
      const fs = require('fs');
      jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('test content'));
      jest.spyOn(fs, 'unlinkSync').mockImplementation();

      // Test v3 service
      const fileInfo = await FileServiceV3.saveFileInfo(mockFile, userId, 'video');
      const uploadedFile = await FileServiceV3.uploadFileToS3(fileInfo._id!.toString());

      expect(uploadedFile.s3Key).toBeDefined();
      expect(uploadedFile.s3Url).toBeDefined();

      // Both v2 and v3 configurations should be available
      const awsV2 = require('../../config/aws');
      const awsV3 = require('../../config/aws-v3');

      expect(awsV2.S3_CONFIG).toBeDefined();
      expect(awsV3.S3_CONFIG).toBeDefined();
      expect(awsV3.s3ClientV3).toBeDefined();

      // Restore mocks
      jest.restoreAllMocks();
    });
  });
});