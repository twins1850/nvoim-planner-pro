import { FileServiceV3 } from '../../services/fileService-v3';
import { File } from '../../models/File';
import { AppError } from '../../middleware/errorHandler';
import * as setupTestDB from '../utils/setupTestDB';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('FileServiceV3', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    const dbConnection = await setupTestDB.connect();
    mongoServer = dbConnection.mongoServer;
  });

  afterAll(async () => {
    await setupTestDB.closeDatabase(mongoServer);
  });

  afterEach(async () => {
    await setupTestDB.clearDatabase();
  });

  describe('saveFileInfo', () => {
    it('should save file information to database', async () => {
      const mockFile = {
        originalname: 'test-video.mp4',
        filename: 'test-123.mp4',
        mimetype: 'video/mp4',
        size: 1024000,
        path: '/tmp/test-123.mp4'
      } as Express.Multer.File;

      const userId = '507f1f77bcf86cd799439011';
      const result = await FileServiceV3.saveFileInfo(mockFile, userId, 'video');

      expect(result).toBeDefined();
      expect(result.originalName).toBe('test-video.mp4');
      expect(result.filename).toBe('test-123.mp4');
      expect(result.type).toBe('video');
      expect(result.uploadedBy).toBe(userId);
    });

    it('should extract metadata from filename', async () => {
      const mockFile = {
        originalname: 'John_Doe_2024-01-15_lesson.mp4',
        filename: 'test-123.mp4',
        mimetype: 'video/mp4',
        size: 1024000,
        path: '/tmp/test-123.mp4'
      } as Express.Multer.File;

      const userId = '507f1f77bcf86cd799439011';
      const result = await FileServiceV3.saveFileInfo(mockFile, userId, 'video');

      expect(result.metadata.extractedFromFilename).toBe(true);
      expect(result.metadata.format).toBe('mp4');
    });
  });

  describe('uploadFileToS3', () => {
    it('should upload file to S3 and update database', async () => {
      // Create a test file record
      const fileInfo = new File({
        originalName: 'test-video.mp4',
        filename: 'test-123.mp4',
        mimeType: 'video/mp4',
        size: 1024000,
        path: '/tmp/test-123.mp4',
        type: 'video',
        status: 'uploaded',
        uploadedBy: '507f1f77bcf86cd799439011',
        metadata: {}
      });
      await fileInfo.save();

      // Mock fs.readFileSync
      const fs = require('fs');
      jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('test file content'));
      jest.spyOn(fs, 'unlinkSync').mockImplementation();

      const result = await FileServiceV3.uploadFileToS3(fileInfo._id!.toString());

      expect(result.s3Key).toBe('original-videos/507f1f77bcf86cd799439011/test-123.mp4');
      expect(result.s3Url).toBe('https://test-bucket.s3.amazonaws.com/test-file.mp3');

      // Restore mocks
      jest.restoreAllMocks();
    });

    it('should throw error if file not found', async () => {
      const nonExistentId = '507f1f77bcf86cd799439012';

      await expect(FileServiceV3.uploadFileToS3(nonExistentId))
        .rejects
        .toThrow(AppError);
    });
  });

  describe('deleteFile', () => {
    it('should delete file from S3 and database', async () => {
      // Create a test file record
      const fileInfo = new File({
        originalName: 'test-video.mp4',
        filename: 'test-123.mp4',
        mimeType: 'video/mp4',
        size: 1024000,
        path: '/tmp/test-123.mp4',
        type: 'video',
        status: 'uploaded',
        uploadedBy: '507f1f77bcf86cd799439011',
        s3Key: 'original-videos/507f1f77bcf86cd799439011/test-123.mp4',
        s3Url: 'https://test-bucket.s3.amazonaws.com/test-file.mp3',
        metadata: {}
      });
      await fileInfo.save();

      // Mock fs operations
      const fs = require('fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      await FileServiceV3.deleteFile(fileInfo._id!.toString());

      // Verify file is deleted from database
      const deletedFile = await File.findById(fileInfo._id);
      expect(deletedFile).toBeNull();

      // Restore mocks
      jest.restoreAllMocks();
    });
  });

  describe('getUserFiles', () => {
    beforeEach(async () => {
      // Create test files
      const testFiles = [
        {
          originalName: 'video1.mp4',
          filename: 'vid1.mp4',
          mimeType: 'video/mp4',
          size: 1024000,
          path: '/tmp/vid1.mp4',
          type: 'video',
          status: 'uploaded',
          uploadedBy: '507f1f77bcf86cd799439011',
          metadata: {}
        },
        {
          originalName: 'audio1.mp3',
          filename: 'aud1.mp3',
          mimeType: 'audio/mp3',
          size: 512000,
          path: '/tmp/aud1.mp3',
          type: 'audio',
          status: 'processed',
          uploadedBy: '507f1f77bcf86cd799439011',
          metadata: {}
        },
        {
          originalName: 'video2.mp4',
          filename: 'vid2.mp4',
          mimeType: 'video/mp4',
          size: 2048000,
          path: '/tmp/vid2.mp4',
          type: 'video',
          status: 'uploaded',
          uploadedBy: '507f1f77bcf86cd799439012',
          metadata: {}
        }
      ];

      await File.insertMany(testFiles);
    });

    it('should return user files with pagination', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const result = await FileServiceV3.getUserFiles(userId, {
        page: 1,
        limit: 10
      });

      expect(result.files).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.pages).toBe(1);
    });

    it('should filter files by type', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const result = await FileServiceV3.getUserFiles(userId, {
        type: 'video'
      });

      expect(result.files).toHaveLength(1);
      expect(result.files[0].type).toBe('video');
    });

    it('should filter files by status', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const result = await FileServiceV3.getUserFiles(userId, {
        status: 'processed'
      });

      expect(result.files).toHaveLength(1);
      expect(result.files[0].status).toBe('processed');
    });
  });

  describe('uploadFile', () => {
    it('should upload file and return FileReference', async () => {
      const mockFile = {
        originalname: 'homework.pdf',
        mimetype: 'application/pdf',
        size: 512000,
        path: '/tmp/upload123.pdf'
      } as Express.Multer.File;

      // Mock fs operations
      const fs = require('fs');
      jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('test pdf content'));
      jest.spyOn(fs, 'unlinkSync').mockImplementation();

      const result = await FileServiceV3.uploadFile(mockFile, {
        folder: 'homework-submissions',
        allowedTypes: ['application/pdf'],
        maxSize: 1024000
      });

      expect(result.originalName).toBe('homework.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.size).toBe(512000);
      expect(result.s3Key).toMatch(/^homework-submissions\/\d+-\w+\.pdf$/);
      expect(result.s3Url).toBe('https://test-bucket.s3.amazonaws.com/test-file.mp3');

      // Restore mocks
      jest.restoreAllMocks();
    });

    it('should reject unsupported file types', async () => {
      const mockFile = {
        originalname: 'malicious.exe',
        mimetype: 'application/x-executable',
        size: 512000,
        path: '/tmp/upload123.exe'
      } as Express.Multer.File;

      await expect(FileServiceV3.uploadFile(mockFile, {
        allowedTypes: ['application/pdf']
      })).rejects.toThrow(AppError);
    });

    it('should reject files that are too large', async () => {
      const mockFile = {
        originalname: 'large-file.pdf',
        mimetype: 'application/pdf',
        size: 10240000, // 10MB
        path: '/tmp/upload123.pdf'
      } as Express.Multer.File;

      await expect(FileServiceV3.uploadFile(mockFile, {
        maxSize: 5120000 // 5MB limit
      })).rejects.toThrow(AppError);
    });
  });

  describe('downloadFileFromS3', () => {
    it('should download file from S3', async () => {
      const s3Key = 'original-videos/user123/test-video.mp4';
      const outputPath = '/tmp/downloaded-video.mp4';

      // Mock fs operations
      const fs = require('fs');
      const writeFileAsync = jest.fn().mockResolvedValue(undefined);
      jest.spyOn(require('util'), 'promisify').mockReturnValue(writeFileAsync);

      await FileServiceV3.downloadFileFromS3(s3Key, outputPath);

      expect(writeFileAsync).toHaveBeenCalledWith(outputPath, expect.any(Buffer));

      // Restore mocks
      jest.restoreAllMocks();
    });
  });

  describe('generatePresignedDownloadUrl', () => {
    it('should generate presigned URL for download', async () => {
      const s3Key = 'original-videos/user123/test-video.mp4';

      const result = await FileServiceV3.generatePresignedDownloadUrl(s3Key, 1800);

      expect(result).toBe('https://test-bucket.s3.amazonaws.com/test-file.mp3?signed=true');
    });
  });

  describe('deleteMultipleFiles', () => {
    beforeEach(async () => {
      // Create test files
      const testFiles = [
        {
          originalName: 'file1.mp4',
          filename: 'f1.mp4',
          mimeType: 'video/mp4',
          size: 1024000,
          path: '/tmp/f1.mp4',
          type: 'video',
          status: 'uploaded',
          uploadedBy: '507f1f77bcf86cd799439011',
          s3Key: 'videos/f1.mp4',
          metadata: {}
        },
        {
          originalName: 'file2.mp4',
          filename: 'f2.mp4',
          mimeType: 'video/mp4',
          size: 1024000,
          path: '/tmp/f2.mp4',
          type: 'video',
          status: 'uploaded',
          uploadedBy: '507f1f77bcf86cd799439011',
          s3Key: 'videos/f2.mp4',
          metadata: {}
        }
      ];

      await File.insertMany(testFiles);
    });

    it('should delete multiple files', async () => {
      const files = await File.find({});
      const fileIds = files.map(f => f._id!.toString());

      // Mock fs operations
      const fs = require('fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      const result = await FileServiceV3.deleteMultipleFiles(fileIds);

      expect(result.deleted).toBe(2);
      expect(result.failed).toBe(0);

      // Verify files are deleted
      const remainingFiles = await File.find({});
      expect(remainingFiles).toHaveLength(0);

      // Restore mocks
      jest.restoreAllMocks();
    });
  });
});