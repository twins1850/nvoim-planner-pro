import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../server';
import { File } from '../../models/File';
import { fileCleanupService } from '../../services/fileCleanupService';
import * as dbSetup from '../utils/setupTestDB';
import fs from 'fs';
import path from 'path';
import { createTestUser } from '../utils/testDataGenerator';

describe('File Optimization Integration Tests', () => {
  let mongoServer: any;
  let plannerToken: string;
  let testFilePath: string;
  let uploadedFileId: string;

  beforeAll(async () => {
    // Setup in-memory database
    const result = await dbSetup.connect();
    mongoServer = result.mongoServer;
    
    // Create test audio file
    const testDir = path.join(__dirname, '../fixtures');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    testFilePath = path.join(testDir, 'test-audio.mp3');
    // Create a simple MP3 file for testing (1MB of random data)
    const buffer = Buffer.alloc(1024 * 1024);
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
    fs.writeFileSync(testFilePath, buffer);
  });

  afterAll(async () => {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    
    // Close database connection
    await dbSetup.closeDatabase(mongoServer);
  });

  beforeEach(async () => {
    // Clear database collections before each test
    await dbSetup.clearDatabase();
    
    // Create test user and get token
    const plannerData = await createTestUser({ role: 'planner' });
    
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: plannerData.email,
        password: plannerData.password
      });
    
    plannerToken = loginResponse.body.data.token;
  });

  describe('File Upload and Optimization', () => {
    it('should upload and optimize an audio file', async () => {
      // Step 1: Upload a test audio file
      const uploadResponse = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${plannerToken}`)
        .attach('file', testFilePath)
        .field('type', 'audio')
        .field('purpose', 'test');
      
      expect(uploadResponse.status).toBe(200);
      expect(uploadResponse.body).toHaveProperty('data.fileId');
      
      uploadedFileId = uploadResponse.body.data.fileId;
      
      // Step 2: Optimize the uploaded file
      const optimizeResponse = await request(app)
        .post(`/api/files/${uploadedFileId}/optimize`)
        .set('Authorization', `Bearer ${plannerToken}`);
      
      expect(optimizeResponse.status).toBe(200);
      expect(optimizeResponse.body).toHaveProperty('data.success', true);
      expect(optimizeResponse.body.data).toHaveProperty('originalSize');
      expect(optimizeResponse.body.data).toHaveProperty('optimizedSize');
      expect(optimizeResponse.body.data).toHaveProperty('compressionRatio');
      
      // Verify the file was updated in the database
      const file = await File.findById(uploadedFileId);
      expect(file).toBeDefined();
      expect(file?.optimized).toBe(true);
    });
  });

  describe('File Lifecycle Management', () => {
    it('should manage file lifecycle through different storage tiers', async () => {
      // Step 1: Upload a test file
      const uploadResponse = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${plannerToken}`)
        .attach('file', testFilePath)
        .field('type', 'audio')
        .field('purpose', 'test');
      
      uploadedFileId = uploadResponse.body.data.fileId;
      
      // Step 2: Mark file as processed
      await File.findByIdAndUpdate(uploadedFileId, { status: 'processed' });
      
      // Step 3: Move file to infrequent access tier
      const moveToIAResponse = await request(app)
        .post(`/api/files/${uploadedFileId}/storage-tier`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({ storageClass: 'STANDARD_IA' });
      
      expect(moveToIAResponse.status).toBe(200);
      
      // Step 4: Verify storage class was updated
      let file = await File.findById(uploadedFileId);
      expect(file?.storageClass).toBe('STANDARD_IA');
      
      // Step 5: Archive file to Glacier
      const archiveResponse = await request(app)
        .post(`/api/files/${uploadedFileId}/archive`)
        .set('Authorization', `Bearer ${plannerToken}`);
      
      expect(archiveResponse.status).toBe(200);
      
      // Step 6: Verify file was archived
      file = await File.findById(uploadedFileId);
      expect(file?.storageClass).toBe('GLACIER');
    });
  });

  describe('Batch File Operations', () => {
    it('should perform batch operations on multiple files', async () => {
      // Step 1: Upload multiple test files
      const fileIds = [];
      
      for (let i = 0; i < 3; i++) {
        const uploadResponse = await request(app)
          .post('/api/files/upload')
          .set('Authorization', `Bearer ${plannerToken}`)
          .attach('file', testFilePath)
          .field('type', 'audio')
          .field('purpose', `test-${i}`);
        
        fileIds.push(uploadResponse.body.data.fileId);
      }
      
      // Step 2: Perform batch optimization
      const batchOptimizeResponse = await request(app)
        .post('/api/files/batch/optimize')
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({ fileIds });
      
      expect(batchOptimizeResponse.status).toBe(200);
      expect(batchOptimizeResponse.body.data.results).toHaveLength(fileIds.length);
      
      // Step 3: Verify all files were optimized
      for (const fileId of fileIds) {
        const file = await File.findById(fileId);
        expect(file?.optimized).toBe(true);
      }
    });
  });

  describe('Storage Usage Analytics', () => {
    it('should provide storage usage analytics', async () => {
      // Step 1: Upload multiple files of different types
      await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${plannerToken}`)
        .attach('file', testFilePath)
        .field('type', 'audio')
        .field('purpose', 'test-audio');
      
      await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${plannerToken}`)
        .attach('file', testFilePath)
        .field('type', 'video')
        .field('purpose', 'test-video');
      
      // Step 2: Get storage analytics
      const analyticsResponse = await request(app)
        .get('/api/files/storage-analytics')
        .set('Authorization', `Bearer ${plannerToken}`);
      
      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.body.data).toHaveProperty('totalSize');
      expect(analyticsResponse.body.data).toHaveProperty('fileCountByType');
      expect(analyticsResponse.body.data).toHaveProperty('sizeByType');
      expect(analyticsResponse.body.data).toHaveProperty('storageClassDistribution');
      
      // Verify analytics data
      expect(analyticsResponse.body.data.fileCountByType.audio).toBe(1);
      expect(analyticsResponse.body.data.fileCountByType.video).toBe(1);
    });
  });
});