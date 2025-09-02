import request from 'supertest';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import app from '../../server';
import { File } from '../../models/File';
import { connectDatabase } from '../../config/database';
import { connectRedis, disconnectRedis } from '../../config/redis';
import { initializeQueues, closeAllQueues } from '../../config/queue';
import { generateToken } from '../../utils/jwt';

const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);

describe('파일 업로드 및 오디오 추출 통합 테스트', () => {
  let authToken: string;
  let testUserId: string;
  let testVideoPath: string;
  let uploadedFileId: string;

  // 테스트 전 설정
  beforeAll(async () => {
    // 데이터베이스 연결
    await connectDatabase();
    
    // Redis 연결
    await connectRedis();
    
    // 작업 큐 초기화
    initializeQueues();
    
    // 테스트 사용자 ID 생성
    testUserId = new mongoose.Types.ObjectId().toString();
    
    // 인증 토큰 생성
    authToken = generateToken(testUserId, 'planner');
    
    // 테스트 비디오 파일 생성
    const testDir = path.join(process.cwd(), 'test-files');
    if (!fs.existsSync(testDir)) {
      await mkdirAsync(testDir, { recursive: true });
    }
    
    testVideoPath = path.join(testDir, '홍길동_20240715.mp4');
    
    // 더미 비디오 파일 생성 (실제 테스트에서는 유효한 MP4 파일 필요)
    const dummyVideoContent = Buffer.alloc(1024 * 1024); // 1MB 더미 파일
    await writeFileAsync(testVideoPath, dummyVideoContent);
  });

  // 테스트 후 정리
  afterAll(async () => {
    // 테스트 파일 삭제
    if (fs.existsSync(testVideoPath)) {
      await unlinkAsync(testVideoPath);
    }
    
    // 업로드된 파일 삭제
    if (uploadedFileId) {
      await File.findByIdAndDelete(uploadedFileId);
    }
    
    // 큐 종료
    await closeAllQueues();
    
    // Redis 연결 종료
    await disconnectRedis();
    
    // 데이터베이스 연결 종료
    await mongoose.connection.close();
  });

  // 파일 업로드 테스트
  test('파일 업로드 API 테스트', async () => {
    const response = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', testVideoPath);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('fileId');
    expect(response.body.data).toHaveProperty('originalName', '홍길동_20240715.mp4');
    expect(response.body.data).toHaveProperty('type', 'video');
    expect(response.body.data).toHaveProperty('status', 'uploaded');
    expect(response.body.data.metadata).toHaveProperty('studentName', '홍길동');
    
    // 업로드된 파일 ID 저장
    uploadedFileId = response.body.data.fileId;
  });

  // 파일 상태 조회 테스트
  test('파일 상태 조회 API 테스트', async () => {
    // 파일 ID가 없으면 테스트 스킵
    if (!uploadedFileId) {
      return;
    }
    
    const response = await request(app)
      .get(`/api/files/${uploadedFileId}/status`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('fileId', uploadedFileId);
    expect(response.body.data).toHaveProperty('originalName', '홍길동_20240715.mp4');
    expect(response.body.data).toHaveProperty('type', 'video');
  });

  // 사용자 파일 목록 조회 테스트
  test('사용자 파일 목록 조회 API 테스트', async () => {
    const response = await request(app)
      .get('/api/files')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    
    // 업로드한 파일이 목록에 있는지 확인
    if (uploadedFileId) {
      const foundFile = response.body.data.find((file: any) => file._id === uploadedFileId);
      expect(foundFile).toBeDefined();
    }
  });
});