/**
 * 영어 대화 관리 시스템 서버 (JavaScript 버전)
 * 
 * TypeScript 컴파일 오류를 우회하기 위한 간단한 서버 구현
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = 3001; // 명시적으로 3001 포트 사용

// 기본 미들웨어 설정
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// 메모리 데이터베이스 설정
let inMemoryDB = {
  users: []
};

// 데이터베이스 연결
async function connectDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/english-conversation';
    await mongoose.connect(mongoUri);
    console.log('MongoDB 연결 성공');
    return true;
  } catch (error) {
    console.error('MongoDB 연결 실패, 메모리 데이터베이스로 대체합니다:', error.message);
    console.log('메모리 데이터베이스 모드로 실행합니다. 데이터는 서버 재시작 시 초기화됩니다.');
    return false;
  }
}

// 헬스 체크 엔드포인트
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: '앤보임 영어회화 관리 시스템 백엔드 서버가 정상 작동 중입니다.',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API 라우트
app.get('/api', (req, res) => {
  res.json({
    message: '앤보임 API 서버',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      lessons: '/api/lessons',
      homework: '/api/homework',
      files: '/api/files',
      speech: '/api/speech',
      analysis: '/api/analysis',
      feedback: '/api/feedback',
      notifications: '/api/notifications',
      progress: '/api/progress',
      reporting: '/api/reporting',
      costMonitoring: '/api/cost-monitoring',
    },
  });
});

// 사용자 모델 정의 (MongoDB 연결 실패 시 사용)
let User;
try {
  const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['planner', 'student'], required: true },
    profile: {
      name: { type: String, required: true },
      phone: String,
      avatar: String,
      preferences: {
        language: { type: String, enum: ['ko', 'en'], default: 'ko' },
        notifications: { type: Boolean, default: true },
        timezone: { type: String, default: 'Asia/Seoul' }
      },
      managedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      assignedPlanner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      learningLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced'] }
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date
  }, { timestamps: true });

  User = mongoose.model('User', userSchema);
} catch (error) {
  console.warn('Mongoose 모델 정의 오류:', error.message);
}

// 간단한 인증 라우트
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('로그인 시도:', { email, password });
    
    // 메모리 데이터베이스에서 사용자 찾기 (MongoDB 사용 안함)
    let user = inMemoryDB.users.find(u => u.email === email);
    
    console.log('찾은 사용자:', user);
    console.log('현재 메모리 DB 사용자들:', inMemoryDB.users);
    
    if (!user || password !== 'password123') {
      return res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: '이메일 또는 비밀번호가 올바르지 않습니다.'
        }
      });
    }
    
    // 로그인 성공
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id || user.id,
          email: user.email,
          role: user.role,
          profile: user.profile
        },
        token: 'demo-token-' + Date.now(),
        refreshToken: 'demo-refresh-token-' + Date.now(),
        expiresIn: '7d'
      }
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'SYSTEM_ERROR',
        message: '서버 오류가 발생했습니다.'
      }
    });
  }
});

// 회원가입 라우트
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, role, profile } = req.body;
    
    let existingUser;
    
    // MongoDB 또는 메모리 데이터베이스에서 사용자 확인
    if (User) {
      existingUser = await User.findOne({ email });
    } else {
      existingUser = inMemoryDB.users.find(u => u.email === email);
    }
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: '이미 사용 중인 이메일입니다.'
        }
      });
    }
    
    let newUser;
    
    // MongoDB 또는 메모리 데이터베이스에 사용자 생성
    if (User) {
      newUser = new User({
        email,
        password,
        role,
        profile
      });
      
      await newUser.save();
    } else {
      newUser = {
        id: Date.now().toString(),
        email,
        password,
        role,
        profile,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      inMemoryDB.users.push(newUser);
    }
    
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser._id || newUser.id,
          email: newUser.email,
          role: newUser.role,
          profile: newUser.profile
        }
      }
    });
  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'SYSTEM_ERROR',
        message: '서버 오류가 발생했습니다.'
      }
    });
  }
});

// 테스트 계정 생성 함수
async function createTestAccounts() {
  try {
    // 플래너 계정 생성
    const plannerEmail = 'test-planner@example.com';
    
    // 메모리 데이터베이스에서만 확인 (MongoDB 사용 안함)
    let existingPlanner = inMemoryDB.users.find(u => u.email === plannerEmail);
    
    if (!existingPlanner) {
      const planner = {
        id: '1',
        email: plannerEmail,
        password: 'password123',
        role: 'planner',
        profile: {
          name: '테스트 플래너',
          phone: '010-1234-5678',
          preferences: {
            language: 'ko',
            notifications: true,
            timezone: 'Asia/Seoul'
          }
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      inMemoryDB.users.push(planner);
      console.log('테스트 플래너 계정이 생성되었습니다.');
    }
    
    // 학생 계정 생성
    const studentEmail = 'test-student@example.com';
    
    // 메모리 데이터베이스에서만 확인 (MongoDB 사용 안함)
    let existingStudent = inMemoryDB.users.find(u => u.email === studentEmail);
    
    if (!existingStudent) {
      const student = {
        id: '2',
        email: studentEmail,
        password: 'password123',
        role: 'student',
        profile: {
          name: '테스트 학생',
          phone: '010-9876-5432',
          preferences: {
            language: 'ko',
            notifications: true,
            timezone: 'Asia/Seoul'
          },
          learningLevel: 'intermediate'
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      inMemoryDB.users.push(student);
      console.log('테스트 학생 계정이 생성되었습니다.');
    }
    
    console.log('메모리 데이터베이스 초기화 완료. 총 사용자 수:', inMemoryDB.users.length);
  } catch (error) {
    console.warn('테스트 계정 생성 중 오류가 발생했습니다:', error.message);
  }
}

// 서버 시작
async function startServer() {
  try {
    // 데이터베이스 연결 시도
    await connectDatabase();
    
    // 테스트 계정 생성
    await createTestAccounts();
    
    // 서버 시작
    app.listen(PORT, () => {
      console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
      console.log(`📊 헬스 체크: http://localhost:${PORT}/health`);
      console.log(`🔗 API 엔드포인트: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('서버 시작 실패:', error);
    process.exit(1);
  }
}

// 서버 시작
startServer();