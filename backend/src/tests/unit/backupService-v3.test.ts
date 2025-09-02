import { BackupServiceV3 } from '../../services/backupService-v3';
import * as setupTestDB from '../utils/setupTestDB';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock child_process exec
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

// Mock fs operations
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn()
}));

// Mock util promisify
jest.mock('util', () => ({
  promisify: jest.fn().mockImplementation((fn) => {
    if (fn.name === 'exec') {
      return jest.fn().mockResolvedValue({ stdout: 'success', stderr: '' });
    }
    return fn;
  })
}));

// Mock audit logger
jest.mock('../../middleware/auditLogger', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined)
}));

describe('BackupServiceV3', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    const dbConnection = await setupTestDB.connect();
    mongoServer = dbConnection.mongoServer;
    
    // Initialize backup service
    process.env.AWS_BACKUP_BUCKET = 'test-backup-bucket';
    process.env.MONGODB_URI = dbConnection.mongoUri;
    BackupServiceV3.initialize();
  });

  afterAll(async () => {
    await setupTestDB.closeDatabase(mongoServer);
  });

  describe('initialize', () => {
    it('should initialize backup service with correct configuration', () => {
      expect(() => BackupServiceV3.initialize()).not.toThrow();
    });
  });

  describe('createDatabaseBackup', () => {
    it('should create database backup and upload to S3', async () => {
      const fs = require('fs');
      fs.readFileSync.mockReturnValue(Buffer.from('backup content'));

      const result = await BackupServiceV3.createDatabaseBackup();

      expect(result).toMatch(/^backups\/mongodb-backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.gz$/);
      expect(fs.readFileSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should handle backup creation errors', async () => {
      const util = require('util');
      const mockExecAsync = util.promisify.mockImplementation(() => {
        throw new Error('mongodump failed');
      });

      await expect(BackupServiceV3.createDatabaseBackup())
        .rejects
        .toThrow('Database backup failed: mongodump failed');
    });
  });

  describe('restoreDatabase', () => {
    it('should restore database from S3 backup', async () => {
      const backupKey = 'backups/mongodb-backup-2024-01-15T10-00-00-000Z.gz';
      
      // Mock successful restore
      const util = require('util');
      const mockExecAsync = util.promisify;
      mockExecAsync.mockResolvedValue({ stdout: 'restore success', stderr: '' });

      const fs = require('fs');
      fs.writeFileSync.mockImplementation();
      fs.unlinkSync.mockImplementation();

      await expect(BackupServiceV3.restoreDatabase(backupKey))
        .resolves
        .not.toThrow();

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should handle empty backup file', async () => {
      const backupKey = 'backups/empty-backup.gz';

      // Mock AWS SDK v3 response with empty body
      const { s3ClientV3 } = require('../../config/aws-v3');
      s3ClientV3.send.mockResolvedValueOnce({
        Body: null
      });

      await expect(BackupServiceV3.restoreDatabase(backupKey))
        .rejects
        .toThrow('Database restore failed: Backup file is empty or corrupted');
    });

    it('should handle restore command failure', async () => {
      const backupKey = 'backups/mongodb-backup-2024-01-15T10-00-00-000Z.gz';
      
      const util = require('util');
      const mockExecAsync = util.promisify;
      mockExecAsync
        .mockResolvedValueOnce({ stdout: 'backup success', stderr: '' }) // createDatabaseBackup call
        .mockRejectedValueOnce(new Error('mongorestore failed')); // restoreDatabase call

      await expect(BackupServiceV3.restoreDatabase(backupKey))
        .rejects
        .toThrow('Database restore failed: mongorestore failed');
    });
  });

  describe('listBackups', () => {
    it('should list available backups', async () => {
      const mockDate = new Date('2024-01-15T10:00:00.000Z');
      
      // Mock S3 response
      const { s3ClientV3 } = require('../../config/aws-v3');
      s3ClientV3.send.mockResolvedValueOnce({
        Contents: [
          {
            Key: 'backups/mongodb-backup-2024-01-15T10-00-00-000Z.gz',
            LastModified: mockDate,
            Size: 1024000
          },
          {
            Key: 'backups/mongodb-backup-2024-01-14T10-00-00-000Z.gz',
            LastModified: new Date('2024-01-14T10:00:00.000Z'),
            Size: 512000
          }
        ]
      });

      const result = await BackupServiceV3.listBackups();

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('backups/mongodb-backup-2024-01-15T10-00-00-000Z.gz');
      expect(result[0].lastModified).toEqual(mockDate);
      expect(result[0].size).toBe(1024000);
    });

    it('should return empty array when no backups exist', async () => {
      const { s3ClientV3 } = require('../../config/aws-v3');
      s3ClientV3.send.mockResolvedValueOnce({
        Contents: undefined
      });

      const result = await BackupServiceV3.listBackups();

      expect(result).toEqual([]);
    });

    it('should handle S3 list error', async () => {
      const { s3ClientV3 } = require('../../config/aws-v3');
      s3ClientV3.send.mockRejectedValueOnce(new Error('S3 access denied'));

      await expect(BackupServiceV3.listBackups())
        .rejects
        .toThrow('Failed to list backups: S3 access denied');
    });
  });

  describe('cleanupOldBackups', () => {
    beforeEach(() => {
      // Reset date for consistent testing
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-30T10:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should delete old backups beyond retention period', async () => {
      const { s3ClientV3 } = require('../../config/aws-v3');
      
      // Mock list response with old and new backups
      s3ClientV3.send
        .mockResolvedValueOnce({
          Contents: [
            {
              Key: 'backups/mongodb-backup-2024-01-29T10-00-00-000Z.gz',
              LastModified: new Date('2024-01-29T10:00:00.000Z'), // 1 day old (keep)
              Size: 1024000
            },
            {
              Key: 'backups/mongodb-backup-2023-12-29T10-00-00-000Z.gz',
              LastModified: new Date('2023-12-29T10:00:00.000Z'), // 32 days old (delete)
              Size: 512000
            },
            {
              Key: 'backups/mongodb-backup-2023-12-28T10-00-00-000Z.gz',
              LastModified: new Date('2023-12-28T10:00:00.000Z'), // 33 days old (delete)
              Size: 256000
            }
          ]
        })
        .mockResolvedValue({}); // Mock delete responses

      const deletedCount = await BackupServiceV3.cleanupOldBackups(30);

      expect(deletedCount).toBe(2);
      
      // Verify delete commands were called for old backups only
      expect(s3ClientV3.send).toHaveBeenCalledTimes(3); // 1 list + 2 deletes
    });

    it('should handle delete failures gracefully', async () => {
      const { s3ClientV3 } = require('../../config/aws-v3');
      
      // Mock list response
      s3ClientV3.send
        .mockResolvedValueOnce({
          Contents: [
            {
              Key: 'backups/mongodb-backup-2023-12-29T10-00-00-000Z.gz',
              LastModified: new Date('2023-12-29T10:00:00.000Z'),
              Size: 512000
            }
          ]
        })
        .mockRejectedValueOnce(new Error('Delete failed'));

      const deletedCount = await BackupServiceV3.cleanupOldBackups(30);

      expect(deletedCount).toBe(0); // No files successfully deleted
    });

    it('should use default retention period of 30 days', async () => {
      const { s3ClientV3 } = require('../../config/aws-v3');
      s3ClientV3.send.mockResolvedValueOnce({ Contents: [] });

      await BackupServiceV3.cleanupOldBackups();

      // Verify the correct prefix and max keys are used
      const listCall = s3ClientV3.send.mock.calls[0][0];
      expect(listCall.input.Prefix).toBe('backups/');
      expect(listCall.input.MaxKeys).toBe(100);
    });
  });

  describe('validateBackup', () => {
    it('should validate gzip backup file', async () => {
      const { s3ClientV3 } = require('../../config/aws-v3');
      
      // Mock valid gzip file (magic number 0x1f, 0x8b)
      const mockStream = {
        read: jest.fn().mockResolvedValue(Buffer.from([0x1f, 0x8b, 0x08, 0x00]))
      };

      s3ClientV3.send.mockResolvedValueOnce({
        Body: mockStream,
        ContentLength: 1024
      });

      const result = await BackupServiceV3.validateBackup('backups/test-backup.gz');

      expect(result).toBe(true);
    });

    it('should reject invalid file format', async () => {
      const { s3ClientV3 } = require('../../config/aws-v3');
      
      // Mock invalid file (not gzip)
      const mockStream = {
        read: jest.fn().mockResolvedValue(Buffer.from([0x50, 0x4b, 0x03, 0x04])) // ZIP format
      };

      s3ClientV3.send.mockResolvedValueOnce({
        Body: mockStream,
        ContentLength: 1024
      });

      const result = await BackupServiceV3.validateBackup('backups/test-backup.gz');

      expect(result).toBe(false);
    });

    it('should reject empty files', async () => {
      const { s3ClientV3 } = require('../../config/aws-v3');
      
      s3ClientV3.send.mockResolvedValueOnce({
        Body: null,
        ContentLength: 0
      });

      const result = await BackupServiceV3.validateBackup('backups/empty-backup.gz');

      expect(result).toBe(false);
    });

    it('should handle S3 errors gracefully', async () => {
      const { s3ClientV3 } = require('../../config/aws-v3');
      s3ClientV3.send.mockRejectedValueOnce(new Error('Access denied'));

      const result = await BackupServiceV3.validateBackup('backups/inaccessible-backup.gz');

      expect(result).toBe(false);
    });
  });
});