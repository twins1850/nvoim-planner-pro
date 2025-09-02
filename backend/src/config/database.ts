import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer: MongoMemoryServer | null = null;

export async function connectDatabase(): Promise<void> {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/english-conversation';
    
    try {
      // 먼저 실제 MongoDB에 연결 시도
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      });
      
      console.log('MongoDB 연결 성공');
    } catch (error) {
      console.error('MongoDB 연결 실패, 메모리 데이터베이스로 대체합니다:', error);
      
      // 메모리 데이터베이스 시작
      mongoMemoryServer = await MongoMemoryServer.create();
      const memoryServerUri = mongoMemoryServer.getUri();
      
      await mongoose.connect(memoryServerUri, {
        dbName: 'english-conversation-memory',
      });
      
      console.log('메모리 데이터베이스 모드로 실행합니다. 데이터는 서버 재시작 시 초기화됩니다.');
      
      // 테스트 계정 생성
      await createTestAccounts();
    }

    // 연결 이벤트 리스너
    mongoose.connection.on('error', (error) => {
      console.error('MongoDB 연결 오류:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB 연결이 끊어졌습니다.');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB 재연결 성공');
    });

  } catch (error) {
    console.error('데이터베이스 연결 실패:', error);
    throw error;
  }
}

// 테스트 계정 생성 함수
async function createTestAccounts() {
  try {
    // User 모델 동적 임포트
    const { User } = await import('../models/User');
    
    // 플래너(선생님) 계정 생성
    const plannerExists = await User.findOne({ email: 'planner@example.com' });
    if (!plannerExists) {
      await User.create({
        name: '테스트 선생님',
        email: 'planner@example.com',
        password: 'password123',
        role: 'planner',
        isActive: true
      });
      console.log('테스트 선생님 계정 생성 완료');
    }
    
    // 학생 계정 생성
    const studentExists = await User.findOne({ email: 'student@example.com' });
    if (!studentExists) {
      await User.create({
        name: '테스트 학생',
        email: 'student@example.com',
        password: 'password123',
        role: 'student',
        isActive: true
      });
      console.log('테스트 학생 계정 생성 완료');
    }
  } catch (error) {
    console.error('테스트 계정 생성 중 오류가 발생했습니다:', error);
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('MongoDB 연결 종료');
  } catch (error) {
    console.error('MongoDB 연결 종료 실패:', error);
    throw error;
  }
}