const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 기본 미들웨어
app.use(cors());
app.use(express.json());

// 테스트 라우트
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '영어 회화 관리 시스템 백엔드 서버가 정상적으로 실행 중입니다.',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// API 테스트 라우트
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API 테스트가 성공적으로 완료되었습니다.',
    data: {
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform
    }
  });
});

// 404 핸들러
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '요청한 엔드포인트를 찾을 수 없습니다.',
    path: req.originalUrl,
    method: req.method
  });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: '서버 내부 오류가 발생했습니다.',
    error: err.message
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`✅ 테스트 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`🌐 서버 URL: http://localhost:${PORT}`);
  console.log(`📊 헬스체크: http://localhost:${PORT}/health`);
  console.log(`🧪 API 테스트: http://localhost:${PORT}/api/test`);
});